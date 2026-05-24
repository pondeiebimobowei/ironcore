import {
  MemberStatus,
  PaymentStatus,
  TaskStatus,
  TaskType,
} from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { DashboardService } from './dashboard.service';

type TaskCountQuery = {
  where: {
    type?: {
      in?: TaskType[];
    };
  };
};

function createService() {
  const prisma = {
    member: {
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      groupBy: jest.fn().mockResolvedValue([]),
    },
    payment: {
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
    },
    membership: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    workflow: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    timelineEvent: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    task: {
      count: jest.fn().mockResolvedValue(0),
      findMany: jest.fn().mockResolvedValue([]),
    },
  } as unknown as PrismaService;

  return {
    service: new DashboardService(prisma),
    prisma: prisma as unknown as {
      payment: { count: jest.Mock; findMany: jest.Mock };
      membership: { findMany: jest.Mock };
      task: { count: jest.Mock; findMany: jest.Mock };
    },
  };
}

describe('DashboardService', () => {
  it('returns zero navigation badge counts when there is no actionable work', async () => {
    const { service } = createService();

    await expect(service.summary('org-1')).resolves.toMatchObject({
      navigationBadges: {
        recovery: 0,
        payments: 0,
        tasks: 0,
        alerts: 0,
      },
    });
  });

  it('counts pending payment verification separately from recovery work', async () => {
    const { service, prisma } = createService();
    prisma.task.count.mockImplementation((query: TaskCountQuery) => {
      if (query.where.type?.in) {
        return Promise.resolve(3);
      }

      return Promise.resolve(5);
    });
    prisma.payment.count.mockResolvedValue(2);

    await expect(service.summary('org-1')).resolves.toMatchObject({
      navigationBadges: {
        recovery: 3,
        payments: 2,
        tasks: 5,
        alerts: 5,
      },
    });
    expect(prisma.payment.count).toHaveBeenCalledWith({
      where: {
        organizationId: 'org-1',
        status: PaymentStatus.PENDING_VERIFICATION,
      },
    });
    expect(prisma.task.count).toHaveBeenCalledWith({
      where: {
        organizationId: 'org-1',
        type: {
          in: [
            TaskType.FOLLOW_UP_MEMBER,
            TaskType.RESOLVE_OVERDUE_STATUS,
            TaskType.REVIEW_AT_RISK_MEMBER,
            TaskType.REACTIVATION,
          ],
        },
        status: { in: [TaskStatus.OPEN, TaskStatus.IN_PROGRESS] },
      },
    });
  });

  it('does not include payment verification tasks in the recovery badge', async () => {
    const { service, prisma } = createService();
    prisma.task.findMany.mockResolvedValue([
      {
        id: 'task-1',
        memberId: 'member-1',
        type: TaskType.VERIFY_PAYMENT,
        member: {
          firstName: 'Ada',
          lastName: 'Lovelace',
          phoneNumber: '+2348012345678',
          status: MemberStatus.PENDING_VERIFICATION,
          memberships: [],
        },
      },
    ]);
    prisma.task.count.mockImplementation((query: TaskCountQuery) => {
      if (query.where.type?.in) {
        return Promise.resolve(0);
      }

      return Promise.resolve(1);
    });
    prisma.payment.count.mockResolvedValue(1);

    await expect(service.summary('org-1')).resolves.toMatchObject({
      recoveryQueue: {
        counts: {
          paymentVerification: 1,
        },
      },
      navigationBadges: {
        recovery: 0,
        payments: 1,
        tasks: 1,
        alerts: 1,
      },
    });
  });

  it('builds dashboard recovery values from verified payments inside the visible date range', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-05-24T12:00:00.000Z'));
    const { service, prisma } = createService();
    prisma.payment.findMany.mockResolvedValue([
      {
        amountExpected: { toString: () => '12000' },
        amountPaid: { toString: () => '10000' },
        verifiedAt: new Date('2026-05-20T10:00:00.000Z'),
      },
    ]);
    prisma.membership.findMany.mockResolvedValue([
      {
        amount: { toString: () => '15000' },
        expiryDate: new Date('2026-05-19T00:00:00.000Z'),
      },
      {
        amount: { toString: () => '8000' },
        expiryDate: new Date('2026-05-24T00:00:00.000Z'),
      },
    ]);

    await expect(service.summary('org-1')).resolves.toMatchObject({
      recoveredRevenue: 10000,
      revenueTrend: [
        { label: 'May 18', atRisk: 0, recovered: 0 },
        { label: 'May 19', atRisk: 15000, recovered: 0 },
        { label: 'May 20', atRisk: 15000, recovered: 10000 },
        { label: 'May 21', atRisk: 15000, recovered: 0 },
        { label: 'May 22', atRisk: 15000, recovered: 0 },
        { label: 'May 23', atRisk: 15000, recovered: 0 },
        { label: 'May 24', atRisk: 23000, recovered: 0 },
      ],
    });
    expect(prisma.payment.findMany).toHaveBeenCalledWith({
      where: {
        organizationId: 'org-1',
        status: PaymentStatus.VERIFIED,
        verifiedAt: {
          gte: new Date('2026-05-18T00:00:00.000+01:00'),
          lte: new Date('2026-05-24T23:59:59.999+01:00'),
        },
      },
      select: {
        amountExpected: true,
        amountPaid: true,
        verifiedAt: true,
      },
    });

    jest.useRealTimers();
  });
});
