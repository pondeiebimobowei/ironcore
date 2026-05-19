import { useCallback, useEffect, useMemo, useState } from "react";
import { PaymentTable } from "../../components/payments";
import { listPayments } from "../../features/payments/api";
import type { Payment } from "../../features/payments/types";

export function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [error, setError] = useState("");

  const loadPayments = useCallback(async () => {
    try {
      setError("");
      setPayments(await listPayments());
    } catch {
      setError("Could not load payments.");
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadPayments();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadPayments]);

  const counts = useMemo(
    () => ({
      pending: payments.filter(
        (payment) => payment.status === "PENDING_VERIFICATION",
      ).length,
      verified: payments.filter((payment) => payment.status === "VERIFIED")
        .length,
      rejected: payments.filter((payment) => payment.status === "REJECTED")
        .length,
    }),
    [payments],
  );

  return (
    <main className="page">
      <header className="page-header">
        <div>
          <h1>Payments</h1>
          <p>Review transfer proofs and verify recovered revenue.</p>
        </div>
      </header>
      <section className="dashboard-grid compact">
        <div className="metric">
          <span>Pending verification</span>
          <strong>{counts.pending}</strong>
        </div>
        <div className="metric">
          <span>Verified</span>
          <strong>{counts.verified}</strong>
        </div>
        <div className="metric">
          <span>Rejected</span>
          <strong>{counts.rejected}</strong>
        </div>
      </section>
      {error ? <p className="form-errors">{error}</p> : null}
      <PaymentTable payments={payments} />
    </main>
  );
}
