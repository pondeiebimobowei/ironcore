import { z } from "zod";

const optionalText = z.string().optional();

export const memberFormSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required."),
  lastName: optionalText,
  phoneNumber: z
    .string()
    .trim()
    .min(7, "Phone number must be at least 7 characters."),
  email: z
    .union([z.literal(""), z.string().email("Email address is invalid.")])
    .optional(),
  planName: optionalText,
  membershipAmount: optionalText,
  startDate: optionalText,
  expiryDate: optionalText,
  notes: optionalText,
});

export type MemberFormInput = z.input<typeof memberFormSchema>;

export function validateMemberInput(input: MemberFormInput) {
  const result = memberFormSchema.safeParse(input);

  return result.success ? [] : result.error.issues.map((issue) => issue.message);
}
