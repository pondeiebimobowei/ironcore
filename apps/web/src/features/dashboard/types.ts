export type DashboardSummary = {
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
    status: string;
  }>;
  recentActivity: Array<{
    id: string;
    type: string;
    title: string;
    detail: string;
    occurredAt: string;
  }>;
  statusBreakdown: Array<{
    status: string;
    label: string;
    count: number;
    percentage: number;
  }>;
  recoveryQueue: {
    counts: {
      overdueFollowUps: number;
      paymentVerification: number;
      reactivation: number;
      expiringSoon: number;
    };
    items: Array<{
      taskId: string;
      memberId: string;
      name: string;
      phoneNumber: string;
      status: string;
      daysOverdue: number;
      amount: number;
      nextAction: string;
    }>;
  };
};
