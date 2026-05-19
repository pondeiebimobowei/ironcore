import { useCallback, useEffect, useMemo, useState } from "react";
import { RecoveryQueue } from "../../components/tasks";
import { completeTask, listOpenTasks } from "../../features/tasks/api";
import type { Task } from "../../features/tasks/types";

export function RecoveryQueuePage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);

  const loadTasks = useCallback(async () => {
    try {
      setLoadError("");
      setTasks(await listOpenTasks());
    } catch {
      setLoadError("Could not load the recovery queue.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadTasks();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadTasks]);

  const handleCompleteTask = useCallback(async (taskId: string) => {
    try {
      setActionError("");
      setCompletingTaskId(taskId);
      await completeTask(taskId);
      setTasks((currentTasks) =>
        currentTasks.filter((task) => task.id !== taskId),
      );
    } catch {
      setActionError("Could not complete the task.");
    } finally {
      setCompletingTaskId(null);
    }
  }, []);

  const counts = useMemo(
    () => ({
      open: tasks.length,
      payments: tasks.filter((task) => task.type === "VERIFY_PAYMENT").length,
      overdue: tasks.filter((task) =>
        [
          "RESOLVE_OVERDUE_STATUS",
          "REVIEW_AT_RISK_MEMBER",
          "REACTIVATION",
        ].includes(task.type),
      ).length,
    }),
    [tasks],
  );

  return (
    <main className="page">
      <header className="page-header">
        <div>
          <h1>Recovery Queue</h1>
          <p>Prioritized payment verification and overdue follow-up work.</p>
        </div>
      </header>

      <section className="dashboard-grid compact">
        <div className="metric">
          <span>Open tasks</span>
          <strong>{counts.open}</strong>
        </div>
        <div className="metric">
          <span>Payment reviews</span>
          <strong>{counts.payments}</strong>
        </div>
        <div className="metric">
          <span>Overdue recovery</span>
          <strong>{counts.overdue}</strong>
        </div>
      </section>

      {isLoading ? (
        <section className="dashboard-state">
          <strong>Loading recovery queue</strong>
          <span>Finding open payment and overdue tasks.</span>
        </section>
      ) : loadError ? (
        <section className="dashboard-state dashboard-state-error">
          <strong>{loadError}</strong>
          <span>Refresh the page or try again after the API is available.</span>
        </section>
      ) : (
        <>
          {actionError ? (
            <section className="dashboard-state dashboard-state-error compact-state">
              <strong>{actionError}</strong>
              <span>
                The task is still open. Try again when the API is available.
              </span>
            </section>
          ) : null}
          <RecoveryQueue
            tasks={tasks}
            completingTaskId={completingTaskId}
            onCompleteTask={handleCompleteTask}
          />
        </>
      )}
    </main>
  );
}
