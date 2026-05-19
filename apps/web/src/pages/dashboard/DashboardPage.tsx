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
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    setIsLoading(true);
    setErrorMessage(null);

    getDashboardSummary()
      .then((data) => {
        if (active) {
          setSummary(data);
          setErrorMessage(null);
        }
      })
      .catch(() => {
        if (active) {
          setErrorMessage("Dashboard metrics could not be loaded.");
        }
      })
      .finally(() => {
        if (active) {
          setIsLoading(false);
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
  const hasDashboardData = Object.values(summary).some((value) => value > 0);

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
      {isLoading ? (
        <section className="dashboard-state">
          <strong>Loading dashboard metrics</strong>
          <span>Checking recovered, overdue, and at-risk revenue.</span>
        </section>
      ) : errorMessage ? (
        <section className="dashboard-state dashboard-state-error">
          <strong>{errorMessage}</strong>
          <span>Refresh the page or try again after the API is available.</span>
        </section>
      ) : hasDashboardData ? (
        <MetricCardGrid metrics={metrics} />
      ) : (
        <section className="dashboard-state">
          <strong>No revenue recovery data yet</strong>
          <span>Import members and run the state engine to populate metrics.</span>
        </section>
      )}
    </main>
  );
}
