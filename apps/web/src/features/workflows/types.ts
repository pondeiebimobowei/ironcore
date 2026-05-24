export type WorkflowDefinitionStatus = "ACTIVE" | "PAUSED" | "DRAFT";

export type WorkflowDefinitionStep = {
  id: string;
  dayOffset: number;
  label: string;
  messageTemplate: string;
  createsTask: boolean;
  sortOrder: number;
};

export type WorkflowMetrics = {
  memberCount: number;
  messagesSent: number;
  repliesReceived: number;
  paymentsReceived: number;
  recoveryRate: number;
};

export type WorkflowDefinition = {
  id: string;
  name: string;
  description: string;
  category: string;
  status: WorkflowDefinitionStatus;
  trigger: string;
  goal: string;
  audience: string;
  timezone: string;
  startedAt: string | null;
  lastRunAt: string | null;
  lastEditedAt: string;
  editedBy: {
    id: string;
    fullName: string;
    email: string;
    role: string | null;
  } | null;
  metrics: WorkflowMetrics;
  steps: WorkflowDefinitionStep[];
};

export type CreateWorkflowDefinitionInput = {
  name: string;
  description: string;
  category: string;
  status: WorkflowDefinitionStatus;
  trigger: string;
  goal: string;
  audience: string;
  timezone: string;
  steps: Array<{
    dayOffset: number;
    label: string;
    messageTemplate: string;
    createsTask?: boolean;
    sortOrder?: number;
  }>;
};

export type WorkflowStatus = WorkflowDefinitionStatus;

export type WorkflowTemplateStep = WorkflowDefinitionStep;

export type WorkflowTemplate = {
  id: string;
  name: string;
  type: "RENEWAL_REMINDER" | "OVERDUE_RECOVERY" | "REACTIVATION";
  status: WorkflowStatus;
  description: string;
  steps: WorkflowTemplateStep[];
};
