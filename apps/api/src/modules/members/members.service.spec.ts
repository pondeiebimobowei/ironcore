/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { MembershipStatus, TimelineEventType } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { MembersService } from './members.service';

function createTransaction() {
  return {
    organization: {
      findUnique: jest.fn().mockResolvedValue({ currency: 'NGN' }),
    },
    member: {
      create: jest.fn().mockResolvedValue({ id: 'member-1' }),
    },
    plan: {
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({
        id: 'plan-1',
        amount: '25000',
        currency: 'NGN',
      }),
    },
    membership: {
      create: jest.fn().mockResolvedValue({ id: 'membership-1' }),
    },
    timelineEvent: {
      createMany: jest.fn(),
    },
  };
}

function createService(tx = createTransaction()) {
  const prisma = {
    member: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    $transaction: jest.fn((handler: (transaction: typeof tx) => unknown) =>
      handler(tx),
    ),
  } as unknown as PrismaService;

  return {
    service: new MembersService(prisma),
    prisma: prisma as unknown as {
      member: { findMany: jest.Mock };
      $transaction: jest.Mock;
    },
    tx,
  };
}

describe('MembersService import', () => {
  it('creates imported members with revenue-bearing memberships and timeline events', async () => {
    const { service, tx } = createService();

    await expect(
      service.import('org-1', {
        rows: [
          {
            firstName: 'Ada',
            lastName: 'Lovelace',
            phoneNumber: '+2348012345678',
            email: 'ada@example.com',
            planName: 'Monthly',
            membershipAmount: '25000',
            startDate: '2026-05-01',
            expiryDate: '2026-06-01',
          },
        ],
      }),
    ).resolves.toEqual({ createdCount: 1, errors: [] });

    expect(tx.plan.create).toHaveBeenCalledWith({
      data: {
        organizationId: 'org-1',
        name: 'Monthly',
        amount: '25000',
        currency: 'NGN',
      },
    });
    expect(tx.membership.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: 'org-1',
        memberId: 'member-1',
        planId: 'plan-1',
        startDate: new Date('2026-05-01'),
        expiryDate: new Date('2026-06-01'),
        status: MembershipStatus.ACTIVE,
        amount: '25000',
        currency: 'NGN',
      }),
    });
    expect(tx.timelineEvent.createMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({
          memberId: 'member-1',
          type: TimelineEventType.MEMBER_CREATED,
          metadata: { source: 'csv_import' },
        }),
        expect.objectContaining({
          memberId: 'member-1',
          type: TimelineEventType.MEMBERSHIP_CREATED,
          metadata: {
            membershipId: 'membership-1',
            source: 'csv_import',
          },
        }),
      ]),
    });
  });

  it('uses an existing imported plan when one already exists', async () => {
    const tx = createTransaction();
    tx.plan.findFirst.mockResolvedValue({
      id: 'plan-existing',
      amount: '30000',
      currency: 'NGN',
    });
    const { service } = createService(tx);

    await service.import('org-1', {
      rows: [
        {
          firstName: 'Grace',
          phoneNumber: '+2348099999999',
          planName: 'Premium',
          expiryDate: '2026-06-01',
        },
      ],
    });

    expect(tx.plan.create).not.toHaveBeenCalled();
    expect(tx.membership.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        planId: 'plan-existing',
        amount: '30000',
      }),
    });
  });
});
