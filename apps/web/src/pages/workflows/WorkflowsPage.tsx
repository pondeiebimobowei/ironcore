import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  listWorkflows,
  updateWorkflowStatus,
} from "../../features/workflows/api";
import { defaultWorkflowTemplates } from "../../features/workflows/defaults";
import type {
  WorkflowStatus,
  WorkflowTemplate,
} from "../../features/workflows/types";

type WorkflowRow = {
  id: string;
  name: string;
  description: string;
  type: string;
  status: "Active" | "Paused" | "Draft";
  members: number;
  messages: number;
  lastRun: string;
  accent: "green" | "orange" | "purple" | "slate";
};

const workflowRows: WorkflowRow[] = [
  {
    id: "renewal-recovery",
    name: "Renewal Recovery",
    description: "Reminder sequence for upcoming expirations",
    type: "Renewal",
    status: "Active",
    members: 142,
    messages: 189,
    lastRun: "May 19, 2025 08:15 AM",
    accent: "green",
  },
  {
    id: "overdue-follow-up",
    name: "Overdue Follow-up",
    description: "Follow-up sequence for overdue members",
    type: "Overdue",
    status: "Active",
    members: 98,
    messages: 126,
    lastRun: "May 19, 2025 09:45 AM",
    accent: "orange",
  },
  {
    id: "reactivation-campaign",
    name: "Reactivation Campaign",
    description: "Win-back sequence for inactive/churned members",
    type: "Reactivation",
    status: "Active",
    members: 28,
    messages: 27,
    lastRun: "May 18, 2025 06:30 PM",
    accent: "purple",
  },
  {
    id: "welcome-sequence",
    name: "Welcome Sequence",
    description: "Onboarding messages for new members",
    type: "Onboarding",
    status: "Paused",
    members: 0,
    messages: 0,
    lastRun: "May 10, 2025 11:20 AM",
    accent: "slate",
  },
  {
    id: "vip-retention",
    name: "VIP Retention",
    description: "Special sequence for high value members",
    type: "Retention",
    status: "Draft",
    members: 0,
    messages: 0,
    lastRun: "-",
    accent: "slate",
  },
];

const workflowSteps = [
  ["Day -5", "Reminder: 5 days before expiry"],
  ["Day 0", "Expiry day notice"],
  ["Day +3", "Overdue follow-up"],
  ["Day +7", "Escalation message"],
  ["Day +14", "Final reminder & offer"],
];

