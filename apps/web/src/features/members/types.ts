export type MemberStatus =
  | "ACTIVE"
  | "EXPIRING"
  | "OVERDUE"
  | "AT_RISK"
  | "PENDING_VERIFICATION"
  | "CHURNED";

type MemberBase = {
  id: string;
  firstName: string;
  lastName?: string | null;
  phoneNumber: string;
  email?: string | null;
  status: MemberStatus;
  notes?: string | null;
  updatedAt: string;
};

export type MemberSummary = MemberBase & {
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

export type MemberDetail = MemberBase & {
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
  payments: Array<{
    id: string;
    status: string;
    amountExpected: string;
    amountPaid?: string | null;
    submittedAt: string;
  }>;
  messageLogs: Array<{
    id: string;
    phoneNumber: string;
    direction: string;
    content: string;
    status: string;
    errorMessage?: string | null;
    sentAt?: string | null;
    createdAt: string;
  }>;
  timelineEvents: Array<{
    id: string;
    type: string;
    createdAt: string;
    metadata?: unknown;
  }>;
};
