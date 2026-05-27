import {
  MemberStatus,
  MembershipStatus,
  TimelineEventType,
} from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { TimelineService } from '../timeline/timeline.service';
import { MembershipsService } from './memberships.service';

type ScopedArgs = {
  where?: Record<string, unknown>;
} & Record<string, unknown>;

function createTransaction() {
  return {
    membership: {
      create: jest.fn().mockResolvedValue({ id: 'membership-1' }),
      update: jest.fn().mockResolvedValue({ id: 'membership-1' }),
      findFirst: jest.fn(),
    },
    member: {
      update: jest.fn().mockResolvedValue({ id: 'member-1' }),
      findFirst: jest.fn(),
    },
    plan: {
      findFirst: jest.fn().mockResolvedValue(null),
    },
    organization: {
      findUnique: jest.fn().mockResolvedValue({ currency: 'NGN' }),
    },
    timelineEvent: {
      create: jest.fn(),
    },
  };
}

function createService(tx = createTransaction()) {
  const prisma = {
    membership: {
      findFirst: jest.fn(),
    },
    member: {
      findFirst: jest.fn(),
    },
    plan: {
      findFirst: jest.fn().mockResolvedValue(null),
    },
    organization: {
      findUnique: jest.fn().mockResolvedValue({ currency: 'NGN' }),
    },
    $transaction: jest.fn((handler: (transaction: typeof tx) => unknown) =>
      handler(tx),
    ),
  } as unknown as PrismaService;
  const tenantPrisma = {
    assertOrganizationAccess: jest.fn(),
    scoped: jest.fn((args: ScopedArgs) => ({
      ...args,
      where: {
        ...(args.where ?? {}),
        organizationId: 'org-1',
      },
    })),
  };

  const timelineService = {
    logMemberStatusChanged: jest.fn((input: { tx: typeof tx }) => {
      input.tx.timelineEvent.create({
        data: {
          organizationId: 'org-1',
          memberId: 'member-1',
          type: TimelineEventType.MEMBER_STATUS_CHANGED,
          metadata: {
            previousStatus: MemberStatus.OVERDUE,
            status: MemberStatus.ACTIVE,
            source: 'test',
          },
        },
      });

      return Promise.resolve();
    }),
  } as unknown as TimelineService;

  return {
    service: new MembershipsService(
      prisma,
      tenantPrisma as never,
      timelineService,
    ),
    prisma: prisma as unknown as {
      membership: { findFirst: jest.Mock };
      member: { findFirst: jest.Mock };
      plan: { findFirst: jest.Mock };
      organization: { findUnique: jest.Mock };
      $transaction: jest.Mock;
    },
    tenantPrisma,
    timelineService: timelineService as unknown as {
      logMemberStatusChanged: jest.Mock;
    },
    tx,
  };
}

describe('MembershipsService', () => {
  it('logs a member status change in the same transaction when create reactivates a member', async () => {
    const { service, prisma, tenantPrisma, timelineService, tx } =
      createService();

    prisma.member.findFirst.mockResolvedValue({
      id: 'member-1',
      status: MemberStatus.OVERDUE,
    });
    prisma.membership.findFirst.mockResolvedValue({
      id: 'membership-1',
      organizationId: 'org-1',
      memberId: 'member-1',
      status: MembershipStatus.ACTIVE,
      amount: '25000',
      currency: 'NGN',
      member: { id: 'member-1', status: MemberStatus.ACTIVE },
      plan: null,
    });

    await service.create('org-1', 'member-1', {
      startDate: '2026-05-01',
      expiryDate: '2026-05-31',
      amount: '25000',
    });

    expect(tx.member.update).toHaveBeenCalledWith({
      where: { id: 'member-1' },
      data: { status: MemberStatus.ACTIVE },
    });
    expect(timelineService.logMemberStatusChanged).toHaveBeenCalledWith({
      tx,
      organizationId: 'org-1',
      memberId: 'member-1',
      previousStatus: MemberStatus.OVERDUE,
      nextStatus: MemberStatus.ACTIVE,
      source: 'membership_created',
    });
    expect(tenantPrisma.assertOrganizationAccess).toHaveBeenCalledWith('org-1');
  });

  it('logs a member status change in the same transaction when renew reactivates a member', async () => {
    const { service, prisma, tenantPrisma, timelineService, tx } =
      createService();

    prisma.membership.findFirst.mockResolvedValue({
      id: 'membership-1',
      organizationId: 'org-1',
      memberId: 'member-1',
      status: MembershipStatus.EXPIRED,
      amount: '25000',
      currency: 'NGN',
      member: { id: 'member-1', status: MemberStatus.AT_RISK },
      plan: null,
    });

    await service.renew('org-1', 'membership-1', {
      expiryDate: '2026-06-30',
      amount: '30000',
    });

    expect(tx.member.update).toHaveBeenCalledWith({
      where: { id: 'member-1' },
      data: { status: MemberStatus.ACTIVE },
    });
    expect(timelineService.logMemberStatusChanged).toHaveBeenCalledWith({
      tx,
      organizationId: 'org-1',
      memberId: 'member-1',
      previousStatus: MemberStatus.AT_RISK,
      nextStatus: MemberStatus.ACTIVE,
      source: 'membership_renewed',
    });
    expect(tenantPrisma.assertOrganizationAccess).toHaveBeenCalledWith('org-1');
  });
});
