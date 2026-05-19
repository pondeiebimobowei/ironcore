import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { MetricCardGrid } from "../../components/dashboard";
import { getDashboardSummary } from "../../features/dashboard/api";
import type { DashboardSummary } from "../../features/dashboard/types";
import { useAuth } from "../../lib/auth/AuthContext";

const emptySummary: DashboardSummary = {
  revenueAtRisk: 0,
  overdueRevenue: 0,
  recoveredRevenue: 0,
  expiringMembersCount: 0,
  overdueMembersCount: 0,
  reactivatedMembersCount: 0,
  openTasksCount: 0,
  recoveryConversionRate: 0,
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(value);
}

export function DashboardPage() {
  const { organization } = useAuth();
  const [summary, setSummary] = useState<DashboardSummary>(emptySummary);

  useEffect(() => {
    let active = true;

    getDashboardSummary()
      .then((data) => {
        if (active) {
          setSummary(data);
        }
      })
      .catch(() => {
        if (active) {
          setSummary(emptySummary);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const metrics = useMemo(
    () => [
      {
        label: "Revenue at risk",
        value: formatCurrency(summary.revenueAtRisk),
        detail: "At-risk memberships",
        tone: "danger" as const,
      },
      {
        label: "Overdue revenue",
        value: formatCurrency(summary.overdueRevenue),
        detail: `${summary.overdueMembersCount} overdue members`,
        tone: "warning" as const,
      },
      {
        label: "Recovered revenue",
        value: formatCurrency(summary.recoveredRevenue),
        detail: `${summary.reactivatedMembersCount} reactivated members`,
        tone: "success" as const,
      },
      {
        label: "Recovery conversion",
        value: `${summary.recoveryConversionRate}%`,
        detail: "Recovered from tracked revenue",
      },
      {
        label: "Expiring members",
        value: summary.expiringMembersCount,
        detail: "Renewal reminders due",
        tone: "warning" as const,
      },
      {
        label: "Open tasks",
        value: summary.openTasksCount,
        detail: "Needs team follow-up",
      },
    ],
    [summary],
  );

  return (
    <main className="page">
      <header className="page-header">
        <div>
          <h1>{organization?.name ?? "Dashboard"}</h1>
          <p>Revenue recovery workspace</p>
        </div>
        <Link to="/members" className="button-link">
          Manage members
        </Link>
      </header>
      <MetricCardGrid metrics={metrics} />
    </main>
  );
}
