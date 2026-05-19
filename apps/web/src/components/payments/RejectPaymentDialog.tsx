import { useState } from "react";
import type { PaymentStatus } from "../../features/payments/types";
import { validateRejectionReason } from "../../lib/validations/payment";

type RejectPaymentDialogProps = {
  status: PaymentStatus;
  onReject: (reason: string) => Promise<void>;
};

export function RejectPaymentDialog({
  status,
  onReject,
}: RejectPaymentDialogProps) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  const handleReject = async () => {
    const validationError = validateRejectionReason(reason);

    if (validationError) {
      setError(validationError);
      return;
    }

    setError("");
    await onReject(reason);
    setReason("");
  };

  return (
    <div className="panel-form">
      <label>
        Rejection reason
        <textarea
          value={reason}
          disabled={status === "VERIFIED"}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Explain why this proof cannot be accepted"
        />
      </label>
      {error ? <p className="form-errors">{error}</p> : null}
      <button
        type="button"
        disabled={status === "VERIFIED"}
        onClick={() => void handleReject()}
      >
        Reject payment
      </button>
    </div>
  );
}
