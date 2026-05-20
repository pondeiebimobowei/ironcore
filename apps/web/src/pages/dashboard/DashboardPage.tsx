import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
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
  totalMembersCount: 0,
  dateRange: { label: "Last 7 days", startDate: "", endDate: "" },
  revenueTrend: [],
  topRevenueRisks: [],
  recentActivity: [],
  statusBreakdown: [],
  recoveryQueue: {
    counts: {
      overdueFollowUps: 0,
      paymentVerification: 0,
      reactivation: 0,
      expiringSoon: 0,
    },
    items: [],
  },
};

const statusPalette: Record<string, string> = {
  ACTIVE: "#10b981",
  EXPIRING: "#f59e0b",
  OVERDUE: "#ef4444",
  AT_RISK: "#a855f7",
  PENDING_VERIFICATION: "#3b82f6",
  CHURNED: "#9ca3af",
};

function formatCurrency(value: number) {
  return `₦${new Intl.NumberFormat("en-NG", {
    maximumFractionDigits: 0,
  }).format(value)}`;
}

function formatRelativeTime(value: string) {
  if (!value) {
    return "Just now";
  }

  const minutes = Math.max(
    1,
    Math.round((Date.now() - new Date(value).getTime()) / 60_000),
  );

  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.round(minutes / 60);

  if (hours < 24) {
    return `${hours}h ago`;
  }

  return `${Math.round(hours / 24)}d ago`;
}

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function chartPoints(
  data: DashboardSummary["revenueTrend"],
  key: "atRisk" | "recovered",
  maxValue: number,
) {
  if (data.length === 0) {
    return "";
  }

  return data
    .map((point, index) => {
      const x = data.length === 1 ? 0 : (index / (data.length - 1)) * 100;
      const y = 100 - (point[key] / maxValue) * 86;
      return `${x},${Math.max(8, Math.min(96, y))}`;
    })
    .join(" ");
}

function donutBackground(summary: DashboardSummary) {
  let cursor = 0;
  const segments = summary.statusBreakdown
    .filter((item) => item.count > 0)
    .map((item) => {
      const start = cursor;
      cursor += item.percentage;
      return `${statusPalette[item.status] ?? "#9ca3af"} ${start}% ${cursor}%`;
    });

  return segments.length > 0
    ? `conic-gradient(${segments.join(", ")})`
    : "conic-gradient(#e5e7eb 0% 100%)";
}

