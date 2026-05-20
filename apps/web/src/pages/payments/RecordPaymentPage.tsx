import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { listMembers } from "../../features/members/api";
import type { MemberSummary } from "../../features/members/types";
import { createPayment } from "../../features/payments/api";
import type { PaymentMethod } from "../../features/payments/types";
import {
  type RecordPaymentFormInput,
  validateRecordPayment,
} from "../../lib/validations/payment";

const paymentMethods: Array<{ label: string; value: PaymentMethod }> = [
  { label: "Bank Transfer", value: "BANK_TRANSFER" },
  { label: "Cash", value: "CASH" },
  { label: "POS", value: "POS" },
  { label: "Stripe", value: "STRIPE" },
  { label: "Other", value: "OTHER" },
];

function fullName(member?: MemberSummary | null) {
  if (!member) {
    return "";
  }

  return [member.firstName, member.lastName].filter(Boolean).join(" ");
}

function formatCurrency(value: string | number | undefined | null) {
  const amount = Number(value ?? 0);

  return `₦${new Intl.NumberFormat("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0)}`;
}

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

export function RecordPaymentPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedMemberId = searchParams.get("memberId") ?? "";
  const [members, setMembers] = useState<MemberSummary[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState(requestedMemberId);
  const [selectedMembershipId, setSelectedMembershipId] = useState("");
  const [amountPaid, setAmountPaid] = useState("");
  const [amountExpected, setAmountExpected] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("BANK_TRANSFER");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [paymentDate, setPaymentDate] = useState(todayInputValue());
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const applyMembershipDefaults = useCallback((member?: MemberSummary) => {
    const membership = member?.memberships[0];
    setSelectedMembershipId(membership?.id ?? "");
    setAmountExpected(membership?.amount ?? "");
    setAmountPaid(membership?.amount ?? "");
  }, []);

  const loadMembers = useCallback(async () => {
    try {
      setError("");
      const data = await listMembers({});
      setMembers(data);
      const initialMemberId = requestedMemberId || data[0]?.id || "";
      const initialMember = data.find((member) => member.id === initialMemberId);
      setSelectedMemberId(initialMemberId);
      applyMembershipDefaults(initialMember);
    } catch {
      setError("Could not load members for payment recording.");
    } finally {
      setIsLoading(false);
    }
  }, [applyMembershipDefaults, requestedMemberId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadMembers();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadMembers]);

  const selectedMember = useMemo(
    () => members.find((member) => member.id === selectedMemberId) ?? null,
    [members, selectedMemberId],
  );

  const selectedMembership = useMemo(
    () =>
      selectedMember?.memberships.find(
        (membership) => membership.id === selectedMembershipId,
      ) ??
      selectedMember?.memberships[0] ??
      null,
    [selectedMember, selectedMembershipId],
  );

  const handleMemberChange = (memberId: string) => {
    const member = members.find((currentMember) => currentMember.id === memberId);
    setSelectedMemberId(memberId);
    applyMembershipDefaults(member);
  };

  const handleMembershipChange = (membershipId: string) => {
    const membership = selectedMember?.memberships.find(
      (currentMembership) => currentMembership.id === membershipId,
    );
    setSelectedMembershipId(membershipId);
    setAmountExpected(membership?.amount ?? "");
    setAmountPaid(membership?.amount ?? "");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const input: RecordPaymentFormInput = {
      memberId: selectedMemberId,
      membershipId: selectedMembershipId,
      amountExpected,
      amountPaid,
      method,
      reference,
      notes,
    };
    const validationError = validateRecordPayment(input);

    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setIsSubmitting(true);
      setError("");
      const payment = await createPayment({
        memberId: selectedMemberId,
        membershipId: selectedMembershipId || undefined,
        amountExpected,
        amountPaid,
        method,
        reference: reference || undefined,
        notes: notes || undefined,
      });
      navigate(`/payments/record/success/${payment.id}`, {
        state: { payment },
      });
    } catch {
      setError("Could not record this payment. Try again when the API is available.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="page record-payment-page">
      <header className="page-header record-payment-header">
        <div>
          <div className="breadcrumb">
            <Link to="/payments">Payments</Link>
            <span>/</span>
            <span>Record Payment</span>
          </div>
          <h1>Record Payment</h1>
          <p>Record a payment for a member. All required fields are marked.</p>
        </div>
        <Link to="/payments" className="secondary-button">
          Back to Payments
        </Link>
      </header>

      {isLoading ? (
        <section className="dashboard-state">
          <strong>Loading members</strong>
          <span>Preparing payment details.</span>
        </section>
      ) : (
        <form className="record-payment-layout" onSubmit={handleSubmit}>
          <section className="record-payment-main">
            {error ? (
              <section className="dashboard-state dashboard-state-error compact-state">
                <strong>{error}</strong>
              </section>
            ) : null}

            <article className="payment-form-card">
              <h2>1. Select Member</h2>
              <label>
                Member
                <select
                  value={selectedMemberId}
                  onChange={(event) => handleMemberChange(event.target.value)}
                  required
                >
                  {members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {fullName(member)} · {member.phoneNumber}
                    </option>
                  ))}
                </select>
              </label>
            </article>

            <article className="payment-form-card">
              <h2>2. Payment Details</h2>
              <div className="payment-form-grid">
                <label>
                  Payment Type
                  <select defaultValue="MEMBERSHIP_PAYMENT">
                    <option value="MEMBERSHIP_PAYMENT">Membership Payment</option>
                  </select>
                </label>
                <label>
                  Plan
                  <select
                    value={selectedMembershipId}
                    onChange={(event) =>
                      handleMembershipChange(event.target.value)
                    }
                  >
                    {selectedMember?.memberships.map((membership) => (
                      <option key={membership.id} value={membership.id}>
                        {membership.plan?.name ?? "Membership"} (
                        {formatCurrency(membership.amount)})
                      </option>
                    ))}
                    {!selectedMember?.memberships.length ? (
                      <option value="">No membership</option>
                    ) : null}
                  </select>
                </label>
                <label>
                  Invoice / Reference
                  <input
                    value={reference}
                    onChange={(event) => setReference(event.target.value)}
                    placeholder="INV-2026-0001"
                  />
                </label>
                <label>
                  Amount Due
                  <input
                    inputMode="decimal"
                    value={amountExpected}
                    onChange={(event) => setAmountExpected(event.target.value)}
                    required
                  />
                </label>
                <label>
                  Payment Date
                  <input
                    type="date"
                    value={paymentDate}
                    onChange={(event) => setPaymentDate(event.target.value)}
                  />
                </label>
                <label>
                  Payment Method
                  <select
                    value={method}
                    onChange={(event) =>
                      setMethod(event.target.value as PaymentMethod)
                    }
                  >
                    {paymentMethods.map((paymentMethod) => (
                      <option
                        key={paymentMethod.value}
                        value={paymentMethod.value}
                      >
                        {paymentMethod.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="wide-field character-field">
                  Reference / Notes
                  <textarea
                    value={notes}
                    maxLength={255}
                    onChange={(event) => setNotes(event.target.value)}
                    placeholder="Optional notes about this payment..."
                  />
                  <span>{notes.length} / 255</span>
                </label>
              </div>
            </article>

            <article className="payment-form-card">
              <h2>3. Additional Information</h2>
              <div className="payment-form-grid">
                <label>
                  Amount Paid
                  <input
                    inputMode="decimal"
                    value={amountPaid}
                    onChange={(event) => setAmountPaid(event.target.value)}
                    required
                  />
                </label>
                <label>
                  Change / Balance
                  <input
                    value={formatCurrency(
                      Number(amountPaid || 0) - Number(amountExpected || 0),
                    )}
                    readOnly
                  />
                </label>
                <label>
                  Staff
                  <select defaultValue="current-user">
                    <option value="current-user">Current staff member</option>
                  </select>
                </label>
                <label className="character-field">
                  Internal Notes
                  <textarea
                    placeholder="Add internal notes, if needed..."
                    maxLength={255}
                  />
                  <span>0 / 255</span>
                </label>
              </div>
            </article>

            <div className="record-payment-actions">
              <Link to="/payments" className="secondary-button">
                Cancel
              </Link>
              <button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Recording..." : "Record Payment"}
              </button>
            </div>
          </section>

          <aside className="record-payment-side">
            <article className="payment-form-card">
              <h2>Member Summary</h2>
              {selectedMember ? (
                <div className="summary-stack">
                  <strong>{fullName(selectedMember)}</strong>
                  <span>{selectedMember.phoneNumber}</span>
                  <span>{selectedMember.email ?? "No email on file"}</span>
                  <dl>
                    <div>
                      <dt>Membership Plan</dt>
                      <dd>{selectedMembership?.plan?.name ?? "Unassigned"}</dd>
                    </div>
                    <div>
                      <dt>Status</dt>
                      <dd>
                        <span
                          className={`status status-${selectedMember.status.toLowerCase()}`}
                        >
                          {selectedMember.status.replaceAll("_", " ")}
                        </span>
                      </dd>
                    </div>
                    <div>
                      <dt>Next Billing Date</dt>
                      <dd>
                        {selectedMembership
                          ? new Date(
                              selectedMembership.expiryDate,
                            ).toLocaleDateString()
                          : "Not set"}
                      </dd>
                    </div>
                    <div>
                      <dt>Outstanding Balance</dt>
                      <dd className="danger-text">
                        {formatCurrency(amountExpected)}
                      </dd>
                    </div>
                  </dl>
                </div>
              ) : (
                <p>No member selected.</p>
              )}
            </article>

            <article className="payment-form-card">
              <h2>Payment Summary</h2>
              <dl className="payment-summary-list">
                <div>
                  <dt>Amount</dt>
                  <dd>{formatCurrency(amountPaid)}</dd>
                </div>
                <div>
                  <dt>Discount</dt>
                  <dd>₦0.00</dd>
                </div>
                <div>
                  <dt>Tax (0%)</dt>
                  <dd>₦0.00</dd>
                </div>
                <div className="billing-total">
                  <dt>Total Paid</dt>
                  <dd>{formatCurrency(amountPaid)}</dd>
                </div>
              </dl>
            </article>

            <article className="important-note">
              <strong>Important</strong>
              <p>
                This records the payment and creates a verification task before
                revenue is counted as recovered.
              </p>
            </article>
          </aside>
        </form>
      )}
    </main>
  );
}
