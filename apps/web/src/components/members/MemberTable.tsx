import { Link } from "react-router-dom";
import type { MemberSummary } from "../../features/members/types";
import {
  formatOrganizationCurrency,
  useOrganizationFormatters,
} from "../../lib/format/organization";

const statusLabels: Record<string, string> = {
  ACTIVE: "Active",
  EXPIRING: "Expiring Soon",
  OVERDUE: "Overdue",
  AT_RISK: "At Risk",
  PENDING_VERIFICATION: "Pending Verification",
  CHURNED: "Churned",
};

function memberCode(memberId: string) {
  return `#MEM-${memberId.slice(-4).toUpperCase()}`;
}

function expiryDetail(expiryDate?: string) {
  if (!expiryDate) {
    return "No expiry date";
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);
  const days = Math.ceil((expiry.getTime() - today.getTime()) / 86_400_000);

  if (days < 0) {
    return `${Math.abs(days)} days overdue`;
  }

  if (days === 0) {
    return "Expires today";
  }

  return `${days} days left`;
}

export function MemberTable({ members }: { members: MemberSummary[] }) {
  const { formatDate } = useOrganizationFormatters();

  if (members.length === 0) {
    return <p className="empty-state">No members match the current filters.</p>;
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Member</th>
            <th>Status</th>
            <th>Plan</th>
            <th>Expiry Date</th>
            <th>Phone</th>
            <th>Last Payment</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {members.map((member) => {
            const membership = member.memberships[0];
            const payment = member.payments[0];

            return (
              <tr key={member.id}>
                <td className="member-cell" data-label="Member">
                  <span className="member-avatar" aria-hidden="true">
                    {member.firstName[0]}
                    {member.lastName?.[0] ?? ""}
                  </span>
                  <span>
                    <Link to={`/members/${member.id}`} className="row-link">
                      {member.firstName} {member.lastName}
                    </Link>
                    <small>{memberCode(member.id)}</small>
                  </span>
                </td>
                <td data-label="Status">
                  <span
                    className={`status status-${member.status.toLowerCase()}`}
                  >
                    {statusLabels[member.status] ?? member.status}
                  </span>
                </td>
                <td data-label="Plan">
                  {membership?.plan?.name ?? "Unassigned"}
                  <span>
                    {membership
                      ? formatOrganizationCurrency(
                          membership.amount,
                          membership.currency,
                        )
                      : "No active plan"}
                  </span>
                </td>
                <td data-label="Expiry Date">
                  {membership ? formatDate(membership.expiryDate) : "None"}
                  <span
                    className={
                      member.status === "OVERDUE" ? "danger-text" : undefined
                    }
                  >
                    {expiryDetail(membership?.expiryDate)}
                  </span>
                </td>
                <td data-label="Phone">{member.phoneNumber}</td>
                <td data-label="Last Payment">
                  {payment ? formatDate(payment.submittedAt) : "No payment"}
                  <span>
                    {payment
                      ? formatOrganizationCurrency(
                          payment.amountPaid ?? payment.amountExpected,
                          membership?.currency,
                        )
                      : "Awaiting first payment"}
                  </span>
                </td>
                <td data-label="Actions">
                  <Link
                    to={`/members/${member.id}`}
                    className="table-action-button"
                    aria-label={`Open ${member.firstName} ${member.lastName}`}
                  >
                    ...
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
