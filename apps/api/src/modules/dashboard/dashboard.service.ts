import { Injectable } from '@nestjs/common';
import {
  MemberStatus,
  PaymentStatus,
  TaskStatus,
  WorkflowStatus,
  WorkflowType,
} from '@prisma/client';
import { PrismaService } from '../database/prisma.service';

type DashboardSummary = {
  revenueAtRisk: number;
  overdueRevenue: number;
  recoveredRevenue: number;
  expiringMembersCount: number;
  overdueMembersCount: number;
  reactivatedMembersCount: number;
  openTasksCount: number;
  recoveryConversionRate: number;
};

type MemberWithLatestMembership = {
  memberships: Array<{ amount: { toString(): string } }>;
};

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async summary(organizationId: string): Promise<DashboardSummary> {
    const [
      atRiskMembers,
      overdueMembers,
      expiringMembersCount,
      overdueMembersCount,
      recoveredPayments,
      reactivatedWorkflows,
      openTasksCount,
    ] = await Promise.all([
      this.membersWithLatestMembership(organizationId, [MemberStatus.AT_RISK]),
      this.membersWithLatestMembership(organizationId, [MemberStatus.OVERDUE]),
      this.prisma.member.count({
        where: {
          organizationId,
          deletedAt: null,
          status: MemberStatus.EXPIRING,
        },
      }),
      this.prisma.member.count({
        where: {
          organizationId,
          deletedAt: null,
          status: MemberStatus.OVERDUE,
        },
      }),
      this.prisma.payment.findMany({
        where: {
          organizationId,
          status: PaymentStatus.VERIFIED,
        },
        select: {
          amountExpected: true,
          amountPaid: true,
        },
      }),
      this.prisma.workflow.findMany({
        where: {
          organizationId,
          type: WorkflowType.REACTIVATION,
          status: WorkflowStatus.COMPLETED,
        },
        distinct: ['memberId'],
        select: { memberId: true },
      }),
      this.prisma.task.count({
        where: {
          organizationId,
          status: TaskStatus.OPEN,
        },
      }),
    ]);

    const revenueAtRisk = this.sumLatestMembershipAmounts(atRiskMembers);
    const overdueRevenue = this.sumLatestMembershipAmounts(overdueMembers);
    const recoveredRevenue = recoveredPayments.reduce(
      (total, payment) =>
        total + Number(payment.amountPaid ?? payment.amountExpected),
      0,
    );

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
    };
  }

  private membersWithLatestMembership(
    organizationId: string,
    statuses: MemberStatus[],
  ) {
    return this.prisma.member.findMany({
      where: {
        organizationId,
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
}
