import { Link } from "react-router-dom";
import type { Task, TaskType } from "../../features/tasks/types";
import {
  taskTypeDescriptions,
  taskTypeLabels,
} from "../../lib/validations/task";

type Urgency = "dueNow" | "soon" | "later" | "unscheduled";

type UrgencyGroup = {
  key: Urgency;
  title: string;
  detail: string;
  tasks: Task[];
};

type RecoveryQueueProps = {
  tasks: Task[];
  completingTaskId?: string | null;
  onCompleteTask: (taskId: string) => Promise<void>;
};

const urgentTaskTypes = new Set<TaskType>([
  "VERIFY_PAYMENT",
  "RESOLVE_OVERDUE_STATUS",
  "REVIEW_AT_RISK_MEMBER",
]);

function memberName(task: Task) {
  return [task.member.firstName, task.member.lastName].filter(Boolean).join(" ");
}

function daysUntilDue(dueDate: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);

  return Math.ceil((due.getTime() - today.getTime()) / 86_400_000);
}

function urgencyForTask(task: Task): Urgency {
  if (!task.dueDate) {
    return urgentTaskTypes.has(task.type) ? "dueNow" : "unscheduled";
  }

  const days = daysUntilDue(task.dueDate);

  if (days <= 0) {
    return "dueNow";
  }

  if (days <= 2) {
    return "soon";
  }

  return "later";
}

function dueLabel(task: Task) {
  if (!task.dueDate) {
    return "No due date";
  }

  const days = daysUntilDue(task.dueDate);

  if (days < 0) {
    return `${Math.abs(days)}d overdue`;
  }

  if (days === 0) {
    return "Due today";
  }

  if (days === 1) {
    return "Due tomorrow";
  }

  return `Due in ${days}d`;
}

function recoveryLink(task: Task) {
  if (task.type === "VERIFY_PAYMENT") {
    return {
      to: `/payments/record?memberId=${task.memberId}`,
      label: "Record payment",
    };
  }

  return {
    to: `/members/${task.memberId}`,
    label: "Open member",
  };
}

function sortTasks(tasks: Task[]) {
  return [...tasks].sort((first, second) => {
    const firstTime = first.dueDate
      ? new Date(first.dueDate).getTime()
      : Number.POSITIVE_INFINITY;
    const secondTime = second.dueDate
      ? new Date(second.dueDate).getTime()
      : Number.POSITIVE_INFINITY;

    if (firstTime !== secondTime) {
      return firstTime - secondTime;
    }

    return (
      new Date(first.createdAt).getTime() -
      new Date(second.createdAt).getTime()
    );
  });
}

export function RecoveryQueue({
  tasks,
  completingTaskId,
  onCompleteTask,
}: RecoveryQueueProps) {
  const groups: UrgencyGroup[] = [
    {
      key: "dueNow",
      title: "Due now",
      detail: "Overdue, due today, or revenue-blocking tasks.",
      tasks: [],
    },
    {
      key: "soon",
      title: "Next 48 hours",
      detail: "Near-term recovery work to keep moving.",
      tasks: [],
    },
    {
      key: "later",
      title: "Later",
      detail: "Scheduled follow-up beyond the next two days.",
      tasks: [],
    },
    {
      key: "unscheduled",
      title: "Unscheduled",
      detail: "Open follow-ups without a due date.",
      tasks: [],
    },
  ];

  const groupMap = new Map(groups.map((group) => [group.key, group]));

  for (const task of tasks) {
    groupMap.get(urgencyForTask(task))?.tasks.push(task);
  }

  if (tasks.length === 0) {
    return (
      <section className="empty-state">
        <strong>No open recovery tasks</strong>
        <span>Generated payment and overdue tasks will appear here.</span>
      </section>
    );
  }

  return (
    <section className="recovery-queue">
      {groups.map((group) => (
        <div className="task-group" key={group.key}>
          <div className="task-group-header">
            <div>
              <h2>{group.title}</h2>
              <p>{group.detail}</p>
            </div>
            <strong>{group.tasks.length}</strong>
          </div>
          {group.tasks.length === 0 ? (
            <p className="task-group-empty">No tasks in this group.</p>
          ) : (
            <div className="task-list">
              {sortTasks(group.tasks).map((task) => {
                const action = recoveryLink(task);

                return (
                  <article className="task-card" key={task.id}>
                    <div>
                      <div className="task-card-header">
                        <strong>{taskTypeLabels[task.type]}</strong>
                        <span
                          className={`status status-${task.member.status.toLowerCase()}`}
                        >
                          {task.member.status.replaceAll("_", " ")}
                        </span>
                      </div>
                      <p>{taskTypeDescriptions[task.type]}</p>
                    </div>
                    <div className="task-card-meta">
                      <div>
                        <span>Member</span>
                        <Link
                          to={`/members/${task.memberId}`}
                          className="row-link"
                        >
                          {memberName(task)}
                        </Link>
                        <small>{task.member.phoneNumber}</small>
                      </div>
                      <div>
                        <span>Due</span>
                        <strong>{dueLabel(task)}</strong>
                        <small>
                          {task.assignedTo?.email
                            ? `Assigned to ${task.assignedTo.email}`
                            : "Unassigned"}
                        </small>
                      </div>
                      <Link to={action.to} className="button-link">
                        {action.label}
                      </Link>
                      <button
                        type="button"
                        className="secondary-button"
                        disabled={Boolean(completingTaskId)}
                        onClick={() => void onCompleteTask(task.id)}
                      >
                        {completingTaskId === task.id
                          ? "Completing..."
                          : "Complete"}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </section>
  );
}
