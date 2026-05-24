import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  listWorkflows,
  updateWorkflowStatus,
} from "../../features/workflows/api";
import type {
  WorkflowDefinition,
  WorkflowDefinitionStatus,
} from "../../features/workflows/types";

type WorkflowTab = "ALL" | WorkflowDefinitionStatus;

const tabs: Array<{ label: string; value: WorkflowTab }> = [
  { label: "All Workflows", value: "ALL" },
  { label: "Active", value: "ACTIVE" },
  { label: "Paused", value: "PAUSED" },
  { label: "Drafts", value: "DRAFT" },
];

const categoryTone: Record<string, "green" | "orange" | "purple" | "blue" | "pink" | "slate"> = {
  Renewal: "green",
  Overdue: "orange",
  Reactivation: "purple",
  Retention: "purple",
  Payment: "blue",
  Engagement: "pink",
  Incentive: "pink",
  Onboarding: "blue",
  Upgrade: "orange",
  Upsell: "orange",
  Growth: "blue",
};

function formatDateTime(value: string | null) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatDay(dayOffset: number) {
  if (dayOffset === 0) {
    return "Day 0";
  }

  return dayOffset > 0 ? `Day +${dayOffset}` : `Day ${dayOffset}`;
}

function statusLabel(status: WorkflowDefinitionStatus) {
  return status[0] + status.slice(1).toLowerCase();
}

function roleLabel(role: string | null | undefined) {
  if (!role) {
    return "Team member";
  }

  return role[0] + role.slice(1).toLowerCase();
}

function workflowTone(workflow: WorkflowDefinition) {
  return categoryTone[workflow.category] ?? "slate";
}

function workflowIcon(workflow: WorkflowDefinition) {
  if (workflow.status === "PAUSED") {
    return "P";
  }

  if (workflow.status === "DRAFT") {
    return "E";
  }

  return workflow.category.slice(0, 1).toUpperCase();
}

