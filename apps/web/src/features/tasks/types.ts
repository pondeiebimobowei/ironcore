export type TaskType =
  | "VERIFY_PAYMENT"
  | "FOLLOW_UP_MEMBER"
  | "RESOLVE_OVERDUE_STATUS"
  | "REVIEW_AT_RISK_MEMBER"
  | "REACTIVATION";

export type TaskStatus = "OPEN" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

export type TaskMember = {
  id: string;
  firstName: string;
  lastName?: string | null;
  phoneNumber: string;
  email?: string | null;
  status: string;
};

export type TaskAssignee = {
  id: string;
  email: string;
};

export type Task = {
  id: string;
  memberId: string;
  type: TaskType;
  status: TaskStatus;
  dueDate?: string | null;
  createdAt: string;
  updatedAt: string;
  member: TaskMember;
  assignedTo?: TaskAssignee | null;
};
