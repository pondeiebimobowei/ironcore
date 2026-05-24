import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { listTasks, updateTask } from "../../features/tasks/api";
import type { Task, TaskStatus, TaskType } from "../../features/tasks/types";
import { useAuth } from "../../lib/auth/AuthContext";
import {
  taskPriorityLabels,
  taskTypeDescriptions,
  taskTypeLabels,
} from "../../lib/validations/task";

type TaskFilter = TaskStatus | "ALL";

const taskTypes = Object.keys(taskTypeLabels) as TaskType[];
const taskStatuses: TaskStatus[] = [
  "OPEN",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
];

const statusLabels: Record<TaskStatus, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

function formatDate(value?: string | null) {
  if (!value) {
    return "No due date";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function memberName(member: { firstName: string; lastName?: string | null }) {
  return [member.firstName, member.lastName].filter(Boolean).join(" ");
}

function daysUntilDue(value?: string | null) {
  if (!value) {
    return null;
  }

  const dueDate = new Date(value);
  const today = new Date();
  dueDate.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  return Math.ceil((dueDate.getTime() - today.getTime()) / 86_400_000);
}

function dueTone(task: Task) {
  if (task.status === "COMPLETED") {
    return "success";
  }

  const days = daysUntilDue(task.dueDate);

  if (days === null) {
    return "muted";
  }

  if (days < 0) {
    return "danger";
  }

  if (days === 0) {
    return "warning";
  }

  return "blue";
}

export function TasksPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [status, setStatus] = useState<TaskFilter>("ALL");
  const [type, setType] = useState<TaskType | "ALL">("ALL");
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");

  const loadData = useCallback(async () => {
    try {
      setLoadError("");
      const taskRows = await listTasks();
      setTasks(taskRows);
    } catch {
      setLoadError("Could not load tasks.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadData();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadData]);

  const visibleTasks = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return tasks.filter((task) => {
      const matchesStatus = status === "ALL" || task.status === status;
      const matchesType = type === "ALL" || task.type === type;
      const matchesSearch =
        !normalizedSearch ||
        task.title.toLowerCase().includes(normalizedSearch) ||
        taskTypeLabels[task.type].toLowerCase().includes(normalizedSearch) ||
        taskTypeDescriptions[task.type]
          .toLowerCase()
          .includes(normalizedSearch) ||
        memberName(task.member).toLowerCase().includes(normalizedSearch) ||
        task.member.phoneNumber.includes(normalizedSearch);

      return matchesStatus && matchesType && matchesSearch;
    });
  }, [search, status, tasks, type]);

  const counts = useMemo(() => {
    const todayTasks = tasks.filter((task) => daysUntilDue(task.dueDate) === 0);

    return {
      mine: tasks.filter((task) => task.assignedTo?.id === user?.id).length,
      overdue: tasks.filter((task) => {
        const days = daysUntilDue(task.dueDate);

        return task.status !== "COMPLETED" && days !== null && days < 0;
      }).length,
      dueToday: todayTasks.length,
      completed: tasks.filter((task) => task.status === "COMPLETED").length,
      all: tasks.length,
    };
  }, [tasks, user?.id]);

  const handleStatusUpdate = async (taskId: string, nextStatus: TaskStatus) => {
    try {
      setActionError("");
      setUpdatingTaskId(taskId);
      const updatedTask = await updateTask(taskId, { status: nextStatus });
      setTasks((currentTasks) =>
        currentTasks.map((task) =>
          task.id === updatedTask.id ? updatedTask : task,
        ),
      );
    } catch {
      setActionError("Could not update the task.");
    } finally {
      setUpdatingTaskId(null);
    }
  };

  return (
    <main className="page tasks-page">
      <header className="page-header">
        <div>
          <div className="breadcrumb">
            <span>Operations</span>
            <span>/</span>
            <span>Tasks</span>
          </div>
          <h1>Tasks</h1>
          <p>View and manage recovery work assigned to you and your team.</p>
        </div>
        <div className="page-actions">
          <button type="button" className="secondary-button">
            Export
          </button>
          <Link to="/tasks/new" className="primary-button">
            New Task
          </Link>
        </div>
      </header>

      <section className="task-metric-grid">
        <article className="task-metric-card active">
          <span className="task-metric-icon task-metric-blue">T</span>
          <div>
            <small>My Tasks</small>
            <strong>{counts.mine}</strong>
            <p>Assigned to me</p>
          </div>
        </article>
        <article className="task-metric-card">
          <span className="task-metric-icon task-metric-danger">!</span>
          <div>
            <small>Overdue</small>
            <strong>{counts.overdue}</strong>
            <p>Need attention</p>
          </div>
        </article>
        <article className="task-metric-card">
          <span className="task-metric-icon task-metric-warning">D</span>
          <div>
            <small>Due Today</small>
            <strong>{counts.dueToday}</strong>
            <p>Current day</p>
          </div>
        </article>
        <article className="task-metric-card">
          <span className="task-metric-icon task-metric-success">✓</span>
          <div>
            <small>Completed</small>
            <strong>{counts.completed}</strong>
            <p>All time</p>
          </div>
        </article>
        <article className="task-metric-card">
          <span className="task-metric-icon task-metric-muted">#</span>
          <div>
            <small>All Tasks</small>
            <strong>{counts.all}</strong>
            <p>Total</p>
          </div>
        </article>
      </section>

      {actionError ? (
        <section className="dashboard-state dashboard-state-error compact-state">
          <strong>{actionError}</strong>
          <span>The task list was left unchanged.</span>
        </section>
      ) : null}

      {isLoading ? (
        <section className="dashboard-state">
          <strong>Loading tasks</strong>
          <span>Finding recovery and verification tasks.</span>
        </section>
      ) : loadError ? (
        <section className="dashboard-state dashboard-state-error">
          <strong>{loadError}</strong>
          <span>Refresh the page or try again after the API is available.</span>
        </section>
      ) : (
        <section className="tasks-layout">
          <div className="tasks-table-card">
            <div className="task-tabs">
              {(["ALL", ...taskStatuses] as TaskFilter[]).map((option) => (
                <button
                  key={option}
                  type="button"
                  className={status === option ? "active" : ""}
                  onClick={() => setStatus(option)}
                >
                  {option === "ALL" ? "All Tasks" : statusLabels[option]}
                </button>
              ))}
            </div>
            <div className="task-table-toolbar">
              <label className="task-search">
                <span className="sr-only">Search tasks</span>
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search by task, member, or phone..."
                />
              </label>
              <label>
                <span className="sr-only">Task type</span>
                <select
                  value={type}
                  onChange={(event) =>
                    setType(event.target.value as TaskType | "ALL")
                  }
                >
                  <option value="ALL">All types</option>
                  {taskTypes.map((taskType) => (
                    <option key={taskType} value={taskType}>
                      {taskTypeLabels[taskType]}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {visibleTasks.length ? (
              <div className="table-wrap">
                <table className="tasks-table">
                  <thead>
                    <tr>
                      <th>Task</th>
                      <th>Type</th>
                      <th>Related To</th>
                      <th>Priority</th>
                      <th>Due Date</th>
                      <th>Assigned To</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleTasks.map((task) => (
                      <tr key={task.id}>
                        <td>
                          <strong>{task.title}</strong>
                          <small>{taskTypeDescriptions[task.type]}</small>
                        </td>
                        <td>
                          <span
                            className={`task-type-pill type-${task.type.toLowerCase()}`}
                          >
                            {task.type.replaceAll("_", " ").toLowerCase()}
                          </span>
                        </td>
                        <td>
                          <Link
                            to={`/members/${task.memberId}`}
                            className="subtle-link"
                          >
                            {memberName(task.member)}
                          </Link>
                          <small>{task.member.phoneNumber}</small>
                        </td>
                        <td>
                          <span
                            className={`priority-pill priority-${task.priority.toLowerCase()}`}
                          >
                            {taskPriorityLabels[task.priority]}
                          </span>
                        </td>
                        <td>
                          <span className={`due-pill due-${dueTone(task)}`}>
                            {formatDate(task.dueDate)}
                          </span>
                        </td>
                        <td>
                          {task.assignedTo?.email ? (
                            <span>{task.assignedTo.email}</span>
                          ) : (
                            <span>Unassigned</span>
                          )}
                        </td>
                        <td>
                          <span
                            className={`status task-status-${task.status.toLowerCase()}`}
                          >
                            {statusLabels[task.status]}
                          </span>
                        </td>
                        <td>
                          <select
                            aria-label={`Update ${taskTypeLabels[task.type]}`}
                            value={task.status}
                            disabled={updatingTaskId === task.id}
                            onChange={(event) =>
                              void handleStatusUpdate(
                                task.id,
                                event.target.value as TaskStatus,
                              )
                            }
                          >
                            {taskStatuses.map((taskStatus) => (
                              <option key={taskStatus} value={taskStatus}>
                                {statusLabels[taskStatus]}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state">
                <strong>No tasks found</strong>
                <span>
                  Try a different filter or create a new recovery task.
                </span>
              </div>
            )}
          </div>
          <aside className="task-filter-panel">
            <header>
              <h2>Filters</h2>
              <button
                type="button"
                className="link-button"
                onClick={() => {
                  setStatus("ALL");
                  setType("ALL");
                  setSearch("");
                }}
              >
                Clear all
              </button>
            </header>
            <label>
              Status
              <select
                value={status}
                onChange={(event) =>
                  setStatus(event.target.value as TaskFilter)
                }
              >
                <option value="ALL">All statuses</option>
                {taskStatuses.map((taskStatus) => (
                  <option key={taskStatus} value={taskStatus}>
                    {statusLabels[taskStatus]}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Type
              <select
                value={type}
                onChange={(event) =>
                  setType(event.target.value as TaskType | "ALL")
                }
              >
                <option value="ALL">All types</option>
                {taskTypes.map((taskType) => (
                  <option key={taskType} value={taskType}>
                    {taskTypeLabels[taskType]}
                  </option>
                ))}
              </select>
            </label>
            <div className="saved-task-views">
              <h3>Saved Views</h3>
              <button type="button" onClick={() => setStatus("OPEN")}>
                <span>Open Tasks</span>
                <strong>
                  {tasks.filter((task) => task.status === "OPEN").length}
                </strong>
              </button>
              <button
                type="button"
                onClick={() => {
                  setStatus("ALL");
                  setType("VERIFY_PAYMENT");
                }}
              >
                <span>Payment Verification</span>
                <strong>
                  {
                    tasks.filter((task) => task.type === "VERIFY_PAYMENT")
                      .length
                  }
                </strong>
              </button>
              <button
                type="button"
                onClick={() => {
                  setStatus("ALL");
                  setType("RESOLVE_OVERDUE_STATUS");
                }}
              >
                <span>Overdue Recovery</span>
                <strong>
                  {
                    tasks.filter(
                      (task) => task.type === "RESOLVE_OVERDUE_STATUS",
                    ).length
                  }
                </strong>
              </button>
            </div>
          </aside>
        </section>
      )}
    </main>
  );
}