function formatTemplateName(template: WorkflowTemplate) {
  return template.name
    .split(" ")
    .map((word) => word[0]?.toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

export function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<WorkflowTemplate[]>(
    defaultWorkflowTemplates,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [updatingWorkflowId, setUpdatingWorkflowId] = useState<string | null>(
    null,
  );
  const [selectedWorkflowId, setSelectedWorkflowId] =
    useState("renewal-recovery");

  const selectedWorkflow =
    workflowRows.find((workflow) => workflow.id === selectedWorkflowId) ??
    workflowRows[0];

  const loadWorkflows = useCallback(async () => {
    try {
      setLoadError("");
      setWorkflows(await listWorkflows());
    } catch {
      setLoadError("Could not load workflow settings.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadWorkflows();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadWorkflows]);

  const counts = useMemo(
    () => ({
      active: workflows.filter((workflow) => workflow.status === "ACTIVE")
        .length,
      paused: workflows.filter((workflow) => workflow.status === "PAUSED")
        .length,
      messages: 342,
      members: 268,
    }),
    [workflows],
  );

  const handleStatusChange = async (
    workflowId: string,
    status: WorkflowStatus,
  ) => {
    const previousWorkflows = workflows;

    setWorkflows((current) =>
      current.map((workflow) =>
        workflow.id === workflowId ? { ...workflow, status } : workflow,
      ),
    );
    setUpdatingWorkflowId(workflowId);
    setActionError("");

    try {
      const updatedWorkflow = await updateWorkflowStatus(workflowId, status);
      setWorkflows((current) =>
        current.map((workflow) =>
          workflow.id === workflowId ? updatedWorkflow : workflow,
        ),
      );
    } catch {
      setWorkflows(previousWorkflows);
      setActionError("Could not update the workflow status.");
    } finally {
      setUpdatingWorkflowId(null);
    }
  };

  return (
    <main className="page workflows-page">
      <div className="workflow-dashboard-layout">
        <section className="workflow-main-column">
          <header className="page-header workflow-page-header">
            <div>
              <h1>Workflows</h1>
              <p>
                Automated recovery sequences that help you recover recurring
                revenue.
              </p>
            </div>
            <Link className="button-link workflow-new-button" to="/workflows/new">
              <span aria-hidden="true">+</span>
              New Workflow
            </Link>
          </header>

          <nav className="workflow-tabs" aria-label="Workflow filters">
            <button className="active" type="button">
              All Workflows
            </button>
            <button type="button">Active</button>
            <button type="button">Paused</button>
            <button type="button">Drafts</button>
          </nav>

          <section className="workflow-metric-grid">
            <article className="workflow-metric-card">
              <span className="workflow-icon green">R</span>
              <div>
                <small>Active Workflows</small>
                <strong>{counts.active + 1}</strong>
                <span>Currently running</span>
              </div>
            </article>
            <article className="workflow-metric-card">
              <span className="workflow-icon purple">M</span>
              <div>
                <small>Messages Sent (7d)</small>
                <strong>{counts.messages}</strong>
                <span className="metric-positive">+24% vs last 7 days</span>
              </div>
            </article>
            <article className="workflow-metric-card">
              <span className="workflow-icon orange">S</span>
              <div>
                <small>Members in Sequence</small>
                <strong>{counts.members}</strong>
                <span>Across all workflows</span>
              </div>
            </article>
            <article className="workflow-metric-card">
              <span className="workflow-icon blue">%</span>
              <div>
                <small>Recovery Rate (7d)</small>
                <strong>18.6%</strong>
                <span className="metric-positive">+3.2% vs last 7 days</span>
              </div>
            </article>
          </section>

          {loadError || actionError ? (
            <section className="dashboard-state dashboard-state-error compact-state">
              <strong>{loadError || actionError}</strong>
              <span>
                The workflow page is showing the latest local recovery sequence
                view.
              </span>
            </section>
          ) : null}

          <section className="workflow-table-card">
            <div className="workflow-table-header workflow-table-row">
              <span>Workflow</span>
              <span>Type</span>
              <span>Status</span>
              <span>Members</span>
              <span>Messages</span>
              <span>Last Run</span>
              <span>Actions</span>
            </div>
            {workflowRows.map((workflow) => (
              <button
                className={`workflow-table-row workflow-row ${
                  selectedWorkflowId === workflow.id ? "selected" : ""
                }`}
                key={workflow.id}
                type="button"
                onClick={() => setSelectedWorkflowId(workflow.id)}
              >
                <span className="workflow-name-cell">
                  <span className={`workflow-icon ${workflow.accent}`}>
                    {workflow.accent === "green"
                      ? "R"
                      : workflow.accent === "orange"
                        ? "!"
                        : workflow.accent === "purple"
                          ? "W"
                          : "D"}
                  </span>
                  <span>
                    <strong>{workflow.name}</strong>
                    <small>{workflow.description}</small>
                  </span>
                </span>
                <span>
                  <b className={`type-pill type-${workflow.accent}`}>
                    {workflow.type}
                  </b>
                </span>
                <span>
                  <b className={`status-pill status-${workflow.status.toLowerCase()}`}>
                    {workflow.status}
                  </b>
                </span>
                <span>{workflow.members}</span>
                <span>
                  {workflow.messages}
                  <small>(7d)</small>
                </span>
                <span>{workflow.lastRun}</span>
                <span>
                  <span className="row-menu" aria-hidden="true">
                    ...
                  </span>
                </span>
              </button>
            ))}
            <footer className="workflow-table-footer">
              <span>Showing 1 to 5 of 5 workflows</span>
              <div>
                <button type="button">&lt;</button>
                <button className="active" type="button">
                  1
                </button>
                <button type="button">&gt;</button>
              </div>
            </footer>
          </section>

          {isLoading ? (
            <section className="dashboard-state compact-state">
              <strong>Loading workflow settings</strong>
              <span>Fetching recovery sequence status from the API.</span>
            </section>
          ) : (
            <section className="workflow-template-strip">
              {workflows.map((workflow) => {
                const nextStatus =
                  workflow.status === "ACTIVE" ? "PAUSED" : "ACTIVE";

                return (
                  <article key={workflow.id}>
                    <div>
                      <strong>{formatTemplateName(workflow)}</strong>
                      <span>{workflow.steps.length} MVP sequence step</span>
                    </div>
                    <button
                      type="button"
                      disabled={updatingWorkflowId === workflow.id}
                      onClick={() => void handleStatusChange(workflow.id, nextStatus)}
                    >
                      {updatingWorkflowId === workflow.id
                        ? "Updating..."
                        : workflow.status === "ACTIVE"
                          ? "Pause"
                          : "Activate"}
                    </button>
                  </article>
                );
              })}
            </section>
          )}
        </section>

        <aside className="workflow-side-column">
          <section className="workflow-side-card">
            <header>
              <h2>Selected Workflow</h2>
              <button type="button">Edit</button>
            </header>
            <div className="selected-workflow-title">
              <span className={`workflow-icon ${selectedWorkflow.accent}`}>
                R
              </span>
              <div>
                <h3>{selectedWorkflow.name}</h3>
                <p>
                  <b className="status-pill status-active">Active</b>
                  <span>Since May 1, 2025</span>
                </p>
              </div>
            </div>
            <p>
              Automated reminders for members whose memberships are about to
              expire.
            </p>
            <dl className="workflow-detail-list">
              <div>
                <dt>Trigger</dt>
                <dd>Membership expires in 5 days</dd>
              </div>
              <div>
                <dt>Goal</dt>
                <dd>Prevent overdue & reduce churn</dd>
              </div>
              <div>
                <dt>Audience</dt>
                <dd>Expiring soon members</dd>
              </div>
              <div>
                <dt>Timezone</dt>
                <dd>Africa/Lagos (WAT)</dd>
              </div>
            </dl>
          </section>

          <section className="workflow-side-card">
            <h2>Workflow Steps</h2>
            <ol className="workflow-timeline">
              {workflowSteps.map(([day, text]) => (
                <li key={day}>
                  <b>{day}</b>
                  <span>{text}</span>
                </li>
              ))}
            </ol>
          </section>

          <section className="workflow-side-card">
            <h2>
              Performance <span>(Last 7 Days)</span>
            </h2>
            <dl className="performance-list">
              <div>
                <dt>Messages Sent</dt>
                <dd>189</dd>
              </div>
              <div>
                <dt>Replies Received</dt>
                <dd>42</dd>
              </div>
              <div>
                <dt>Payments Received</dt>
                <dd>26</dd>
              </div>
              <div>
                <dt>Recovery Rate</dt>
                <dd className="positive">13.8%</dd>
              </div>
            </dl>
            <button className="full-width-button" type="button">
              View Full Analytics
            </button>
          </section>
        </aside>
      </div>
    </main>
  );
}
