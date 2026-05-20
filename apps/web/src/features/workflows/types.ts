export type WorkflowStatus = "ACTIVE" | "PAUSED" | "COMPLETED" | "CANCELLED";

export type WorkflowTemplateStep = {
  id: string;
  dayOffset: number;
  messageTemplate: string;
  createsTask: boolean;
};

export type WorkflowTemplate = {
  id: string;
  name: string;
  type: "RENEWAL_REMINDER" | "OVERDUE_RECOVERY" | "REACTIVATION";
  status: WorkflowStatus;
  description: string;
  steps: WorkflowTemplateStep[];
};
