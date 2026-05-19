import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getMember, updateMember } from "../../features/members/api";
import type { MemberDetail, MemberStatus } from "../../features/members/types";

const statuses: MemberStatus[] = [
  "ACTIVE",
  "EXPIRING",
  "OVERDUE",
  "AT_RISK",
  "PENDING_VERIFICATION",
  "CHURNED",
];

export function MemberDetailPage() {
  const { memberId } = useParams();
  const [member, setMember] = useState<MemberDetail | null>(null);
  const [error, setError] = useState("");

  const loadMember = useCallback(async () => {
    if (!memberId) {
      return;
    }

    try {
      setError("");
      setMember(await getMember(memberId));
    } catch {
      setError("Could not load this member.");
    }
  }, [memberId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadMember();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadMember]);

  const handleStatusChange = async (status: MemberStatus) => {
    if (!memberId) {
      return;
    }

    setMember(await updateMember(memberId, { status }));
  };

  if (error) {
    return (
      <main className="page">
        <section className="dashboard-state dashboard-state-error">
          <strong>{error}</strong>
          <span>Go back to members and try opening this record again.</span>
        </section>
      </main>
    );
  }

  if (!member) {
    return (
      <main className="page">
        <section className="dashboard-state">
          <strong>Loading member</strong>
          <span>Fetching membership, payments, tasks, and timeline.</span>
        </section>
      </main>
    );
  }

  return (
    <main className="page">
      <header className="page-header">
        <div>
          <Link to="/members" className="subtle-link">
            Members
          </Link>
          <h1>
            {member.firstName} {member.lastName}
          </h1>
          <p>
            {member.phoneNumber} {member.email ? `· ${member.email}` : ""}
          </p>
        </div>
        <label>
          Status
          <select
            value={member.status}
            onChange={(event) =>
              void handleStatusChange(event.target.value as MemberStatus)
            }
          >
            {statuses.map((status) => (
              <option key={status} value={status}>
                {status.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </label>
      </header>
      <section className="split-layout">
        <div className="detail-stack">
          <section>
            <h2>Memberships</h2>
            {member.memberships.length === 0 ? (
              <section className="empty-state">
                <strong>No memberships</strong>
                <span>This member does not have a membership yet.</span>
              </section>
            ) : null}
            {member.memberships.map((membership) => (
              <div key={membership.id} className="line-item">
                <strong>{membership.plan?.name ?? "Unassigned plan"}</strong>
                <span>
                  {membership.status} · expires{" "}
                  {new Date(membership.expiryDate).toLocaleDateString()}
                </span>
              </div>
            ))}
          </section>
          <section>
            <h2>Payments</h2>
            {member.payments.length === 0 ? (
              <section className="empty-state">
                <strong>No payments</strong>
                <span>Submitted transfer proofs will appear here.</span>
              </section>
            ) : null}
            {member.payments.map((payment) => (
              <div key={payment.id} className="line-item">
                <strong>{payment.status.replaceAll("_", " ")}</strong>
                <span>
                  Expected {payment.amountExpected}
                  {payment.amountPaid ? ` · paid ${payment.amountPaid}` : ""}
                </span>
              </div>
            ))}
          </section>
        </div>
        <aside className="side-panel">
          <h2>Tasks</h2>
          {member.tasks.length === 0 ? (
            <section className="empty-state">
              <strong>No open tasks</strong>
              <span>This member has no pending follow-up work.</span>
            </section>
          ) : null}
          {member.tasks.map((task) => (
            <div key={task.id} className="line-item">
              <strong>{task.type.replaceAll("_", " ")}</strong>
              <span>{task.status}</span>
            </div>
          ))}
          <h2>Timeline</h2>
          {member.timelineEvents.length === 0 ? (
            <section className="empty-state">
              <strong>No timeline events</strong>
              <span>Member, payment, and workflow events will appear here.</span>
            </section>
          ) : null}
          {member.timelineEvents.map((event) => (
            <div key={event.id} className="line-item">
              <strong>{event.type.replaceAll("_", " ")}</strong>
              <span>{new Date(event.createdAt).toLocaleString()}</span>
            </div>
          ))}
        </aside>
      </section>
    </main>
  );
}
