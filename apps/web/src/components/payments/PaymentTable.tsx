import { Link } from "react-router-dom";
import type { Payment } from "../../features/payments/types";
import { useOrganizationFormatters } from "../../lib/format/organization";
import { PaymentStatusBadge } from "./PaymentStatusBadge";

export function PaymentTable({ payments }: { payments: Payment[] }) {
  const { formatCurrency, formatDate } = useOrganizationFormatters();

  if (payments.length === 0) {
    return <p className="empty-state">No payments found.</p>;
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Member</th>
            <th>Status</th>
            <th>Expected</th>
            <th>Paid</th>
            <th>Method</th>
            <th>Submitted</th>
          </tr>
        </thead>
        <tbody>
          {payments.map((payment) => (
            <tr key={payment.id}>
              <td data-label="Member">
                <Link to={`/payments/${payment.id}`} className="row-link">
                  {payment.member.firstName} {payment.member.lastName}
                </Link>
                <span>{payment.member.phoneNumber}</span>
              </td>
              <td data-label="Status">
                <PaymentStatusBadge status={payment.status} />
              </td>
              <td data-label="Expected">
                {formatCurrency(payment.amountExpected)}
              </td>
              <td data-label="Paid">
                {payment.amountPaid
                  ? formatCurrency(payment.amountPaid)
                  : "Pending"}
              </td>
              <td data-label="Method">{payment.method.replaceAll("_", " ")}</td>
              <td data-label="Submitted">{formatDate(payment.submittedAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
