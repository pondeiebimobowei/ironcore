import { Injectable } from '@nestjs/common';
import {
  MemberStatus,
  PaymentStatus,
  Prisma,
  TaskType,
  TaskStatus,
  TimelineEventType,
  WorkflowStatus,
  WorkflowType,
} from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { TenantPrismaService } from '../database/tenant-prisma.service';

type DashboardSummary = {
  revenueAtRisk: number;
  overdueRevenue: number;
  recoveredRevenue: number;
  expiringMembersCount: number;
  overdueMembersCount: number;
  reactivatedMembersCount: number;
  openTasksCount: number;
  recoveryConversionRate: number;
  totalMembersCount: number;
  dateRange: {
    label: string;
    startDate: string;
    endDate: string;
  };
  revenueTrend: Array<{
    label: string;
    atRisk: number;
    recovered: number;
  }>;
  topRevenueRisks: Array<{
    memberId: string;
    name: string;
    detail: string;
    amount: number;
    status: MemberStatus;
  }>;
  recentActivity: Array<{
    id: string;
    type: string;
    title: string;
    detail: string;
    occurredAt: string;
  }>;
  statusBreakdown: Array<{
    status: MemberStatus;
    label: string;
    count: number;
    percentage: number;
  }>;
  recoveryQueue: {
    counts: Record<string, number>;
    items: Array<{
      taskId: string;
      memberId: string;
      name: string;
      phoneNumber: string;
      status: MemberStatus;
      daysOverdue: number;
      amount: number;
      nextAction: string;
    }>;
  };
  navigationBadges: {
    recovery: number;
    payments: number;
    tasks: number;
    alerts: number;
  };
};

type MemberWithLatestMembership = {
  memberships: Array<{ amount: { toString(): string } }>;
};

type RevenueTrendMembership = {
  expiryDate: Date;
  amount: { toString(): string };
};

type RecoveredPayment = {
  amountExpected: { toString(): string };
  amountPaid: { toString(): string } | null;
  verifiedAt: Date | null;
};

const statusLabels: Record<MemberStatus, string> = {
  [MemberStatus.ACTIVE]: 'Active',
  [MemberStatus.EXPIRING]: 'Expiring Soon',
  [MemberStatus.OVERDUE]: 'Overdue',
  [MemberStatus.AT_RISK]: 'At Risk',
  [MemberStatus.PENDING_VERIFICATION]: 'Pending Verification',
  [MemberStatus.CHURNED]: 'Churned',
};

const taskBucketByType: Record<TaskType, string> = {
  [TaskType.VERIFY_PAYMENT]: 'paymentVerification',
  [TaskType.FOLLOW_UP_MEMBER]: 'expiringSoon',
  [TaskType.RESOLVE_OVERDUE_STATUS]: 'overdueFollowUps',
  [TaskType.REVIEW_AT_RISK_MEMBER]: 'overdueFollowUps',
  [TaskType.REACTIVATION]: 'reactivation',
};

