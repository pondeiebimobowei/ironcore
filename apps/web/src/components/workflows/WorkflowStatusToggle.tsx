import type { WorkflowStatus } from "../../features/workflows/types";

type WorkflowStatusToggleProps = {
  status: WorkflowStatus;
  isUpdating?: boolean;
  onChange: (status: WorkflowStatus) => void;
};

export function WorkflowStatusToggle({
  status,
  isUpdating = false,
  onChange,
}: WorkflowStatusToggleProps) {
  const nextStatus = status === "ACTIVE" ? "PAUSED" : "ACTIVE";

  return (
    <button
      type="button"
      disabled={isUpdating}
      onClick={() => onChange(nextStatus)}
    >
      {isUpdating ? "Updating..." : status === "ACTIVE" ? "Pause" : "Activate"}
    </button>
  );
}
