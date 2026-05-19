import { useEffect, useState } from "react";
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

  const loadMember = async () => {
    if (!memberId) {
      return;
    }

    try {
      setMember(await getMember(memberId));
    } catch {
      setError("Could not load this member.");
    }
  };

  useEffect(() => {
    void loadMember();
  }, [memberId]);

  const handleStatusChange = async (status: MemberStatus) => {
    if (!memberId) {
      return;
    }

    setMember(await updateMember(memberId, { status }));
  };

  if (error) {
    return (
      <main className="page">
        <p className="form-errors">{error}</p>
      </main>
    );
  }

  if (!member) {
    return (
      <main className="page">
        <p>Loading member...</p>
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
          {member.tasks.length === 0 ? <p>No open tasks.</p> : null}
          {member.tasks.map((task) => (
            <div key={task.id} className="line-item">
              <strong>{task.type.replaceAll("_", " ")}</strong>
              <span>{task.status}</span>
            </div>
          ))}
          <h2>Timeline</h2>
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
