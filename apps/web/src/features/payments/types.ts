export type PaymentStatus = "PENDING_VERIFICATION" | "VERIFIED" | "REJECTED";

export type PaymentMethod =
  | "BANK_TRANSFER"
  | "CASH"
  | "POS"
  | "STRIPE"
  | "OTHER";

type PaymentMember = {
  id: string;
  firstName: string;
  lastName?: string | null;
  phoneNumber: string;
  email?: string | null;
  status: string;
};

export type Payment = {
  id: string;
  status: PaymentStatus;
  amountExpected: string;
  amountPaid?: string | null;
  proofUrl?: string | null;
  method: PaymentMethod;
  reference?: string | null;
  submittedAt: string;
  verifiedAt?: string | null;
  rejectionReason?: string | null;
  notes?: string | null;
  member: PaymentMember;
  membership?: {
    id: string;
    expiryDate: string;
    amount: string;
    currency: string;
    plan?: { name: string } | null;
  } | null;
};
