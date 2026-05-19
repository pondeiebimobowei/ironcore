import { useCallback, useEffect, useMemo, useState } from "react";
import { RecoveryQueue } from "../../components/tasks";
import { listOpenTasks } from "../../features/tasks/api";
import type { Task } from "../../features/tasks/types";

export function RecoveryQueuePage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const loadTasks = useCallback(async () => {
    try {
      setError("");
      setTasks(await listOpenTasks());
    } catch {
      setError("Could not load the recovery queue.");
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
      ) : error ? (
        <section className="dashboard-state dashboard-state-error">
          <strong>{error}</strong>
          <span>Refresh the page or try again after the API is available.</span>
        </section>
      ) : (
        <RecoveryQueue tasks={tasks} />
      )}
    </main>
  );
}
