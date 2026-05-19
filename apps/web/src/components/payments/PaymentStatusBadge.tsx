import type { PaymentStatus } from "../../features/payments/types";

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  return (
    <span className={`status status-${status.toLowerCase()}`}>
      {status.replaceAll("_", " ")}
    </span>
  );
}
