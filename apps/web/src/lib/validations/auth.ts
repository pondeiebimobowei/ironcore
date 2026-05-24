import { z } from "zod";

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters.");

export const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  password: passwordSchema,
});

export const signupAccountSchema = z
  .object({
    fullName: z.string().trim().min(2, "Enter your full name."),
    email: z.string().trim().email("Enter a valid work email."),
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Confirm your password."),
  })
  .refine((input) => input.password === input.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export const companySetupSchema = z.object({
  name: z.string().trim().min(2, "Company name must be at least 2 characters."),
  businessType: z.string().trim().optional(),
  organizationSize: z.string().trim().optional(),
  contactEmail: z
    .union([z.literal(""), z.string().email("Contact email is invalid.")])
    .optional(),
  primaryPhone: z.string().trim().optional(),
  addressLine: z.string().trim().optional(),
  city: z.string().trim().optional(),
  state: z.string().trim().optional(),
  country: z.string().trim().optional(),
});

export type LoginFormInput = z.input<typeof loginSchema>;
export type SignupAccountInput = z.input<typeof signupAccountSchema>;
export type CompanySetupInput = z.input<typeof companySetupSchema>;

export function firstAuthError(
  result:
    | ReturnType<typeof loginSchema.safeParse>
    | ReturnType<typeof signupAccountSchema.safeParse>
    | ReturnType<typeof companySetupSchema.safeParse>,
) {
  return result.success
    ? null
    : (result.error.issues[0]?.message ?? "Review the form and try again.");
}
