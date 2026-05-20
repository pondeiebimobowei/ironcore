import { z } from "zod";

export const paymentRejectionSchema = z.object({
  reason: z.string().trim().min(1, "Rejection reason is required."),
});

export function validateRejectionReason(reason: string) {
  const result = paymentRejectionSchema.safeParse({ reason });

  return result.success ? null : result.error.issues[0]?.message ?? null;
}
