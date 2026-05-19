import { Link } from "react-router-dom";
import type { MemberSummary } from "../../features/members/types";

export function MemberTable({ members }: { members: MemberSummary[] }) {
  if (members.length === 0) {
    return <p className="empty-state">No members match the current filters.</p>;
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Status</th>
            <th>Phone</th>
            <th>Plan</th>
            <th>Expiry</th>
            <th>Payment</th>
          </tr>
        </thead>
        <tbody>
          {members.map((member) => {
            const membership = member.memberships[0];
            const payment = member.payments[0];

            return (
              <tr key={member.id}>
                <td>
                  <Link to={`/members/${member.id}`} className="row-link">
                    {member.firstName} {member.lastName}
                  </Link>
                  <span>{member.email || "No email"}</span>
                </td>
                <td>
                  <span
                    className={`status status-${member.status.toLowerCase()}`}
                  >
                    {member.status.replaceAll("_", " ")}
                  </span>
                </td>
                <td>{member.phoneNumber}</td>
                <td>{membership?.plan?.name ?? "Unassigned"}</td>
                <td>
                  {membership
                    ? new Date(membership.expiryDate).toLocaleDateString()
                    : "None"}
                </td>
                <td>{payment?.status.replaceAll("_", " ") ?? "No payment"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
