import type { TaskType } from "../../features/tasks/types";

export const taskTypeLabels: Record<TaskType, string> = {
  VERIFY_PAYMENT: "Verify payment",
  FOLLOW_UP_MEMBER: "Follow up with member",
  RESOLVE_OVERDUE_STATUS: "Resolve overdue status",
  REVIEW_AT_RISK_MEMBER: "Review at-risk member",
  REACTIVATION: "Start reactivation",
};

export const taskTypeDescriptions: Record<TaskType, string> = {
  VERIFY_PAYMENT: "Review submitted proof and verify recovered revenue.",
  FOLLOW_UP_MEMBER: "Contact the member and unblock the recovery step.",
  RESOLVE_OVERDUE_STATUS: "Confirm renewal intent or recover the overdue amount.",
  REVIEW_AT_RISK_MEMBER: "Prioritize this member before the account churns.",
  REACTIVATION: "Attempt a win-back conversation for this churned member.",
};
