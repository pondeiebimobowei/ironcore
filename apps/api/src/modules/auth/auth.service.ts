import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Prisma, UserRole } from '@prisma/client';
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
    const organizationName = dto.organizationName.trim();
    const passwordHash = await hash(dto.password, this.bcryptRounds);

    try {
      const { user, organization } = await this.prisma.$transaction(
        async (tx) => {
          const createdOrganization = await tx.organization.create({
            data: {
              name: organizationName,
              slug: await this.createAvailableSlug(tx, organizationName),
            },
          });

          const createdUser = await tx.user.create({
            data: {
              organizationId: createdOrganization.id,
              email,
              passwordHash,
              role: UserRole.OWNER,
            },
          });

          return {
            user: createdUser,
            organization: createdOrganization,
          };
        },
      );

      return this.createSession(user, organization);
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
      include: { organization: true },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const passwordMatches = await compare(dto.password, user.passwordHash);

    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return this.createSession(user, user.organization);
  }

  private async createSession(
    user: {
      id: string;
      email: string;
      role: UserRole;
      organizationId: string;
    },
    organization: {
      id: string;
      name: string;
      slug: string;
    },
  ): Promise<AuthSession> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId,
    };
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
        email: user.email,
        role: user.role,
      },
      organization: {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
      },
    };
  }

  private async createAvailableSlug(
    tx: Prisma.TransactionClient,
    name: string,
  ) {
    const baseSlug = this.slugify(name);

    for (let attempt = 0; attempt < 25; attempt += 1) {
      const slug = attempt === 0 ? baseSlug : `${baseSlug}-${attempt + 1}`;
      const existing = await tx.organization.findUnique({
        where: { slug },
        select: { id: true },
      });

      if (!existing) {
        return slug;
      }
    }

    return `${baseSlug}-${randomBytes(4).toString('hex')}`;
  }

  private slugify(value: string) {
    const slug = value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    return slug || 'organization';
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
