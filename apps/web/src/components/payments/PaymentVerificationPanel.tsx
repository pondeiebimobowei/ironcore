import type { Payment } from "../../features/payments/types";
import { ApprovePaymentButton } from "./ApprovePaymentButton";
import { PaymentStatusBadge } from "./PaymentStatusBadge";
import { ProofPreview } from "./ProofPreview";
import { RejectPaymentDialog } from "./RejectPaymentDialog";

type PaymentVerificationPanelProps = {
  payment: Payment;
  onApprove: () => Promise<void>;
  onReject: (reason: string) => Promise<void>;
};

export function PaymentVerificationPanel({
  payment,
  onApprove,
  onReject,
}: PaymentVerificationPanelProps) {
  return (
    <aside className="side-panel">
      <h2>Verification</h2>
      <div className="line-item">
        <strong>{payment.member.firstName} {payment.member.lastName}</strong>
        <span>{payment.member.phoneNumber}</span>
      </div>
      <div className="line-item">
        <strong>{payment.amountPaid ?? payment.amountExpected}</strong>
        <span>
          Expected {payment.amountExpected} · {payment.method.replaceAll("_", " ")}
        </span>
      </div>
      <div className="line-item">
        <strong>Status</strong>
        <PaymentStatusBadge status={payment.status} />
      </div>
      <ProofPreview proofUrl={payment.proofUrl} />
      {payment.rejectionReason ? (
        <div className="line-item">
          <strong>Rejection reason</strong>
          <span>{payment.rejectionReason}</span>
        </div>
      ) : null}
      <h2>Actions</h2>
      <ApprovePaymentButton status={payment.status} onApprove={onApprove} />
      <RejectPaymentDialog status={payment.status} onReject={onReject} />
    </aside>
  );
}
