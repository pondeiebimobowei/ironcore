import type { PaymentStatus } from "../../features/payments/types";

type ApprovePaymentButtonProps = {
  status: PaymentStatus;
  onApprove: () => Promise<void>;
};

export function ApprovePaymentButton({
  status,
  onApprove,
}: ApprovePaymentButtonProps) {
  return (
    <button
      type="button"
      disabled={status === "VERIFIED"}
      onClick={() => void onApprove()}
    >
      Approve payment
    </button>
  );
}
