import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { OrganizationMembershipStatus, OrganizationRole } from '@prisma/client';
import { compare } from 'bcryptjs';
import { PrismaService } from '../database/prisma.service';
import { AuthService } from './auth.service';

jest.mock('bcryptjs', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

const compareMock = compare as jest.Mock;

function createService() {
  const prisma = {
    user: {
      findUnique: jest.fn(),
    },
    refreshToken: {
      create: jest.fn().mockResolvedValue({ id: 'refresh-1' }),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  } as unknown as PrismaService;

  const jwtService = {
    signAsync: jest.fn().mockResolvedValue('signed-access-token'),
  } as unknown as JwtService;

  return {
    service: new AuthService(prisma, jwtService),
    prisma: prisma as unknown as {
      user: { findUnique: jest.Mock };
      refreshToken: {
        create: jest.Mock;
        findUnique: jest.Mock;
        update: jest.Mock;
        updateMany: jest.Mock;
      };
    },
    jwtService: jwtService as unknown as {
      signAsync: jest.Mock;
    },
  };
}

describe('AuthService', () => {
  beforeEach(() => {
    compareMock.mockReset();
  });

  it('loads only active organization memberships in created order during login', async () => {
    const { service, prisma } = createService();
    compareMock.mockResolvedValue(true);
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'owner@example.com',
      fullName: 'Owner One',
      passwordHash: 'hashed-password',
      organizationMemberships: [
        {
          id: 'membership-1',
          organizationId: 'org-1',
          role: OrganizationRole.OWNER,
          status: OrganizationMembershipStatus.ACTIVE,
          organization: {
            id: 'org-1',
            name: 'Alpha Gym',
            slug: 'alpha-gym',
            timezone: 'Africa/Lagos',
            dateFormat: 'DD/MM/YYYY',
            timeFormat: '24h',
            currency: 'NGN',
          },
        },
      ],
    });

    await expect(
      service.login({
        email: 'owner@example.com',
        password: 'password123',
      }),
    ).resolves.toMatchObject({
      user: {
        id: 'user-1',
        role: OrganizationRole.OWNER,
      },
      organization: {
        id: 'org-1',
        name: 'Alpha Gym',
      },
      onboardingRequired: false,
    });

    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: 'owner@example.com' },
      include: {
        organizationMemberships: {
          where: { status: OrganizationMembershipStatus.ACTIVE },
          include: { organization: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  });

  it('creates a session without organization context when the user has no active memberships', async () => {
    const { service, prisma } = createService();
    compareMock.mockResolvedValue(true);
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'owner@example.com',
      fullName: 'Owner One',
      passwordHash: 'hashed-password',
      organizationMemberships: [],
    });

    await expect(
      service.login({
        email: 'owner@example.com',
        password: 'password123',
      }),
    ).resolves.toMatchObject({
      organization: null,
      onboardingRequired: true,
      user: {
        role: null,
      },
    });
  });

  it('rejects login when the password comparison fails', async () => {
    const { service, prisma } = createService();
    compareMock.mockResolvedValue(false);
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'owner@example.com',
      fullName: 'Owner One',
      passwordHash: 'hashed-password',
      organizationMemberships: [],
    });

    await expect(
      service.login({
        email: 'owner@example.com',
        password: 'bad-password',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
