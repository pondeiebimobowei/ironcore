import type { WorkflowStatus } from "../../features/workflows/types";

type WorkflowStatusToggleProps = {
  status: WorkflowStatus;
  onChange: (status: WorkflowStatus) => void;
};

export function WorkflowStatusToggle({
  status,
  onChange,
}: WorkflowStatusToggleProps) {
  const nextStatus = status === "ACTIVE" ? "PAUSED" : "ACTIVE";

  return (
    <button type="button" onClick={() => onChange(nextStatus)}>
      {status === "ACTIVE" ? "Pause" : "Activate"}
    </button>
  );
}