export function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<WorkflowDefinition[]>([]);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(
    null,
  );
  const [activeTab, setActiveTab] = useState<WorkflowTab>("ACTIVE");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState<WorkflowTab>("ALL");
  const [sortBy, setSortBy] = useState("LAST_RUN");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");

  const load = useCallback(async () => {
    try {
      setLoadError("");
      const data = await listWorkflows();
      setWorkflows(data);
      setSelectedWorkflowId((current) => current ?? data[0]?.id ?? null);
    } catch {
      setLoadError("Could not load workflows.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void load();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [load]);

  const categories = useMemo(
    () => Array.from(new Set(workflows.map((workflow) => workflow.category))),
    [workflows],
  );

  const filteredWorkflows = useMemo(() => {
    const searchText = search.trim().toLowerCase();
    const filtered = workflows.filter((workflow) => {
      const matchesTab = activeTab === "ALL" || workflow.status === activeTab;
      const matchesStatus =
        statusFilter === "ALL" || workflow.status === statusFilter;
      const matchesCategory =
        category === "ALL" || workflow.category === category;
      const matchesSearch =
        !searchText ||
        workflow.name.toLowerCase().includes(searchText) ||
        workflow.description.toLowerCase().includes(searchText);

      return matchesTab && matchesStatus && matchesCategory && matchesSearch;
    });

    return [...filtered].sort((left, right) => {
      if (sortBy === "NAME") {
        return left.name.localeCompare(right.name);
      }

      if (sortBy === "LAST_EDITED") {
        return (
          new Date(right.lastEditedAt).getTime() -
          new Date(left.lastEditedAt).getTime()
        );
      }

      return (
        new Date(right.lastRunAt ?? 0).getTime() -
        new Date(left.lastRunAt ?? 0).getTime()
      );
    });
  }, [activeTab, category, search, sortBy, statusFilter, workflows]);

  const selectedWorkflow =
    workflows.find((workflow) => workflow.id === selectedWorkflowId) ??
    filteredWorkflows[0] ??
    workflows[0] ??
    null;

  const handleStatusChange = async (
    workflow: WorkflowDefinition,
    status: WorkflowDefinitionStatus,
  ) => {
    const previous = workflows;

    setActionError("");
    setWorkflows((current) =>
      current.map((item) =>
        item.id === workflow.id ? { ...item, status } : item,
      ),
    );

    try {
      const updated = await updateWorkflowStatus(workflow.id, status);
      setWorkflows((current) =>
        current.map((item) => (item.id === workflow.id ? updated : item)),
      );
    } catch {
      setWorkflows(previous);
      setActionError("Could not update workflow status.");
    }
  };

  const isDraftView = activeTab === "DRAFT";
  const isPausedView = activeTab === "PAUSED";

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
            {tabs.map((tab) => (
              <button
                className={activeTab === tab.value ? "active" : ""}
                key={tab.value}
                type="button"
                onClick={() => setActiveTab(tab.value)}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          <section className="workflow-filter-bar" aria-label="Workflow tools">
            <label className="workflow-search-field">
              <span>Search workflows</span>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search workflows..."
              />
            </label>
            <label>
              <span>Type</span>
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
              >
                <option value="ALL">All Types</option>
                {categories.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Status</span>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as WorkflowTab)}
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="PAUSED">Paused</option>
                <option value="DRAFT">Draft</option>
              </select>
            </label>
            <label className="workflow-sort-field">
              <span>Sort</span>
              <select
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value)}
              >
                <option value="LAST_RUN">Sort by: Last Run</option>
                <option value="LAST_EDITED">Sort by: Last Updated</option>
                <option value="NAME">Sort by: Name</option>
              </select>
            </label>
            <div className="workflow-view-toggle" aria-hidden="true">
              <span className="active">List</span>
              <span>Grid</span>
            </div>
          </section>

          {loadError || actionError ? (
            <section className="dashboard-state dashboard-state-error compact-state">
              <strong>{loadError || actionError}</strong>
              <span>Refresh the page or try the action again.</span>
            </section>
          ) : null}

          <section className="workflow-table-card">
            <div className="workflow-table-header workflow-table-row">
              <span>Workflow</span>
              <span>Type</span>
              <span>Status</span>
              {isDraftView ? (
                <>
                  <span>Last Edited</span>
                  <span>Edited By</span>
                  <span />
                </>
              ) : (
                <>
                  <span>Members</span>
                  <span>Messages</span>
                  <span>Last Run</span>
                </>
              )}
              <span>Actions</span>
            </div>

            {isLoading ? (
              <div className="workflow-empty-state">Loading workflows...</div>
            ) : null}

            {!isLoading && filteredWorkflows.length === 0 ? (
              <div className="workflow-empty-state">
                No workflows match this view.
              </div>
            ) : null}

            {filteredWorkflows.map((workflow) => {
              const tone = workflowTone(workflow);

              return (
                <button
                  className={`workflow-table-row workflow-row ${
                    selectedWorkflow?.id === workflow.id ? "selected" : ""
                  }`}
                  key={workflow.id}
                  type="button"
                  onClick={() => setSelectedWorkflowId(workflow.id)}
                >
                  <span className="workflow-name-cell">
                    <span className={`workflow-icon ${tone}`}>
                      {workflowIcon(workflow)}
                    </span>
                    <span>
                      <strong>{workflow.name}</strong>
                      <small>{workflow.description}</small>
                    </span>
                  </span>
                  <span>
                    <b className={`type-pill type-${tone}`}>
                      {workflow.category}
                    </b>
                  </span>
                  <span>
                    <b className={`status-pill status-${workflow.status.toLowerCase()}`}>
                      {statusLabel(workflow.status)}
                    </b>
                  </span>
                  {isDraftView ? (
                    <>
                      <span>{formatDateTime(workflow.lastEditedAt)}</span>
                      <span className="workflow-editor-cell">
                        <strong>{workflow.editedBy?.fullName ?? "Unassigned"}</strong>
                        <small>{roleLabel(workflow.editedBy?.role)}</small>
                      </span>
                      <span />
                    </>
                  ) : (
                    <>
                      <span>{workflow.metrics.memberCount}</span>
                      <span>
                        {workflow.metrics.messagesSent}
                        <small>(7d)</small>
                      </span>
                      <span>{formatDateTime(workflow.lastRunAt)}</span>
                    </>
                  )}
                  <span>
                    <span className="row-menu" aria-hidden="true">
                      ...
                    </span>
                  </span>
                </button>
              );
            })}

            <footer className="workflow-table-footer">
              <span>
                Showing {filteredWorkflows.length === 0 ? 0 : 1} to{" "}
                {filteredWorkflows.length} of {filteredWorkflows.length}{" "}
                workflows
              </span>
              <div>
                <button type="button">&lt;</button>
                <button className="active" type="button">
                  1
                </button>
                <button type="button">&gt;</button>
              </div>
            </footer>
          </section>
        </section>

        <aside className="workflow-side-column">
          {selectedWorkflow ? (
            <>
              <section className="workflow-side-card">
                <header>
                  <h2>Selected Workflow</h2>
                  <button type="button">Edit</button>
                </header>
                <div className="selected-workflow-title">
                  <span className={`workflow-icon ${workflowTone(selectedWorkflow)}`}>
                    {workflowIcon(selectedWorkflow)}
                  </span>
                  <div>
                    <h3>{selectedWorkflow.name}</h3>
                    <p>
                      <b className={`status-pill status-${selectedWorkflow.status.toLowerCase()}`}>
                        {statusLabel(selectedWorkflow.status)}
                      </b>
                      <span>
                        {selectedWorkflow.status === "DRAFT"
                          ? `Last edited: ${formatDateTime(selectedWorkflow.lastEditedAt)}`
                          : selectedWorkflow.startedAt
                            ? `Since ${formatDateTime(selectedWorkflow.startedAt)}`
                            : "Not started"}
                      </span>
                    </p>
                  </div>
                </div>
                <p>{selectedWorkflow.description}</p>
                <dl className="workflow-detail-list">
                  <div>
                    <dt>Trigger</dt>
                    <dd>{selectedWorkflow.trigger}</dd>
                  </div>
                  <div>
                    <dt>Goal</dt>
                    <dd>{selectedWorkflow.goal}</dd>
                  </div>
                  <div>
                    <dt>Audience</dt>
                    <dd>{selectedWorkflow.audience}</dd>
                  </div>
                  <div>
                    <dt>Timezone</dt>
                    <dd>{selectedWorkflow.timezone}</dd>
                  </div>
                </dl>
              </section>

              {selectedWorkflow.status === "DRAFT" ? (
                <DraftTipsCard />
              ) : (
                <section className="workflow-side-card">
                  <h2>Workflow Steps</h2>
                  <ol
                    className={`workflow-timeline ${
                      isPausedView ? "workflow-timeline-paused" : ""
                    }`}
                  >
                    {isPausedView ? (
                      <li>
                        <b>Paused</b>
                        <span>Workflow is currently paused</span>
                      </li>
                    ) : null}
                    {selectedWorkflow.steps.map((step) => (
                      <li key={step.id}>
                        <b>{formatDay(step.dayOffset)}</b>
                        <span>{step.label}</span>
                      </li>
                    ))}
                  </ol>
                </section>
              )}

              {selectedWorkflow.status === "DRAFT" ? (
                <HelpCard />
              ) : (
                <section className="workflow-side-card">
                  <h2>
                    Performance <span>(Last 7 Days)</span>
                  </h2>
                  <dl className="performance-list">
                    <div>
                      <dt>Messages Sent</dt>
                      <dd>{selectedWorkflow.metrics.messagesSent}</dd>
                    </div>
                    <div>
                      <dt>Replies Received</dt>
                      <dd>{selectedWorkflow.metrics.repliesReceived}</dd>
                    </div>
                    <div>
                      <dt>Payments Received</dt>
                      <dd>{selectedWorkflow.metrics.paymentsReceived}</dd>
                    </div>
                    <div>
                      <dt>Recovery Rate</dt>
                      <dd
                        className={
                          selectedWorkflow.status === "PAUSED"
                            ? "negative"
                            : "positive"
                        }
                      >
                        {selectedWorkflow.metrics.recoveryRate.toFixed(1)}%
                      </dd>
                    </div>
                  </dl>
                  <button className="full-width-button" type="button">
                    View Full Analytics
                  </button>
                </section>
              )}

              {selectedWorkflow.status !== "DRAFT" ? (
                <section className="workflow-side-card workflow-status-actions">
                  <button
                    type="button"
                    onClick={() =>
                      void handleStatusChange(
                        selectedWorkflow,
                        selectedWorkflow.status === "ACTIVE"
                          ? "PAUSED"
                          : "ACTIVE",
                      )
                    }
                  >
                    {selectedWorkflow.status === "ACTIVE"
                      ? "Pause workflow"
                      : "Activate workflow"}
                  </button>
                </section>
              ) : null}
            </>
          ) : (
            <section className="workflow-side-card">
              <h2>Selected Workflow</h2>
              <p>Select a workflow to review its details.</p>
            </section>
          )}
        </aside>
      </div>
    </main>
  );
}

function DraftTipsCard() {
  return (
    <section className="workflow-side-card workflow-tip-card">
      <h2>Draft Workflow Tips</h2>
      <div className="workflow-tip-list">
        <article>
          <span className="summary-icon purple">E</span>
          <div>
            <strong>Continue editing</strong>
            <p>Click Edit to continue building your workflow.</p>
          </div>
        </article>
        <article>
          <span className="summary-icon slate">V</span>
          <div>
            <strong>Review before activating</strong>
            <p>Test your workflow to ensure it works as expected.</p>
          </div>
        </article>
        <article>
          <span className="summary-icon green">A</span>
          <div>
            <strong>Activate when ready</strong>
            <p>Once published, your workflow will start running automatically.</p>
          </div>
        </article>
      </div>
    </section>
  );
}

function HelpCard() {
  return (
    <section className="workflow-side-card workflow-help-card">
      <h2>Need help?</h2>
      <p>Learn how to create effective workflows.</p>
      <button className="full-width-button" type="button">
        View Help Center
      </button>
    </section>
  );
}
