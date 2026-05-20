import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";

type WizardStep = 1 | 2 | 3 | 4;

const stepLabels = [
  "Workflow Details",
  "Trigger",
  "Actions",
  "Review & Activate",
];

const triggers = [
  {
    name: "Member Inactivity",
    detail: "Trigger when a member has been inactive for a set number of days.",
    icon: "P",
    tone: "purple",
  },
  {
    name: "Membership Expiring",
    detail: "Trigger when a member's membership is about to expire.",
    icon: "C",
    tone: "green",
  },
  {
    name: "Payment Failed",
    detail: "Trigger when a member's payment fails or is declined.",
    icon: "!",
    tone: "orange",
  },
  {
    name: "Tag Added",
    detail: "Trigger when a specific tag is added to a member.",
    icon: "T",
    tone: "blue",
  },
  {
    name: "Custom Date",
    detail: "Trigger on a specific date and time.",
    icon: "D",
    tone: "pink",
  },
];

const workflowActions = [
  {
    title: "Send Email",
    subtitle: "Re-engagement Email - Inactive Members",
    timing: "Immediate",
    description: "Send a personalized re-engagement email to the member.",
    icon: "M",
    tone: "green",
  },
  {
    title: "Send SMS",
    subtitle: "Friendly Reminder SMS",
    timing: "After 2 days",
    description: "Send an SMS reminder if the member has not re-engaged.",
    icon: "S",
    tone: "orange",
  },
];

function WizardProgress({ step }: { step: WizardStep }) {
  return (
    <ol className="workflow-wizard-progress">
      {stepLabels.map((label, index) => {
        const position = (index + 1) as WizardStep;
        const isComplete = position < step;
        const isActive = position === step;

        return (
          <li
            className={`${isComplete ? "complete" : ""} ${
              isActive ? "active" : ""
            }`}
            key={label}
          >
            <span>{isComplete ? "OK" : position}</span>
            <small>{label}</small>
          </li>
        );
      })}
    </ol>
  );
}

