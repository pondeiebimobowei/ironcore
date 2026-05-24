import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  OrganizationMembershipStatus,
  OrganizationRole,
  Prisma,
} from '@prisma/client';
import { compare, hash } from 'bcryptjs';
import { createHash, randomBytes } from 'crypto';
import type { StringValue } from 'ms';
import { PrismaService } from '../database/prisma.service';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';
import { AuthResponse } from './types/auth-response.type';
import { JwtPayload } from './types/jwt-payload.type';

type AuthSession = AuthResponse & {
  refreshToken: string;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async signup(dto: SignupDto): Promise<AuthSession> {
    const email = dto.email.trim().toLowerCase();
    const fullName = dto.fullName.trim();
    const passwordHash = await hash(dto.password, this.bcryptRounds);

    try {
      const user = await this.prisma.user.create({
        data: {
          fullName,
          email,
          passwordHash,
        },
      });

      return this.createSession(user, null, null);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'An account with this email already exists',
        );
      }

      throw error;
    }
  }

  async login(dto: LoginDto): Promise<AuthSession> {
    const email = dto.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        organizationMemberships: {
          where: { status: OrganizationMembershipStatus.ACTIVE },
          include: { organization: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const passwordMatches = await compare(dto.password, user.passwordHash);

    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const membership = this.getDefaultMembership(user.organizationMemberships);

    return this.createSession(
      user,
      membership,
      membership?.organization ?? null,
    );
  }

  async refresh(refreshToken: string | undefined): Promise<AuthSession> {
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token is required');
    }

    const tokenHash = this.hashRefreshToken(refreshToken);
    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: {
        user: {
          include: {
            organizationMemberships: {
              where: { status: OrganizationMembershipStatus.ACTIVE },
              include: { organization: true },
              orderBy: { createdAt: 'asc' },
            },
          },
        },
      },
    });

    if (
      !storedToken ||
      storedToken.revokedAt ||
      storedToken.expiresAt.getTime() <= Date.now()
    ) {
      throw new UnauthorizedException('Refresh token is invalid or expired');
    }

    await this.prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revokedAt: new Date() },
    });

    const membership = this.getDefaultMembership(
      storedToken.user.organizationMemberships,
    );

    return this.createSession(
      storedToken.user,
      membership,
      membership?.organization ?? null,
    );
  }

  async createSessionForUser(userId: string): Promise<AuthSession> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        organizationMemberships: {
          where: { status: OrganizationMembershipStatus.ACTIVE },
          include: { organization: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const membership = this.getDefaultMembership(user.organizationMemberships);

    return this.createSession(
      user,
      membership,
      membership?.organization ?? null,
    );
  }

  async logout(refreshToken: string | undefined): Promise<void> {
    if (!refreshToken) {
      return;
    }

    await this.prisma.refreshToken.updateMany({
      where: {
        tokenHash: this.hashRefreshToken(refreshToken),
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });
  }

  private async createSession(
    user: {
      id: string;
      fullName: string;
      email: string;
    },
    membership: {
      id: string;
      organizationId: string;
      role: OrganizationRole;
    } | null,
    organization: {
      id: string;
      name: string;
      slug: string;
    } | null,
  ): Promise<AuthSession> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
    };

    if (membership) {
      payload.role = membership.role;
      payload.organizationId = membership.organizationId;
      payload.organizationMembershipId = membership.id;
    }
    const refreshToken = this.createOpaqueToken();
    const tokenHash = this.hashRefreshToken(refreshToken);

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + this.refreshTokenMaxAgeMs),
      },
    });

    return {
      accessToken: await this.jwtService.signAsync(payload, {
        secret: this.accessTokenSecret,
        expiresIn: this.accessTokenExpiry,
      }),
      refreshToken,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: membership?.role ?? null,
      },
      organization: organization
        ? {
            id: organization.id,
            name: organization.name,
            slug: organization.slug,
          }
        : null,
      onboardingRequired: !organization,
    };
  }

  private getDefaultMembership<
    T extends {
      id: string;
      organizationId: string;
      role: OrganizationRole;
      organization: {
        id: string;
        name: string;
        slug: string;
      };
    },
  >(memberships: T[]) {
    return memberships[0] ?? null;
  }

  private createOpaqueToken() {
    return randomBytes(48).toString('base64url');
  }

  private hashRefreshToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private get bcryptRounds() {
    return Number(process.env.BCRYPT_ROUNDS ?? 12);
  }

  private get accessTokenSecret() {
    return process.env.JWT_ACCESS_SECRET ?? 'change-me-access-secret';
  }

  private get accessTokenExpiry(): StringValue {
    return (process.env.JWT_ACCESS_EXPIRY ?? '15m') as StringValue;
  }

  private get refreshTokenMaxAgeMs() {
    return 7 * 24 * 60 * 60 * 1000;
  }
}