const recoveryTaskTypes = [
  TaskType.FOLLOW_UP_MEMBER,
  TaskType.RESOLVE_OVERDUE_STATUS,
  TaskType.REVIEW_AT_RISK_MEMBER,
  TaskType.REACTIVATION,
];

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantPrisma: TenantPrismaService,
  ) {}

  async summary(organizationId: string): Promise<DashboardSummary> {
    this.tenantPrisma.assertOrganizationAccess(organizationId);

    const today = this.startOfDay(new Date());
    const endDate = today;
    const startDate = this.addDays(endDate, -6);
    const reactivatedWorkflowQuery =
      Prisma.validator<Prisma.WorkflowFindManyArgs>()({
        where: {
          type: WorkflowType.REACTIVATION,
          status: WorkflowStatus.COMPLETED,
        },
        distinct: ['memberId'],
        select: { memberId: true },
      });
    const topRiskMembersQuery = Prisma.validator<Prisma.MemberFindManyArgs>()({
      where: {
        deletedAt: null,
        status: {
          in: [
            MemberStatus.OVERDUE,
            MemberStatus.AT_RISK,
            MemberStatus.EXPIRING,
          ],
        },
      },
      orderBy: [{ updatedAt: 'desc' }],
      take: 5,
      include: {
        memberships: {
          orderBy: { expiryDate: 'desc' },
          take: 1,
          select: { amount: true, expiryDate: true },
        },
      },
    });
    const recentEventsQuery =
      Prisma.validator<Prisma.TimelineEventFindManyArgs>()({
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: { member: true },
      });
    const statusGroupsQuery = Prisma.validator<Prisma.MemberGroupByArgs>()({
      by: ['status'],
      where: { deletedAt: null },
      _count: { status: true },
    });
    const queueTasksQuery = Prisma.validator<Prisma.TaskFindManyArgs>()({
      where: {
        status: { in: [TaskStatus.OPEN, TaskStatus.IN_PROGRESS] },
      },
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
      take: 8,
      include: {
        member: {
          include: {
            memberships: {
              orderBy: { expiryDate: 'desc' },
              take: 1,
              select: { amount: true, expiryDate: true },
            },
          },
        },
      },
    });
    const [
      atRiskMembers,
      overdueMembers,
      expiringMembersCount,
      overdueMembersCount,
      recoveredPayments,
      trendRiskMemberships,
      reactivatedWorkflows,
      openTasksCount,
      totalMembersCount,
      topRiskMembers,
      recentEvents,
      statusGroups,
      queueTasks,
      recoveryTasksCount,
      pendingPaymentVerificationCount,
    ] = await Promise.all([
      this.membersWithLatestMembership([MemberStatus.AT_RISK]),
      this.membersWithLatestMembership([MemberStatus.OVERDUE]),
      this.prisma.member.count(
        this.tenantPrisma.scoped<Prisma.MemberCountArgs>({
          where: {
            deletedAt: null,
            status: MemberStatus.EXPIRING,
          },
        }),
      ),
      this.prisma.member.count(
        this.tenantPrisma.scoped<Prisma.MemberCountArgs>({
          where: {
            deletedAt: null,
            status: MemberStatus.OVERDUE,
          },
        }),
      ),
      this.prisma.payment.findMany(
        this.tenantPrisma.scoped<Prisma.PaymentFindManyArgs>({
          where: {
            status: PaymentStatus.VERIFIED,
            verifiedAt: {
              gte: startDate,
              lte: this.endOfDay(endDate),
            },
          },
          select: {
            amountExpected: true,
            amountPaid: true,
            verifiedAt: true,
          },
        }),
      ),
      this.prisma.membership.findMany(
        this.tenantPrisma.scoped<Prisma.MembershipFindManyArgs>({
          where: {
            member: {
              deletedAt: null,
              status: {
                in: [MemberStatus.OVERDUE, MemberStatus.AT_RISK],
              },
            },
            expiryDate: {
              lte: endDate,
            },
          },
          select: {
            amount: true,
            expiryDate: true,
          },
        }),
      ),
      this.prisma.workflow.findMany(
        this.tenantPrisma.scoped(reactivatedWorkflowQuery),
      ),
      this.prisma.task.count(
        this.tenantPrisma.scoped<Prisma.TaskCountArgs>({
          where: {
            status: TaskStatus.OPEN,
          },
        }),
      ),
      this.prisma.member.count(
        this.tenantPrisma.scoped<Prisma.MemberCountArgs>({
          where: { deletedAt: null },
        }),
      ),
      this.prisma.member.findMany(
        this.tenantPrisma.scoped(topRiskMembersQuery),
      ),
      this.prisma.timelineEvent.findMany(
        this.tenantPrisma.scoped(recentEventsQuery),
      ),
      this.prisma.member.groupBy(this.tenantPrisma.scoped(statusGroupsQuery)),
      this.prisma.task.findMany(this.tenantPrisma.scoped(queueTasksQuery)),
      this.prisma.task.count(
        this.tenantPrisma.scoped<Prisma.TaskCountArgs>({
          where: {
            type: { in: recoveryTaskTypes },
            status: { in: [TaskStatus.OPEN, TaskStatus.IN_PROGRESS] },
          },
        }),
      ),
      this.prisma.payment.count(
        this.tenantPrisma.scoped<Prisma.PaymentCountArgs>({
          where: {
            status: PaymentStatus.PENDING_VERIFICATION,
          },
        }),
      ),
    ]);

    const revenueAtRisk = this.sumLatestMembershipAmounts(atRiskMembers);
    const overdueRevenue = this.sumLatestMembershipAmounts(overdueMembers);
    const recoveredRevenue = this.sumRecoveredPayments(recoveredPayments);

    return {
      revenueAtRisk,
      overdueRevenue,
      recoveredRevenue,
      expiringMembersCount,
      overdueMembersCount,
      reactivatedMembersCount: reactivatedWorkflows.length,
      openTasksCount,
      recoveryConversionRate: this.percentage(
        recoveredRevenue,
        revenueAtRisk + overdueRevenue + recoveredRevenue,
      ),
      totalMembersCount,
      dateRange: {
        label: `${this.formatMonthDay(startDate)} - ${this.formatMonthDay(
          endDate,
        )}, ${endDate.getFullYear()}`,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      revenueTrend: this.buildRevenueTrend(
        startDate,
        trendRiskMemberships,
        recoveredPayments,
      ),
      topRevenueRisks: topRiskMembers
        .map((member) => {
          const latestMembership = member.memberships[0];
          const daysOverdue = latestMembership
            ? this.daysBetween(latestMembership.expiryDate, today)
            : 0;

          return {
            memberId: member.id,
            name: this.memberName(member.firstName, member.lastName),
            detail:
              member.status === MemberStatus.EXPIRING
                ? `Expiring in ${Math.max(daysOverdue * -1, 0)} days`
                : `Overdue - ${Math.max(daysOverdue, 0)} days`,
            amount: Number(latestMembership?.amount ?? 0),
            status: member.status,
          };
        })
        .sort((first, second) => second.amount - first.amount),
      recentActivity: recentEvents.map((event) => ({
        id: event.id,
        type: event.type,
        title: this.activityTitle(event.type),
        detail: this.activityDetail(event),
        occurredAt: event.createdAt.toISOString(),
      })),
      statusBreakdown: this.buildStatusBreakdown(
        statusGroups,
        totalMembersCount,
      ),
      recoveryQueue: {
        counts: this.buildQueueCounts(queueTasks),
        items: queueTasks.slice(0, 3).map((task) => {
          const membership = task.member.memberships[0];

          return {
            taskId: task.id,
            memberId: task.memberId,
            name: this.memberName(task.member.firstName, task.member.lastName),
            phoneNumber: task.member.phoneNumber,
            status: task.member.status,
            daysOverdue: membership
              ? Math.max(this.daysBetween(membership.expiryDate, today), 0)
              : 0,
            amount: Number(membership?.amount ?? 0),
            nextAction: this.nextAction(task.type),
          };
        }),
      },
      navigationBadges: {
        recovery: recoveryTasksCount,
        payments: pendingPaymentVerificationCount,
        tasks: openTasksCount,
        alerts: openTasksCount,
      },
    };
  }

  private membersWithLatestMembership(
    statuses: MemberStatus[],
  ): Promise<MemberWithLatestMembership[]> {
    const query = Prisma.validator<Prisma.MemberFindManyArgs>()({
      where: {
        deletedAt: null,
        status: { in: statuses },
      },
      select: {
        memberships: {
          orderBy: { expiryDate: 'desc' },
          take: 1,
          select: { amount: true },
        },
      },
    });

    return this.prisma.member.findMany(this.tenantPrisma.scoped(query));
  }

  private sumLatestMembershipAmounts(members: MemberWithLatestMembership[]) {
    return members.reduce(
      (total, member) => total + Number(member.memberships[0]?.amount ?? 0),
      0,
    );
  }

  private percentage(numerator: number, denominator: number) {
    if (denominator === 0) {
      return 0;
    }

    return Math.round((numerator / denominator) * 10000) / 100;
  }

  private startOfDay(date: Date) {
    const next = new Date(date);
    next.setHours(0, 0, 0, 0);
    return next;
  }

  private addDays(date: Date, days: number) {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
  }

  private endOfDay(date: Date) {
    const next = new Date(date);
    next.setHours(23, 59, 59, 999);
    return next;
  }

  private daysBetween(first: Date, second: Date) {
    const firstDay = this.startOfDay(first);
    const secondDay = this.startOfDay(second);

    return Math.ceil((secondDay.getTime() - firstDay.getTime()) / 86_400_000);
  }

  private formatMonthDay(date: Date) {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
    }).format(date);
  }

  private memberName(firstName: string, lastName?: string | null) {
    return [firstName, lastName].filter(Boolean).join(' ');
  }

  private buildRevenueTrend(
    startDate: Date,
    riskMemberships: RevenueTrendMembership[],
    recoveredPayments: RecoveredPayment[],
  ) {
    return Array.from({ length: 7 }, (_, index) => {
      const date = this.addDays(startDate, index);
      const dayStart = this.startOfDay(date);
      const dayEnd = this.endOfDay(date);

      return {
        label: this.formatMonthDay(date),
        atRisk: this.sumMembershipsExpiredBy(riskMemberships, dayEnd),
        recovered: this.sumRecoveredPaymentsForDay(
          recoveredPayments,
          dayStart,
          dayEnd,
        ),
      };
    });
  }

  private sumMembershipsExpiredBy(
    memberships: RevenueTrendMembership[],
    date: Date,
  ) {
    return memberships.reduce((total, membership) => {
      if (membership.expiryDate > date) {
        return total;
      }

      return total + Number(membership.amount);
    }, 0);
  }

  private sumRecoveredPayments(payments: RecoveredPayment[]) {
    return payments.reduce(
      (total, payment) =>
        total + Number(payment.amountPaid ?? payment.amountExpected),
      0,
    );
  }

  private sumRecoveredPaymentsForDay(
    payments: RecoveredPayment[],
    startDate: Date,
    endDate: Date,
  ) {
    return this.sumRecoveredPayments(
      payments.filter(
        (payment) =>
          payment.verifiedAt !== null &&
          payment.verifiedAt >= startDate &&
          payment.verifiedAt <= endDate,
      ),
    );
  }

  private buildStatusBreakdown(
    groups: Array<{ status: MemberStatus; _count: { status: number } }>,
    total: number,
  ) {
    const countByStatus = new Map(
      groups.map((group) => [group.status, group._count.status]),
    );
    const statuses = [
      MemberStatus.ACTIVE,
      MemberStatus.EXPIRING,
      MemberStatus.OVERDUE,
      MemberStatus.AT_RISK,
      MemberStatus.PENDING_VERIFICATION,
      MemberStatus.CHURNED,
    ];

    return statuses.map((status) => {
      const count = countByStatus.get(status) ?? 0;

      return {
        status,
        label: statusLabels[status],
        count,
        percentage: this.percentage(count, total),
      };
    });
  }

  private buildQueueCounts(tasks: Array<{ type: TaskType }>) {
    return tasks.reduce<Record<string, number>>(
      (counts, task) => {
        counts[taskBucketByType[task.type]] += 1;
        return counts;
      },
      {
        overdueFollowUps: 0,
        paymentVerification: 0,
        reactivation: 0,
        expiringSoon: 0,
      },
    );
  }

  private nextAction(type: TaskType) {
    if (
      type === TaskType.REACTIVATION ||
      type === TaskType.REVIEW_AT_RISK_MEMBER
    ) {
      return 'Escalate';
    }

    if (type === TaskType.VERIFY_PAYMENT) {
      return 'Review proof';
    }

    return 'Send follow-up';
  }

  private activityTitle(type: TimelineEventType) {
    const titles: Record<TimelineEventType, string> = {
      [TimelineEventType.MEMBER_CREATED]: 'New member added',
      [TimelineEventType.MEMBER_UPDATED]: 'Member updated',
      [TimelineEventType.MEMBER_STATUS_CHANGED]: 'Member status changed',
      [TimelineEventType.MEMBERSHIP_CREATED]: 'Membership created',
      [TimelineEventType.MEMBERSHIP_RENEWED]: 'Member reactivated',
      [TimelineEventType.PAYMENT_CREATED]: 'Payment proof uploaded',
      [TimelineEventType.PAYMENT_VERIFIED]: 'Payment verified',
      [TimelineEventType.PAYMENT_REJECTED]: 'Payment rejected',
      [TimelineEventType.WORKFLOW_CREATED]: 'Workflow started',
      [TimelineEventType.WORKFLOW_STEP_EXECUTED]: 'Workflow step executed',
      [TimelineEventType.MESSAGE_SENT]: 'Reminder sent',
      [TimelineEventType.TASK_CREATED]: 'Task created',
      [TimelineEventType.TASK_COMPLETED]: 'Task completed',
    };

    return titles[type];
  }

  private activityDetail(event: {
    member: { firstName: string; lastName: string | null };
    metadata: unknown;
  }) {
    const metadata =
      event.metadata && typeof event.metadata === 'object'
        ? (event.metadata as Record<string, unknown>)
        : {};
    const amount =
      typeof metadata.amount === 'string' || typeof metadata.amount === 'number'
        ? ` - ${String(metadata.amount)}`
        : '';

    return `${this.memberName(event.member.firstName, event.member.lastName)}${amount}`;
  }
}