function WorkflowSummary({ review = false }: { review?: boolean }) {
  return (
    <aside className="workflow-summary-card">
      <h2>Workflow Summary</h2>
      <dl>
        <div>
          <dt>Workflow Name</dt>
          <dd>Inactive Members - Re-engagement Campaign</dd>
        </div>
        <div>
          <dt>Category</dt>
          <dd>
            <span className="summary-chip purple">Re-engagement</span>
          </dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>
            <span className="summary-chip green">
              {review ? "Active (On creation)" : "Active"}
            </span>
          </dd>
        </div>
        <div>
          <dt>Owner</dt>
          <dd>John Adebayo</dd>
        </div>
      </dl>
      <div className="summary-divider" />
      <div className="summary-block">
        <span className="summary-icon purple">P</span>
        <div>
          <strong>Member Inactivity</strong>
          <span>After 30 days of inactivity</span>
        </div>
      </div>
      <div className="summary-actions">
        <span>Actions{review ? " (2)" : ""}</span>
        {workflowActions.map((action) => (
          <div className="summary-block compact" key={action.title}>
            <span className={`summary-icon ${action.tone}`}>{action.icon}</span>
            <div>
              <strong>{action.title}</strong>
              <span>{action.timing}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="summary-reach">
        <span>Estimated Reach</span>
        <strong>~ 126 members</strong>
      </div>
      <div className="workflow-info-box">
        <strong>{review ? "What happens next?" : "How it works"}</strong>
        <p>
          {review
            ? "Once activated, this workflow will start running automatically based on the trigger conditions."
            : "This workflow will automatically run when the trigger conditions are met and will perform the actions in the order you define."}
        </p>
      </div>
    </aside>
  );
}

function DetailsStep({ compact = false }: { compact?: boolean }) {
  return (
    <section className="workflow-builder-card">
      <h2>1. Workflow Details</h2>
      <div className="workflow-form-grid">
        <label>
          <span>Workflow Name *</span>
          <input defaultValue="Inactive Members - Re-engagement Campaign" />
          <small>Give your workflow a descriptive name.</small>
        </label>
        <label className="wide">
          <span>Workflow Description (Optional)</span>
          <textarea defaultValue="Automated campaign to re-engage members who haven't visited in 30 days." />
          <small>69 / 255</small>
        </label>
        <label>
          <span>Workflow Category *</span>
          <select defaultValue="Re-engagement">
            <option>Re-engagement</option>
          </select>
        </label>
        <label>
          <span>Workflow Owner *</span>
          <select defaultValue="John Adebayo (You)">
            <option>John Adebayo (You)</option>
          </select>
        </label>
        <label className="workflow-switch-field">
          <span>Workflow Status</span>
          <span className="workflow-switch">
            <span />
          </span>
          <strong>Active (On creation)</strong>
        </label>
      </div>
      {compact ? null : <TriggerCards compact />}
    </section>
  );
}

function TriggerCards({ compact = false }: { compact?: boolean }) {
  return (
    <section className={compact ? "trigger-inline-section" : ""}>
      <h2>2. Select Trigger</h2>
      <p>Choose the event that will start this workflow.</p>
      <div className="trigger-card-grid">
        {triggers.map((trigger, index) => (
          <article
            className={`trigger-card ${index === 0 ? "selected" : ""}`}
            key={trigger.name}
          >
            <span className={`summary-icon ${trigger.tone}`}>
              {trigger.icon}
            </span>
            <div>
              <strong>{trigger.name}</strong>
              <p>{trigger.detail}</p>
            </div>
          </article>
        ))}
      </div>
      <div className="trigger-settings-grid">
        <label>
          <span>Inactivity Period *</span>
          <div className="input-with-unit">
            <input defaultValue="30" />
            <b>days</b>
          </div>
        </label>
        <label>
          <span>Runs</span>
          <select defaultValue="Multiple times">
            <option>Multiple times</option>
          </select>
        </label>
        <label>
          <span>Re-entry</span>
          <select defaultValue="After 7 days">
            <option>After 7 days</option>
          </select>
        </label>
      </div>
    </section>
  );
}

function TriggerStep() {
  return (
    <section className="workflow-builder-card workflow-trigger-layout">
      <div className="trigger-sidebar">
        <h2>2. Select Trigger</h2>
        <p>Choose the event that will start this workflow.</p>
        {triggers.map((trigger, index) => (
          <button
            className={`trigger-option ${index === 0 ? "selected" : ""}`}
            key={trigger.name}
            type="button"
          >
            <span className={`summary-icon ${trigger.tone}`}>
              {trigger.icon}
            </span>
            <span>
              <strong>{trigger.name}</strong>
              <small>{trigger.detail}</small>
            </span>
            {index === 0 ? <b>OK</b> : null}
          </button>
        ))}
      </div>
      <div className="trigger-detail-panel">
        <header>
          <span className="summary-icon purple large">P</span>
          <div>
            <h3>Member Inactivity</h3>
            <p>
              This workflow will start when a member has not checked in for a
              specified number of days.
            </p>
          </div>
        </header>
        <label>
          <span>Inactivity Period *</span>
          <div className="input-with-unit">
            <input defaultValue="30" />
            <b>days</b>
          </div>
          <small>
            Member must be inactive for this number of days to trigger the
            workflow.
          </small>
        </label>
        <label>
          <span>Runs</span>
          <select defaultValue="Multiple times">
            <option>Multiple times</option>
          </select>
          <small>Choose how many times this workflow can be triggered.</small>
        </label>
        <label>
          <span>Re-entry</span>
          <select defaultValue="After 7 days">
            <option>After 7 days</option>
          </select>
          <small>
            Allow this workflow to trigger again after the member becomes active
            and inactive for the specified number of days.
          </small>
        </label>
        <div className="trigger-condition-box">
          <strong>Additional Conditions (Optional)</strong>
          <span>Refine when this trigger should run.</span>
          <button type="button">+ Add Condition</button>
        </div>
        <div className="workflow-info-box">
          <strong>Example</strong>
          <p>
            This trigger will start the workflow when a member has not checked
            in for 30 days. It can run multiple times, with a 7-day wait after
            the member becomes active.
          </p>
        </div>
      </div>
    </section>
  );
}

function ActionsStep() {
  return (
    <section className="workflow-builder-card">
      <header className="workflow-section-header">
        <div>
          <h2>3. Configure Actions</h2>
          <p>
            Choose the actions this workflow will perform when the trigger
            conditions are met.
          </p>
        </div>
        <button type="button">+ Add Action</button>
      </header>
      <div className="workflow-action-list">
        {workflowActions.map((action) => (
          <article className="workflow-action-card" key={action.title}>
            <span className="drag-handle">::</span>
            <span className={`summary-icon ${action.tone}`}>{action.icon}</span>
            <div>
              <strong>{action.title}</strong>
              <span>{action.subtitle}</span>
              <small>{action.timing}</small>
            </div>
            <p>{action.description}</p>
            <button type="button" aria-label={`Edit ${action.title}`}>
              Edit
            </button>
            <button type="button" aria-label={`Delete ${action.title}`}>
              Del
            </button>
          </article>
        ))}
        <button className="add-action-row" type="button">
          <span>+</span>
          <strong>Add another action</strong>
          <small>Choose an action to add to this workflow.</small>
        </button>
      </div>
      <div className="action-settings-grid">
        <label>
          <span>Action Execution</span>
          <select defaultValue="Stop workflow if an action fails">
            <option>Stop workflow if an action fails</option>
          </select>
          <small>Choose how the workflow should behave if an action fails.</small>
        </label>
        <label>
          <span>Time Zone</span>
          <select defaultValue="(GMT+01:00) West Africa Time (Lagos)">
            <option>(GMT+01:00) West Africa Time (Lagos)</option>
          </select>
          <small>All scheduled actions will run based on this time zone.</small>
        </label>
      </div>
      <div className="workflow-info-box">
        <strong>About Actions</strong>
        <p>
          Actions will be executed in the order they appear above. Reordering is
          intentionally deferred until the full workflow builder is in scope.
        </p>
      </div>
    </section>
  );
}

function ReviewStep() {
  return (
    <section className="workflow-builder-card review-card">
      <h2>4. Review & Activate</h2>
      <p>Review your workflow configuration before activating it.</p>
      <ReviewSection icon="D" tone="green" title="Workflow Details">
        <div className="review-grid">
          <span>
            <small>Workflow Name</small>
            Inactive Members - Re-engagement Campaign
          </span>
          <span>
            <small>Category</small>
            <b className="summary-chip purple">Re-engagement</b>
          </span>
          <span className="wide">
            <small>Description</small>
            Automated campaign to re-engage members who haven't visited in 30
            days.
          </span>
          <span>
            <small>Status</small>
            <b className="summary-chip green">Active (On creation)</b>
          </span>
          <span>
            <small>Owner</small>
            John Adebayo
          </span>
        </div>
      </ReviewSection>
      <ReviewSection icon="P" tone="purple" title="Trigger">
        <div className="review-grid">
          <span>
            <small>Trigger Type</small>
            Member Inactivity
          </span>
          <span>
            <small>Runs</small>
            Multiple times
          </span>
          <span>
            <small>Inactivity Period</small>
            30 days
          </span>
          <span>
            <small>Re-entry</small>
            After 7 days
          </span>
        </div>
      </ReviewSection>
      <ReviewSection icon="A" tone="orange" title="Actions">
        <div className="review-action-list">
          {workflowActions.map((action, index) => (
            <div key={action.title}>
              <b>{index + 1}</b>
              <span className={`summary-icon ${action.tone}`}>{action.icon}</span>
              <strong>
                {action.title} <span>- {action.subtitle}</span>
              </strong>
              <small>{action.timing}</small>
              <p>{action.description}</p>
            </div>
          ))}
        </div>
      </ReviewSection>
      <ReviewSection icon="S" tone="blue" title="Settings">
        <div className="review-grid">
          <span>
            <small>Action Execution</small>
            Stop workflow if an action fails
          </span>
          <span>
            <small>Time Zone</small>
            (GMT+01:00) West Africa Time (Lagos)
          </span>
        </div>
      </ReviewSection>
    </section>
  );
}

function ReviewSection({
  children,
  icon,
  title,
  tone,
}: {
  children: ReactNode;
  icon: string;
  title: string;
  tone: string;
}) {
  return (
    <article className="review-section">
      <span className={`summary-icon ${tone}`}>{icon}</span>
      <div>
        <header>
          <h3>{title}</h3>
          <button type="button">Edit</button>
        </header>
        {children}
      </div>
    </article>
  );
}

function SuccessView() {
  return (
    <main className="page workflow-success-page">
      <div className="success-burst" aria-hidden="true">
        <span />
      </div>
      <h1>Workflow Created Successfully!</h1>
      <p>Your workflow is ready and will start running based on the trigger conditions.</p>
      <section className="workflow-success-card">
        <h2>What happens next?</h2>
        {[
          ["A", "Workflow is Active", "This workflow is now active and will run automatically."],
          [
            "M",
            "Members will be evaluated",
            "Members who meet the trigger conditions will be processed.",
          ],
          [
            "B",
            "Actions will be performed",
            "The defined actions will be executed in the order you set.",
          ],
        ].map(([icon, title, text]) => (
          <article key={title}>
            <span className="summary-icon green">{icon}</span>
            <div>
              <strong>{title}</strong>
              <p>{text}</p>
            </div>
            <b>OK</b>
          </article>
        ))}
      </section>
      <div className="workflow-success-actions">
        <Link className="button-link" to="/workflows">
          View Workflows
        </Link>
        <Link className="secondary-button" to="/workflows/new">
          Create Another Workflow
        </Link>
        <Link className="secondary-button" to="/">
          Go to Dashboard
        </Link>
      </div>
    </main>
  );
}

export function CreateWorkflowPage() {
  const [step, setStep] = useState<WizardStep>(1);
  const [isSuccess, setIsSuccess] = useState(false);
  const navigate = useNavigate();

  const stepContent = useMemo(() => {
    if (step === 1) {
      return <DetailsStep />;
    }

    if (step === 2) {
      return <TriggerStep />;
    }

    if (step === 3) {
      return <ActionsStep />;
    }

    return <ReviewStep />;
  }, [step]);

  const nextLabel =
    step === 1
      ? "Next: Set Trigger"
      : step === 2
        ? "Next: Set Actions"
        : step === 3
          ? "Next: Review & Activate"
          : "Activate Workflow";

  const handleNext = () => {
    if (step < 4) {
      setStep((current) => (current + 1) as WizardStep);
      return;
    }

    setIsSuccess(true);
  };

  if (isSuccess) {
    return <SuccessView />;
  }

  return (
    <main className="page create-workflow-page">
      <header className="workflow-create-header">
        <div>
          <nav>
            <Link to="/workflows">Workflows</Link>
            <span>/</span>
            <span>Create New Workflow</span>
          </nav>
          <h1>Create New Workflow</h1>
          <p>
            Set up an automated workflow to engage members and drive retention.
          </p>
        </div>
      </header>
      <WizardProgress step={step} />
      <div className="workflow-create-layout">
        {stepContent}
        <WorkflowSummary review={step === 4} />
      </div>
      <footer className="workflow-builder-footer">
        <button
          type="button"
          onClick={() => {
            if (step === 1) {
              navigate("/workflows");
              return;
            }

            setStep((current) => (current - 1) as WizardStep);
          }}
        >
          Back
        </button>
        <div>
          {step === 1 ? (
            <button type="button" onClick={() => navigate("/workflows")}>
              Cancel
            </button>
          ) : null}
          <button type="button">Save as Draft</button>
          <button className="primary-button" type="button" onClick={handleNext}>
            {nextLabel}
          </button>
        </div>
      </footer>
    </main>
  );
}
