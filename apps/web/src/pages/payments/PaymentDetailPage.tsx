import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { PaymentVerificationPanel } from "../../components/payments";
import {
  getPayment,
  rejectPayment,
  verifyPayment,
} from "../../features/payments/api";
import type { Payment } from "../../features/payments/types";

export function PaymentDetailPage() {
  const { paymentId } = useParams();
  const [payment, setPayment] = useState<Payment | null>(null);
  const [error, setError] = useState("");

  const loadPayment = useCallback(async () => {
    if (!paymentId) {
      return;
    }

    try {
      setError("");
      setPayment(await getPayment(paymentId));
    } catch {
      setError("Could not load this payment.");
    }
  }, [paymentId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadPayment();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadPayment]);

  const handleApprove = async () => {
    if (!paymentId) {
      return;
    }

    setPayment(await verifyPayment(paymentId));
  };

  const handleReject = async (reason: string) => {
    if (!paymentId) {
      return;
    }

    setPayment(await rejectPayment(paymentId, reason));
  };

  if (error) {
    return (
      <main className="page">
        <p className="form-errors">{error}</p>
      </main>
    );
  }

  if (!payment) {
    return (
      <main className="page">
        <p>Loading payment...</p>
      </main>
    );
  }

  return (
    <main className="page">
      <header className="page-header">
        <div>
          <Link to="/payments" className="subtle-link">
            Payments
          </Link>
          <h1>
            {payment.member.firstName} {payment.member.lastName}
          </h1>
          <p>
            Submitted {new Date(payment.submittedAt).toLocaleString()}
            {payment.reference ? ` · ${payment.reference}` : ""}
          </p>
        </div>
      </header>
      <section className="split-layout">
        <div className="detail-stack">
          <section>
            <h2>Payment</h2>
            <div className="line-item">
              <strong>{payment.amountPaid ?? payment.amountExpected}</strong>
              <span>
                Expected {payment.amountExpected} ·{" "}
                {payment.method.replaceAll("_", " ")}
              </span>
            </div>
            <div className="line-item">
              <strong>{payment.membership?.plan?.name ?? "Unassigned plan"}</strong>
              <span>
                {payment.membership
                  ? `Membership expires ${new Date(
                      payment.membership.expiryDate,
                    ).toLocaleDateString()}`
                  : "No membership attached"}
              </span>
            </div>
          </section>
          <section>
            <h2>Member</h2>
            <div className="line-item">
              <strong>{payment.member.phoneNumber}</strong>
              <span>{payment.member.email ?? "No email"}</span>
            </div>
          </section>
        </div>
        <PaymentVerificationPanel
          payment={payment}
          onApprove={handleApprove}
          onReject={handleReject}
        />
      </section>
    </main>
  );
}
