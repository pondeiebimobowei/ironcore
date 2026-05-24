import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { PaymentTable } from "../../components/payments";
import { listPayments } from "../../features/payments/api";
import type { Payment } from "../../features/payments/types";
import { useOrganizationFormatters } from "../../lib/format/organization";

function paymentAmount(payment: Payment) {
  return Number(payment.amountPaid ?? payment.amountExpected);
}

export function PaymentsPage() {
  const { currency, formatCurrency } = useOrganizationFormatters();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const loadPayments = useCallback(async () => {
    try {
      setError("");
      setPayments(await listPayments());
    } catch {
      setError("Could not load payments.");
    } finally {
      setIsLoading(false);
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
  const totalCollected = useMemo(
    () =>
      payments
        .filter((payment) => payment.status === "VERIFIED")
        .reduce((total, payment) => total + paymentAmount(payment), 0),
    [payments],
  );
  const pendingTotal = useMemo(
    () =>
      payments
        .filter((payment) => payment.status === "PENDING_VERIFICATION")
        .reduce((total, payment) => total + paymentAmount(payment), 0),
    [payments],
  );
  const rejectedTotal = useMemo(
    () =>
      payments
        .filter((payment) => payment.status === "REJECTED")
        .reduce((total, payment) => total + paymentAmount(payment), 0),
    [payments],
  );
  const recentPayments = payments.slice(0, 4);

  return (
    <main className="page payments-page">
      <header className="page-header">
        <div>
          <div className="breadcrumb">
            <span>Finance</span>
            <span>/</span>
            <span>Payments</span>
          </div>
          <h1>Payments</h1>
          <p>Track and manage all payments across your gym.</p>
        </div>
        <div className="page-actions">
          <button type="button" className="secondary-button">
            Export
          </button>
          <Link to="/payments/record" className="primary-button">
            Record Payment
          </Link>
        </div>
      </header>
      <section className="payment-metric-grid">
        <article className="payment-metric-card">
          <span className="settings-icon settings-icon-success">
            {currency}
          </span>
          <div>
            <small>Total Collected</small>
            <strong>{formatCurrency(totalCollected)}</strong>
            <p className="success-text">↑ 18% vs last 30 days</p>
          </div>
        </article>
        <article className="payment-metric-card">
          <span className="settings-icon settings-icon-blue">#</span>
          <div>
            <small>Successful Payments</small>
            <strong>{counts.verified}</strong>
            <p className="success-text">↑ 16% vs last 30 days</p>
          </div>
        </article>
        <article className="payment-metric-card">
          <span className="settings-icon settings-icon-yellow">!</span>
          <div>
            <small>Pending Payments</small>
            <strong>{counts.pending}</strong>
            <p className="danger-text">↓ {formatCurrency(pendingTotal)}</p>
          </div>
        </article>
        <article className="payment-metric-card">
          <span className="settings-icon settings-icon-danger">×</span>
          <div>
            <small>Failed Payments</small>
            <strong>{counts.rejected}</strong>
            <p className="danger-text">↓ {formatCurrency(rejectedTotal)}</p>
          </div>
        </article>
      </section>
      {error ? (
        <section className="dashboard-state dashboard-state-error">
          <strong>{error}</strong>
          <span>Refresh the page or try again after the API is available.</span>
        </section>
      ) : isLoading ? (
        <section className="dashboard-state">
          <strong>Loading payments</strong>
          <span>Finding submitted transfer proofs.</span>
        </section>
      ) : (
        <section className="payments-layout">
          <div className="payments-table-card">
            <div className="payment-filters">
              <label>
                Date Range
                <select defaultValue="30">
                  <option value="30">Last 30 days</option>
                  <option value="7">Last 7 days</option>
                  <option value="all">All time</option>
                </select>
              </label>
              <label>
                Status
                <select defaultValue="all">
                  <option value="all">All Statuses</option>
                  <option value="PENDING_VERIFICATION">Pending</option>
                  <option value="VERIFIED">Paid</option>
                  <option value="REJECTED">Failed</option>
                </select>
              </label>
              <label>
                Payment Method
                <select defaultValue="all">
                  <option value="all">All Methods</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="CASH">Cash</option>
                  <option value="POS">POS</option>
                </select>
              </label>
              <button type="button" className="secondary-button">
                Filters
              </button>
            </div>
            <PaymentTable payments={payments} />
          </div>
          <aside className="payments-side">
            <article className="payment-form-card">
              <h2>Payment Summary</h2>
              <div className="payment-donut" aria-hidden="true" />
              <dl className="payment-summary-list">
                <div>
                  <dt>Paid</dt>
                  <dd>{formatCurrency(totalCollected)}</dd>
                </div>
                <div>
                  <dt>Pending</dt>
                  <dd>{formatCurrency(pendingTotal)}</dd>
                </div>
                <div>
                  <dt>Failed</dt>
                  <dd>{formatCurrency(rejectedTotal)}</dd>
                </div>
              </dl>
            </article>
            <article className="payment-form-card">
              <h2>Recent Activities</h2>
              <div className="activity-list">
                {recentPayments.map((payment) => (
                  <Link
                    key={payment.id}
                    to={`/payments/${payment.id}`}
                    className="activity-row"
                  >
                    <span
                      className={`activity-icon activity-${payment.status.toLowerCase()}`}
                    >
                      {payment.status === "VERIFIED"
                        ? "✓"
                        : payment.status === "REJECTED"
                          ? "×"
                          : "!"}
                    </span>
                    <span>
                      <strong>
                        Payment{" "}
                        {payment.status.replaceAll("_", " ").toLowerCase()}
                      </strong>
                      <small>
                        {payment.member.firstName} {payment.member.lastName}
                      </small>
                    </span>
                    <b>{formatCurrency(paymentAmount(payment))}</b>
                  </Link>
                ))}
              </div>
            </article>
          </aside>
        </section>
      )}
    </main>
  );
}
