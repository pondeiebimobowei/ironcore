import { Link } from "react-router-dom";
import {
  billingTabs,
  recentInvoices,
  usageItems,
} from "../../features/organizations/billing";
import { useAuth } from "../../lib/auth/AuthContext";
import { supportMailto } from "../../lib/support/contact";

export function BillingPage() {
  const { organization } = useAuth();

  return (
    <main className="page billing-page">
      <header className="page-header settings-header">
        <div>
          <div className="breadcrumb">
            <Link to="/settings">Settings</Link>
            <span>/</span>
            <span>Billing & Plan</span>
          </div>
          <h1>Billing & Plan</h1>
          <p>View your current plan, billing history and payment methods.</p>
        </div>
      </header>

      <nav className="settings-tabs" aria-label="Billing sections">
        {billingTabs.map((tab) => (
          <button
            key={tab}
            type="button"
            className={tab === "Overview" ? "active" : undefined}
          >
            {tab}
          </button>
        ))}
      </nav>

      <section className="billing-plan-card">
        <span className="settings-icon settings-icon-success" aria-hidden="true">
          BP
        </span>
        <div>
          <span>Current Plan</span>
          <h2>
            Pilot Plan <small>Active</small>
          </h2>
          <p>Manual pilot billing for member retention recovery.</p>
          <button type="button" className="link-button">
            View Plan Details
          </button>
        </div>
        <div className="billing-plan-stat">
          <span>Monthly Price</span>
          <strong>₦120,000</strong>
          <small>/ month</small>
        </div>
        <div className="billing-plan-stat">
          <span>Billing Cycle</span>
          <strong>Monthly</strong>
          <button type="button" className="link-button">
            Change
          </button>
        </div>
        <div className="billing-plan-stat">
          <span>Next Billing Date</span>
          <strong>Jun 5, 2026</strong>
          <small>Manual invoice</small>
        </div>
        <button type="button" className="secondary-button">
          Manage Plan
        </button>
      </section>

      <div className="billing-layout">
        <div className="billing-main">
          <section className="settings-panel usage-panel">
            <header>
              <div>
                <h2>Usage Summary</h2>
                <p>Your usage for the current billing cycle.</p>
              </div>
              <button type="button" className="secondary-button">
                View Usage Details
              </button>
            </header>
            <div className="usage-grid">
              {usageItems.map((item) => (
                <div className="usage-item" key={item.label}>
                  <span>{item.label}</span>
                  <strong>
                    {item.value} / {item.limit}
                  </strong>
                  <div className="usage-progress" aria-hidden="true">
                    <span style={{ width: `${item.percent}%` }} />
                  </div>
                  <small>{item.percent}% used</small>
                </div>
              ))}
            </div>
          </section>

          <section className="settings-panel invoices-panel">
            <header>
              <h2>Recent Invoices</h2>
              <button type="button" className="link-button">
                View All Invoices
              </button>
            </header>
            {recentInvoices.length === 0 ? (
              <section className="empty-state">
                <strong>No invoices yet</strong>
                <span>Your invoices will appear here after billing starts.</span>
              </section>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Invoice</th>
                      <th>Date</th>
                      <th>Billing Period</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentInvoices.map((invoice) => (
                      <tr key={invoice.id}>
                        <td data-label="Invoice">{invoice.id}</td>
                        <td data-label="Date">{invoice.date}</td>
                        <td data-label="Billing Period">{invoice.period}</td>
                        <td data-label="Amount">{invoice.amount}</td>
                        <td data-label="Status">
                          <span className="status status-active">Paid</span>
                        </td>
                        <td data-label="Action">
                          <button type="button" className="link-button">
                            Download
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        <aside className="billing-side">
          <section className="settings-panel compact-billing-card">
            <header>
              <h2>Payment Method</h2>
              <a href={supportMailto} className="secondary-button">
                Contact Support
              </a>
            </header>
            <div className="payment-method-row">
              <strong>Manual bank transfer</strong>
              <span className="status status-active">Primary</span>
              <small>No payment processor connected</small>
            </div>
          </section>

          <section className="settings-panel compact-billing-card">
            <header>
              <h2>Billing Address</h2>
              <button type="button" className="secondary-button">
                Edit
              </button>
            </header>
            <p>
              {organization?.name ?? "Peak Performance Gym"}
              <br />
              12 Freedom Way, Lekki Phase 1
              <br />
              Lagos, Lagos 106104
              <br />
              Nigeria
            </p>
          </section>

          <section className="settings-panel compact-billing-card">
            <header>
              <h2>Billing Summary</h2>
            </header>
            <dl className="billing-summary">
              <div>
                <dt>Subtotal</dt>
                <dd>₦120,000</dd>
              </div>
              <div>
                <dt>VAT (7.5%)</dt>
                <dd>₦9,000</dd>
              </div>
              <div className="billing-total">
                <dt>Total</dt>
                <dd>₦129,000</dd>
              </div>
            </dl>
            <p>Amount is inclusive of VAT.</p>
          </section>

          <section className="settings-panel compact-billing-card">
            <header>
              <h2>Need Help?</h2>
            </header>
            <p>
              If you have any questions about billing or payments, our support
              team is here to help.
            </p>
            <a href={supportMailto} className="secondary-button">
              Contact Support
            </a>
          </section>
        </aside>
      </div>
    </main>
  );
}
