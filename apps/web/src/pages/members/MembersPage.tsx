import { useCallback, useEffect, useMemo, useState } from "react";
import { MemberForm } from "../../components/members/MemberForm";
import { MemberImport } from "../../components/members/MemberImport";
import { MemberTable } from "../../components/members/MemberTable";
import { createMember, listMembers } from "../../features/members/api";
import type { MemberStatus, MemberSummary } from "../../features/members/types";
import type { MemberFormInput } from "../../lib/validations/member";

const statuses: Array<{ value: MemberStatus | ""; label: string }> = [
  { value: "", label: "All statuses" },
  { value: "ACTIVE", label: "Active" },
  { value: "EXPIRING", label: "Expiring" },
  { value: "OVERDUE", label: "Overdue" },
  { value: "AT_RISK", label: "At risk" },
  { value: "PENDING_VERIFICATION", label: "Pending verification" },
  { value: "CHURNED", label: "Churned" },
];

export function MembersPage() {
  const [members, setMembers] = useState<MemberSummary[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<MemberStatus | "">("");
  const [plan, setPlan] = useState("");
  const [expiry, setExpiry] = useState("");
  const [activePanel, setActivePanel] = useState<"add" | "import" | null>(
    null,
  );
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const loadMembers = useCallback(async () => {
    try {
      setError("");
      setMembers(await listMembers({ search, status }));
    } catch {
      setError("Could not load members.");
    } finally {
      setIsLoading(false);
    }
  }, [search, status]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadMembers();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadMembers]);

  const planOptions = useMemo(
    () =>
      Array.from(new Set(members.flatMap((member) => {
        const planName = member.memberships[0]?.plan?.name;

        return planName ? [planName] : [];
      }))).sort(),
    [members],
  );

  const visibleMembers = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return members.filter((member) => {
      const membership = member.memberships[0];
      const planMatches = !plan || membership?.plan?.name === plan;

      if (!planMatches) {
        return false;
      }

      if (!expiry || !membership) {
        return !expiry;
      }

      const expiryDate = new Date(membership.expiryDate);
      expiryDate.setHours(0, 0, 0, 0);
      const daysUntilExpiry = Math.ceil(
        (expiryDate.getTime() - today.getTime()) / 86_400_000,
      );

      if (expiry === "overdue") {
        return daysUntilExpiry < 0;
      }

      if (expiry === "week") {
        return daysUntilExpiry >= 0 && daysUntilExpiry <= 7;
      }

      if (expiry === "month") {
        return daysUntilExpiry >= 0 && daysUntilExpiry <= 30;
      }

      return true;
    });
  }, [expiry, members, plan]);

  const counts = useMemo(
    () => ({
      total: visibleMembers.length,
      active: visibleMembers.filter((member) => member.status === "ACTIVE")
        .length,
      expiring: visibleMembers.filter((member) => member.status === "EXPIRING")
        .length,
      overdue: visibleMembers.filter((member) => member.status === "OVERDUE")
        .length,
      churned: visibleMembers.filter((member) => member.status === "CHURNED")
        .length,
    }),
    [visibleMembers],
  );

  const handleCreate = async (input: MemberFormInput) => {
    await createMember(input);
    await loadMembers();
    setActivePanel(null);
  };

  return (
    <main className="page members-page">
      <header className="page-header">
        <div>
          <h1>Members</h1>
          <p>Manage your gym members and their membership lifecycle.</p>
        </div>
        <div className="page-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={() =>
              setActivePanel(activePanel === "import" ? null : "import")
            }
          >
            Import Members
          </button>
          <button
            type="button"
            className="primary-button"
            onClick={() => setActivePanel(activePanel === "add" ? null : "add")}
          >
            Add Member
          </button>
        </div>
      </header>
      {activePanel ? (
        <section className="action-panel">
          <div className="action-panel-header">
            <h2>{activePanel === "add" ? "Add member" : "Import members"}</h2>
            <button type="button" onClick={() => setActivePanel(null)}>
              Close
            </button>
          </div>
          {activePanel === "add" ? (
            <MemberForm onSubmit={handleCreate} />
          ) : (
            <MemberImport onImported={loadMembers} />
          )}
        </section>
      ) : null}
      <section className="member-stats-grid">
        <div className="member-stat-card">
          <span className="stat-icon stat-icon-neutral">M</span>
          <div>
            <small>Total Members</small>
            <strong>{counts.total}</strong>
            <span>Visible list</span>
          </div>
        </div>
        <div className="member-stat-card">
          <span className="stat-icon stat-icon-success" />
          <div>
            <small>Active</small>
            <strong>{counts.active}</strong>
            <span>
              {counts.total
                ? Math.round((counts.active / counts.total) * 100)
                : 0}
              % of total
            </span>
          </div>
        </div>
        <div className="member-stat-card">
          <span className="stat-icon stat-icon-warning" />
          <div>
            <small>Expiring Soon</small>
            <strong>{counts.expiring}</strong>
            <span>
              {counts.total
                ? Math.round((counts.expiring / counts.total) * 100)
                : 0}
              % of total
            </span>
          </div>
        </div>
        <div className="member-stat-card">
          <span className="stat-icon stat-icon-danger" />
          <div>
            <small>Overdue</small>
            <strong>{counts.overdue}</strong>
            <span>
              {counts.total
                ? Math.round((counts.overdue / counts.total) * 100)
                : 0}
              % of total
            </span>
          </div>
        </div>
        <div className="member-stat-card">
          <span className="stat-icon stat-icon-muted" />
          <div>
            <small>Churned</small>
            <strong>{counts.churned}</strong>
            <span>
              {counts.total
                ? Math.round((counts.churned / counts.total) * 100)
                : 0}
              % of total
            </span>
          </div>
        </div>
      </section>
      <section className="members-table-card">
        <div className="member-filters">
          <label>
            Status
            <select
              value={status}
              onChange={(event) =>
                setStatus(event.target.value as MemberStatus | "")
              }
            >
              {statuses.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Plan
            <select
              value={plan}
              onChange={(event) => setPlan(event.target.value)}
            >
              <option value="">All plans</option>
              {planOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label>
            Expiry
            <select
              value={expiry}
              onChange={(event) => setExpiry(event.target.value)}
            >
              <option value="">Anytime</option>
              <option value="overdue">Overdue</option>
              <option value="week">Next 7 days</option>
              <option value="month">Next 30 days</option>
            </select>
          </label>
          <label className="member-search">
            Search
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search members..."
            />
          </label>
          <button type="button" className="secondary-button">
            Filters
          </button>
        </div>
        <div className="table-toolbar">
          <span>
            Showing {visibleMembers.length === 0 ? 0 : 1} to{" "}
            {visibleMembers.length} of {visibleMembers.length} members
          </span>
          <div>
            <button type="button" className="secondary-button">
              Export
            </button>
            <select defaultValue="20">
              <option value="20">20 / page</option>
              <option value="50">50 / page</option>
            </select>
          </div>
        </div>
        {error ? (
          <section className="dashboard-state dashboard-state-error compact-state">
            <strong>{error}</strong>
            <span>Refresh the page or try again after the API is available.</span>
          </section>
        ) : isLoading ? (
          <section className="dashboard-state compact-state">
            <strong>Loading members</strong>
            <span>Finding current members and lifecycle states.</span>
          </section>
        ) : visibleMembers.length === 0 ? (
          <section className="empty-state">
            <strong>No members match this view</strong>
            <span>Import members or clear filters to populate the table.</span>
          </section>
        ) : (
          <MemberTable members={visibleMembers} />
        )}
      </section>
    </main>
  );
}
