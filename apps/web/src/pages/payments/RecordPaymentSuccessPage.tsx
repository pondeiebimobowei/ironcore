import { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { getPayment } from "../../features/payments/api";
import type { Payment } from "../../features/payments/types";

type SuccessLocationState = {
  payment?: Payment;
};

function formatCurrency(value: string | number | undefined | null) {
  const amount = Number(value ?? 0);

  return `₦${new Intl.NumberFormat("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0)}`;
}

function memberName(payment: Payment) {
  return [payment.member.firstName, payment.member.lastName]
    .filter(Boolean)
    .join(" ");
}

export function RecordPaymentSuccessPage() {
  const { paymentId } = useParams();
  const location = useLocation();
  const state = location.state as SuccessLocationState | null;
  const [payment, setPayment] = useState<Payment | null>(state?.payment ?? null);
  const [isLoading, setIsLoading] = useState(!state?.payment);
  const [error, setError] = useState("");

  const loadPayment = useCallback(async () => {
    if (!paymentId || payment) {
      return;
    }

    try {
      setError("");
      setPayment(await getPayment(paymentId));
    } catch {
      setError("Could not load the recorded payment.");
    } finally {
      setIsLoading(false);
    }
  }, [payment, paymentId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadPayment();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadPayment]);

  if (isLoading) {
    return (
      <main className="page">
        <section className="dashboard-state">
          <strong>Loading recorded payment</strong>
          <span>Checking the latest payment details.</span>
        </section>
      </main>
    );
  }

  if (error || !payment) {
    return (
      <main className="page">
        <section className="dashboard-state dashboard-state-error">
          <strong>{error || "Payment was not found."}</strong>
          <span>Return to payments and try opening the record again.</span>
        </section>
      </main>
    );
  }

  const amountPaid = payment.amountPaid ?? payment.amountExpected;

  return (
    <main className="page payment-success-page">
      <div className="breadcrumb">
        <Link to="/payments">Payments</Link>
        <span>/</span>
        <Link to="/payments/record">Record Payment</Link>
      </div>

      <section className="success-hero">
        <div className="success-icon" aria-hidden="true">
          ✓
        </div>
        <h1>Payment Recorded Successfully!</h1>
        <p>The payment has been recorded and queued for verification.</p>
      </section>

      <section className="success-details-card">
        <article>
          <h2>Payment Details</h2>
          <div className="success-detail-grid">
            <div>
              <span>Member Name</span>
              <strong>{memberName(payment)}</strong>
            </div>
            <div>
              <span>Payment Type</span>
              <strong>Membership Payment</strong>
            </div>
            <div>
              <span>Member ID</span>
              <strong>{payment.member.id}</strong>
            </div>
            <div>
              <span>Amount Paid</span>
              <strong className="success-text">{formatCurrency(amountPaid)}</strong>
            </div>
            <div>
              <span>Payment Date</span>
              <strong>{new Date(payment.submittedAt).toLocaleString()}</strong>
            </div>
            <div>
              <span>Amount Applied</span>
              <strong className="success-text">{formatCurrency(amountPaid)}</strong>
            </div>
            <div>
              <span>Payment Method</span>
              <strong>{payment.method.replaceAll("_", " ")}</strong>
            </div>
            <div>
              <span>Transaction ID</span>
              <strong>{payment.reference || payment.id}</strong>
            </div>
            <div>
              <span>Reference / Check No.</span>
              <strong>{payment.reference || "—"}</strong>
            </div>
            <div>
              <span>Recorded By</span>
              <strong>Current staff member</strong>
            </div>
          </div>
        </article>

        <aside>
          <h2>Payment Summary</h2>
          <dl className="payment-summary-list">
            <div>
              <dt>Total Amount Due</dt>
              <dd>{formatCurrency(payment.amountExpected)}</dd>
            </div>
            <div>
              <dt>Amount Paid</dt>
              <dd className="success-text">{formatCurrency(amountPaid)}</dd>
            </div>
            <div className="billing-total">
              <dt>Remaining Balance</dt>
              <dd>{formatCurrency(Number(payment.amountExpected) - Number(amountPaid))}</dd>
            </div>
          </dl>
          <span className="success-pill">Account is queued for verification</span>
        </aside>
      </section>

      <section className="success-next-actions">
        <p>What would you like to do next?</p>
        <div>
          <Link to={`/members/${payment.member.id}`} className="primary-button">
            View Member Profile
          </Link>
          <Link to="/payments/record" className="secondary-button">
            Record Another Payment
          </Link>
          <Link to="/payments" className="secondary-button">
            Go to Payments
          </Link>
        </div>
      </section>
    </main>
  );
}
