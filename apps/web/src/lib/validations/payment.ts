import { z } from "zod";

const currencyAmount = z
  .string()
  .trim()
  .min(1, "Amount is required.")
  .refine((value) => Number.isFinite(Number(value)) && Number(value) > 0, {
    message: "Amount must be greater than 0.",
  });

export const recordPaymentSchema = z.object({
  memberId: z.string().trim().min(1, "Member is required."),
  membershipId: z.string().trim().optional(),
  amountExpected: currencyAmount,
  amountPaid: currencyAmount,
  method: z.enum(["BANK_TRANSFER", "CASH", "POS", "STRIPE", "OTHER"]),
  reference: z.string().trim().optional(),
  notes: z.string().trim().max(255, "Notes must be 255 characters or fewer."),
});

export const paymentRejectionSchema = z.object({
  reason: z.string().trim().min(1, "Rejection reason is required."),
});

export type RecordPaymentFormInput = z.infer<typeof recordPaymentSchema>;

export function validateRecordPayment(input: RecordPaymentFormInput) {
  const result = recordPaymentSchema.safeParse(input);

  if (result.success) {
    return null;
  }

  return result.error.issues[0]?.message ?? "Payment details are invalid.";
}

export function validateRejectionReason(reason: string) {
  const result = paymentRejectionSchema.safeParse({ reason });

  return result.success ? null : result.error.issues[0]?.message ?? null;
}
