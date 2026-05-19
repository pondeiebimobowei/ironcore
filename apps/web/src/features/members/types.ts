export type MemberStatus =
  | "ACTIVE"
  | "EXPIRING"
  | "OVERDUE"
  | "AT_RISK"
  | "PENDING_VERIFICATION"
  | "CHURNED";

export type MemberSummary = {
  id: string;
  firstName: string;
  lastName?: string | null;
  phoneNumber: string;
  email?: string | null;
  status: MemberStatus;
  notes?: string | null;
  updatedAt: string;
  memberships: Array<{
    id: string;
    expiryDate: string;
    amount: string;
    currency: string;
    plan?: { name: string } | null;
  }>;
  payments: Array<{
    id: string;
    status: string;
    amountExpected: string;
    amountPaid?: string | null;
    submittedAt: string;
  }>;
};

export type MemberDetail = MemberSummary & {
  createdAt: string;
  memberships: Array<{
    id: string;
    startDate: string;
    expiryDate: string;
    status: string;
    amount: string;
    currency: string;
    plan?: { name: string } | null;
    payments: Array<{ id: string; status: string; amountExpected: string }>;
  }>;
  tasks: Array<{
    id: string;
    type: string;
    status: string;
    dueDate?: string | null;
  }>;
  timelineEvents: Array<{
    id: string;
    type: string;
    createdAt: string;
    metadata?: unknown;
  }>;
};
