import { Link } from "react-router-dom";

export function AuthBrandPanel() {
  return (
    <section className="auth-brand-panel" aria-label="IronCore Retain">
      <Link to="/login" className="auth-brand">
        <span className="auth-brand-mark">IC</span>
        <span>
          <strong>IronCore</strong>
          <small>Retain</small>
        </span>
      </Link>

      <div className="auth-brand-copy">
        <h2>Recover overdue revenue without losing sight of your members.</h2>
        <p>
          Track renewals, payment proofs, recovery tasks, and member risk from
          one focused workspace.
        </p>
      </div>

      <ul className="auth-feature-list">
        <li>
          <span>MR</span>
          <div>
            <strong>Member recovery</strong>
            <p>Spot overdue and at-risk members before revenue slips away.</p>
          </div>
        </li>
        <li>
          <span>PV</span>
          <div>
            <strong>Payment verification</strong>
            <p>Review submitted proofs and keep renewals auditable.</p>
          </div>
        </li>
        <li>
          <span>WF</span>
          <div>
            <strong>Recovery workflows</strong>
            <p>
              Run consistent follow-up flows through the mock WhatsApp loop.
            </p>
          </div>
        </li>
      </ul>
    </section>
  );
}
