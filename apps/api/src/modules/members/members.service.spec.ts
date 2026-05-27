/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  MemberStatus,
  MembershipStatus,
  TaskType,
  TimelineEventType,
} from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { MembershipStateService } from '../memberships/membership-state.service';
import { TasksService } from '../tasks/tasks.service';
import { TimelineService } from '../timeline/timeline.service';
import { MembersService } from './members.service';

type ScopedArgs = {
  where?: Record<string, unknown>;
} & Record<string, unknown>;

function createTransaction() {
  return {
    organization: {
      findUnique: jest.fn().mockResolvedValue({ currency: 'NGN' }),
    },
    member: {
      create: jest.fn().mockResolvedValue({ id: 'member-1' }),
      findMany: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockResolvedValue({ id: 'member-1' }),
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
      update: jest.fn().mockResolvedValue({ id: 'membership-1' }),
    },
    timelineEvent: {
      createMany: jest.fn(),
      create: jest.fn(),
    },
    task: {
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({
        id: 'task-1',
        type: TaskType.RESOLVE_OVERDUE_STATUS,
      }),
    },
  };
}

function createService(tx = createTransaction()) {
  const prisma = {
    member: {
      findFirst: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
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
  const membershipStateService = {
    calculateMembershipStatus: jest.fn(
      (membership: { status: MembershipStatus }) => membership.status,
    ),
    calculateMemberStatus: jest.fn(() => MemberStatus.ACTIVE),
  } as unknown as jest.Mocked<MembershipStateService>;
  const tasksService = {
    ensureOpenTask: jest.fn().mockResolvedValue({ id: 'task-1' }),
  } as unknown as jest.Mocked<TasksService>;
  const timelineService = {
    logMemberStatusChanged: jest.fn().mockResolvedValue({ id: 'event-1' }),
  } as unknown as jest.Mocked<TimelineService>;

  return {
    service: new MembersService(
      prisma,
      tenantPrisma as never,
      membershipStateService,
      tasksService,
      timelineService,
    ),
    prisma: prisma as unknown as {
      member: { findFirst: jest.Mock; findMany: jest.Mock };
      $transaction: jest.Mock;
    },
    tenantPrisma,
    membershipStateService,
    tasksService,
    timelineService,
    tx,
  };
}

describe('MembersService import', () => {
  it('creates imported members with revenue-bearing memberships and timeline events', async () => {
    const { service, tenantPrisma, tx } = createService();

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
    expect(tenantPrisma.assertOrganizationAccess).toHaveBeenCalledWith('org-1');
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

  it('refreshes imported member risk immediately after confirm import', async () => {
    const tx = createTransaction();
    tx.member.findMany.mockResolvedValue([
      {
        id: 'member-1',
        organizationId: 'org-1',
        status: MemberStatus.ACTIVE,
        memberships: [
          {
            id: 'membership-1',
            expiryDate: new Date('2026-05-18T00:00:00.000Z'),
            status: MembershipStatus.ACTIVE,
          },
        ],
        payments: [],
      },
    ]);
    const {
      service,
      membershipStateService,
      tasksService,
      timelineService,
      tx: transaction,
    } = createService(tx);
    membershipStateService.calculateMembershipStatus.mockReturnValue(
      MembershipStatus.EXPIRED,
    );
    membershipStateService.calculateMemberStatus.mockReturnValue(
      MemberStatus.OVERDUE,
    );

    await expect(
      service.confirmImport('org-1', {
        rows: [
          {
            firstName: 'Ada',
            phoneNumber: '+2348012345678',
            planName: 'Monthly',
            membershipAmount: '25000',
            expiryDate: '2026-05-18',
          },
        ],
      }),
    ).resolves.toEqual({
      createdCount: 1,
      updatedCount: 0,
      skippedCount: 0,
      errors: [],
    });

    expect(transaction.membership.update).toHaveBeenCalledWith({
      where: { id: 'membership-1' },
      data: { status: MembershipStatus.EXPIRED },
    });
    expect(transaction.member.update).toHaveBeenCalledWith({
      where: { id: 'member-1' },
      data: { status: MemberStatus.OVERDUE },
    });
    expect(timelineService.logMemberStatusChanged.mock.calls[0]).toEqual([
      {
        tx: transaction,
        organizationId: 'org-1',
        memberId: 'member-1',
        previousStatus: MemberStatus.ACTIVE,
        nextStatus: MemberStatus.OVERDUE,
        source: 'member-import-refresh',
      },
    ]);
    expect(tasksService.ensureOpenTask.mock.calls[0]).toEqual([
      {
        tx: transaction,
        organizationId: 'org-1',
        memberId: 'member-1',
        type: TaskType.RESOLVE_OVERDUE_STATUS,
        dueDate: expect.any(Date),
        source: 'member-import-refresh',
        metadata: {
          status: MemberStatus.OVERDUE,
        },
      },
    ]);
  });
});
