import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { PaymentVerificationPanel } from "../../components/payments";
import {
  getPayment,
  rejectPayment,
  verifyPayment,
} from "../../features/payments/api";
import type { Payment } from "../../features/payments/types";

import { useAuth } from "../../lib/auth/AuthContext";
import { captureEvent } from "../../lib/posthog/posthog";

export function PaymentDetailPage() {
  const { organization, user } = useAuth();
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

    const verifiedPayment = await verifyPayment(paymentId);
    setPayment(verifiedPayment);
    captureEvent("payment_verified", user?.id, {
      organizationId: organization?.id,
      paymentId,
      amount: Number(
        verifiedPayment.amountPaid ?? verifiedPayment.amountExpected,
      ),
    });
  };

  const handleReject = async (reason: string) => {
    if (!paymentId) {
      return;
    }

    setPayment(await rejectPayment(paymentId, reason));
    captureEvent("payment_rejected", user?.id, {
      organizationId: organization?.id,
      paymentId,
    });
  };

  if (error) {
    return (
      <main className="page">
        <section className="dashboard-state dashboard-state-error">
          <strong>{error}</strong>
          <span>Go back to payments and try opening this record again.</span>
        </section>
      </main>
    );
  }

  if (!payment) {
    return (
      <main className="page">
        <section className="dashboard-state">
          <strong>Loading payment</strong>
          <span>Fetching payment proof and member details.</span>
        </section>
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