export function DashboardPage() {
  const { organization, user } = useAuth();
  const [summary, setSummary] = useState<DashboardSummary>(emptySummary);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

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

  const maxTrendValue = useMemo(
    () =>
      Math.max(
        1,
        ...summary.revenueTrend.flatMap((point) => [
          point.atRisk,
          point.recovered,
        ]),
      ),
    [summary.revenueTrend],
  );
  const hasDashboardData = Object.values({
    revenueAtRisk: summary.revenueAtRisk,
    overdueRevenue: summary.overdueRevenue,
    recoveredRevenue: summary.recoveredRevenue,
    totalMembersCount: summary.totalMembersCount,
  }).some((value) => value > 0);
  const displayName = user?.email.split("@")[0] ?? "there";

  return (
    <main className="page dashboard-page">
      <header className="dashboard-hero">
        <div>
          <h1>Dashboard</h1>
          <p>
            Welcome back, {displayName}. Here&apos;s what&apos;s happening with{" "}
            {organization?.name ?? "your gym"}.
          </p>
        </div>
        <div className="dashboard-hero-actions">
          <button type="button" className="dashboard-date-button">
            <span aria-hidden="true">Cal</span>
            {summary.dateRange.label}
          </button>
          <button type="button" className="primary-button">
            Export Report
          </button>
        </div>
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
      ) : !hasDashboardData ? (
        <section className="dashboard-state">
          <strong>No revenue recovery data yet</strong>
          <span>Import members and run the state engine to populate metrics.</span>
        </section>
      ) : (
        <div className="dashboard-workspace">
          <section className="dashboard-kpi-grid">
            <KpiCard
              label="Revenue at Risk"
              value={formatCurrency(summary.revenueAtRisk)}
              change="18%"
              tone="danger"
              icon="Shield"
            />
            <KpiCard
              label="Overdue Revenue"
              value={formatCurrency(summary.overdueRevenue)}
              change="12%"
              tone="warning"
              icon="Clock"
            />
            <KpiCard
              label="Recovered Revenue"
              value={formatCurrency(summary.recoveredRevenue)}
              change="25%"
              tone="success"
              icon="Cash"
            />
            <KpiCard
              label="Recovery Conversion"
              value={`${summary.recoveryConversionRate}%`}
              change="6.2%"
              tone="accent"
              icon="Trend"
            />
          </section>

          <section className="dashboard-main-grid">
            <article className="dashboard-card revenue-chart-card">
              <DashboardCardHeader title="Revenue Overview" />
              <div className="chart-legend">
                <span className="legend-danger">At Risk</span>
                <span className="legend-success">Recovered</span>
              </div>
              <div className="revenue-chart">
                <div className="chart-axis">
                  <span>{formatCurrency(maxTrendValue)}</span>
                  <span>{formatCurrency(maxTrendValue * 0.75)}</span>
                  <span>{formatCurrency(maxTrendValue * 0.5)}</span>
                  <span>{formatCurrency(maxTrendValue * 0.25)}</span>
                  <span>₦0</span>
                </div>
                <div className="chart-plot">
                  <svg viewBox="0 0 100 100" preserveAspectRatio="none">
                    <polyline
                      className="chart-fill chart-fill-danger"
                      points={`0,100 ${chartPoints(
                        summary.revenueTrend,
                        "atRisk",
                        maxTrendValue,
                      )} 100,100`}
                    />
                    <polyline
                      className="chart-fill chart-fill-success"
                      points={`0,100 ${chartPoints(
                        summary.revenueTrend,
                        "recovered",
                        maxTrendValue,
                      )} 100,100`}
                    />
                    <polyline
                      className="chart-line chart-line-danger"
                      points={chartPoints(
                        summary.revenueTrend,
                        "atRisk",
                        maxTrendValue,
                      )}
                    />
                    <polyline
                      className="chart-line chart-line-success"
                      points={chartPoints(
                        summary.revenueTrend,
                        "recovered",
                        maxTrendValue,
                      )}
                    />
                  </svg>
                  <div className="chart-grid-lines" aria-hidden="true">
                    <span />
                    <span />
                    <span />
                    <span />
                  </div>
                  <div className="chart-labels">
                    {summary.revenueTrend.map((point) => (
                      <span key={point.label}>{point.label}</span>
                    ))}
                  </div>
                </div>
              </div>
            </article>

            <article className="dashboard-card risk-card">
              <DashboardCardHeader title="Top Revenue Risks" to="/members" />
              <div className="risk-list">
                {summary.topRevenueRisks.map((risk) => (
                  <Link
                    to={`/members/${risk.memberId}`}
                    className="risk-row"
                    key={risk.memberId}
                  >
                    <span className="dashboard-avatar">{initials(risk.name)}</span>
                    <span>
                      <strong>{risk.name}</strong>
                      <small>{risk.detail}</small>
                    </span>
                    <b>{formatCurrency(risk.amount)}</b>
                  </Link>
                ))}
              </div>
              <div className="risk-total">
                <span>Total</span>
                <strong>
                  {formatCurrency(
                    summary.topRevenueRisks.reduce(
                      (total, risk) => total + risk.amount,
                      0,
                    ),
                  )}
                </strong>
              </div>
            </article>

            <article className="dashboard-card activity-card">
              <DashboardCardHeader title="Recent Activity" to="/members" />
              <div className="activity-list">
                {summary.recentActivity.map((activity) => (
                  <div className="activity-row" key={activity.id}>
                    <span
                      className={`activity-icon activity-${activity.type.toLowerCase()}`}
                    >
                      {activity.title[0]}
                    </span>
                    <span>
                      <strong>{activity.title}</strong>
                      <small>{activity.detail}</small>
                    </span>
                    <time>{formatRelativeTime(activity.occurredAt)}</time>
                  </div>
                ))}
              </div>
            </article>

            <article className="dashboard-card queue-card">
              <DashboardCardHeader title="Recovery Queue" to="/recovery" />
              <div className="queue-tabs">
                <span className="active">
                  Overdue Follow-ups{" "}
                  <b>{summary.recoveryQueue.counts.overdueFollowUps}</b>
                </span>
                <span>
                  Payment Verification{" "}
                  <b>{summary.recoveryQueue.counts.paymentVerification}</b>
                </span>
                <span>
                  Reactivation <b>{summary.recoveryQueue.counts.reactivation}</b>
                </span>
                <span>
                  Expiring Soon <b>{summary.recoveryQueue.counts.expiringSoon}</b>
                </span>
              </div>
              <div className="dashboard-table-wrap">
                <table className="dashboard-queue-table">
                  <thead>
                    <tr>
                      <th>Member</th>
                      <th>Status</th>
                      <th>Days Overdue</th>
                      <th>Amount</th>
                      <th>Next Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.recoveryQueue.items.map((item) => (
                      <tr key={item.taskId}>
                        <td data-label="Member">
                          <Link
                            to={`/members/${item.memberId}`}
                            className="member-cell compact-member-cell"
                          >
                            <span className="dashboard-avatar">
                              {initials(item.name)}
                            </span>
                            <span>
                              <strong>{item.name}</strong>
                              <small>{item.phoneNumber}</small>
                            </span>
                          </Link>
                        </td>
                        <td data-label="Status">
                          <span
                            className={`status status-${item.status.toLowerCase()}`}
                          >
                            {item.status.replaceAll("_", " ")}
                          </span>
                        </td>
                        <td data-label="Days Overdue">{item.daysOverdue} days</td>
                        <td data-label="Amount">{formatCurrency(item.amount)}</td>
                        <td data-label="Next Action">
                          <button type="button" className="link-button">
                            {item.nextAction}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>

            <article className="dashboard-card status-card">
              <DashboardCardHeader title="Members by Status" />
              <div className="status-breakdown">
                <div
                  className="status-donut"
                  style={{ background: donutBackground(summary) }}
                  aria-label="Members by status"
                />
                <div className="status-legend">
                  {summary.statusBreakdown.map((item) => (
                    <div key={item.status}>
                      <span
                        style={{
                          backgroundColor: statusPalette[item.status] ?? "#9ca3af",
                        }}
                      />
                      <strong>{item.label}</strong>
                      <b>
                        {item.count} ({item.percentage}%)
                      </b>
                    </div>
                  ))}
                </div>
              </div>
              <div className="risk-total">
                <span>Total Members</span>
                <strong>{summary.totalMembersCount}</strong>
              </div>
            </article>

            <article className="quick-actions-card">
              <h2>Quick Action</h2>
              <div className="quick-actions-grid">
                <Link to="/members">Add Member</Link>
                <Link to="/members">Import Members</Link>
                <Link to="/payments">Record Payment</Link>
                <Link to="/workflows">Send Message</Link>
              </div>
            </article>
          </section>
        </div>
      )}
    </main>
  );
}

function KpiCard({
  label,
  value,
  change,
  tone,
  icon,
}: {
  label: string;
  value: string;
  change: string;
  tone: "danger" | "warning" | "success" | "accent";
  icon: string;
}) {
  return (
    <article className="dashboard-kpi-card">
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        <small className={`kpi-change kpi-change-${tone}`}>
          ↑ {change} vs last 7 days
        </small>
      </div>
      <b className={`kpi-icon kpi-icon-${tone}`}>{icon}</b>
    </article>
  );
}

function DashboardCardHeader({ title, to }: { title: string; to?: string }) {
  return (
    <header className="dashboard-card-header">
      <h2>{title}</h2>
      {to ? <Link to={to}>View all</Link> : null}
    </header>
  );
}
