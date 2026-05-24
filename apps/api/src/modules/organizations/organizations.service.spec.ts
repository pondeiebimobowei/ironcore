/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  OrganizationMembershipStatus,
  OrganizationRole,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { OrganizationsService } from './organizations.service';

const createPrisma = () => {
  const tx = {
    organization: {
      create: jest.fn(),
    },
    organizationMembership: {
      create: jest.fn(),
    },
  };

  const prisma = {
    $transaction: jest.fn((handler: (transaction: typeof tx) => unknown) =>
      handler(tx),
    ),
    organization: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    organizationMembership: {
      findFirst: jest.fn(),
    },
  } as unknown as PrismaService;

  return {
    prisma: prisma as unknown as {
      $transaction: jest.Mock;
      organization: {
        findUnique: jest.Mock;
        update: jest.Mock;
      };
      organizationMembership: {
        findFirst: jest.Mock;
      };
    },
    tx,
  };
};

describe('OrganizationsService', () => {
  it('creates a first organization and owner membership with profile fields', async () => {
    const { prisma, tx } = createPrisma();
    const service = new OrganizationsService(
      prisma as unknown as PrismaService,
    );
    const createdOrganization = {
      id: 'org-1',
      name: 'Peak Performance Gym',
      slug: 'peak-performance-gym',
    };

    prisma.organizationMembership.findFirst.mockResolvedValue(null);
    prisma.organization.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        ...createdOrganization,
        businessType: 'Commercial Gym',
        organizationSize: '6-20',
        contactEmail: 'hello@example.com',
        businessHours: [{ day: 'Monday', open: '08:00', close: '18:00' }],
      });
    tx.organization.create.mockResolvedValue(createdOrganization);

    await expect(
      service.setup('user-1', {
        name: 'Peak Performance Gym',
        businessType: 'Commercial Gym',
        organizationSize: '6-20',
        contactEmail: 'hello@example.com',
        businessHours: [{ day: 'Monday', open: '08:00', close: '18:00' }],
      }),
    ).resolves.toMatchObject({
      id: 'org-1',
      businessType: 'Commercial Gym',
      organizationSize: '6-20',
      contactEmail: 'hello@example.com',
    });

    expect(tx.organization.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: 'Peak Performance Gym',
        slug: 'peak-performance-gym',
        businessType: 'Commercial Gym',
        organizationSize: '6-20',
        contactEmail: 'hello@example.com',
        businessHours: [
          { day: 'Monday', open: '08:00', close: '18:00' },
        ] as Prisma.InputJsonValue,
      }),
    });
    expect(tx.organizationMembership.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: 'org-1',
        userId: 'user-1',
        role: OrganizationRole.OWNER,
        status: OrganizationMembershipStatus.ACTIVE,
        acceptedAt: expect.any(Date),
      }),
    });
  });

  it('rejects organization setup when the user already has an active membership', async () => {
    const { prisma } = createPrisma();
    const service = new OrganizationsService(
      prisma as unknown as PrismaService,
    );
    prisma.organizationMembership.findFirst.mockResolvedValue({
      id: 'membership-1',
    });

    await expect(
      service.setup('user-1', { name: 'Second Gym' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('updates persisted organization profile fields', async () => {
    const { prisma } = createPrisma();
    const service = new OrganizationsService(
      prisma as unknown as PrismaService,
    );
    prisma.organization.findUnique
      .mockResolvedValueOnce({
        id: 'org-1',
        name: 'Peak Performance Gym',
        slug: 'peak-performance-gym',
      })
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 'org-1',
        name: 'Peak Performance Club',
        slug: 'peak-performance-club',
        tagline: 'Recover overdue revenue',
        logoUrl: 'https://example.com/logo.png',
        imageUrls: ['https://example.com/photo.png'],
        closedOnPublicHolidays: true,
      });
    prisma.organization.update.mockResolvedValue({ id: 'org-1' });

    await expect(
      service.updateCurrent('org-1', {
        name: 'Peak Performance Club',
        tagline: 'Recover overdue revenue',
        logoUrl: 'https://example.com/logo.png',
        imageUrls: ['https://example.com/photo.png'],
        closedOnPublicHolidays: true,
      }),
    ).resolves.toMatchObject({
      name: 'Peak Performance Club',
      tagline: 'Recover overdue revenue',
      logoUrl: 'https://example.com/logo.png',
      imageUrls: ['https://example.com/photo.png'],
    });

    expect(prisma.organization.update).toHaveBeenCalledWith({
      where: { id: 'org-1' },
      data: expect.objectContaining({
        name: 'Peak Performance Club',
        slug: 'peak-performance-club',
        tagline: 'Recover overdue revenue',
        logoUrl: 'https://example.com/logo.png',
        imageUrls: ['https://example.com/photo.png'],
        closedOnPublicHolidays: true,
      }),
    });
  });

  it('throws when the current organization is missing', async () => {
    const { prisma } = createPrisma();
    const service = new OrganizationsService(
      prisma as unknown as PrismaService,
    );
    prisma.organization.findUnique.mockResolvedValue(null);

    await expect(service.getCurrent('missing-org')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
