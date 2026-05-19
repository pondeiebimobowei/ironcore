export type MemberFormInput = {
  firstName: string;
  lastName?: string;
  phoneNumber: string;
  email?: string;
  expiryDate?: string;
  notes?: string;
};

export function validateMemberInput(input: MemberFormInput) {
  const errors: string[] = [];

  if (!input.firstName.trim()) {
    errors.push("First name is required.");
  }

  if (input.phoneNumber.trim().length < 7) {
    errors.push("Phone number must be at least 7 characters.");
  }

  if (input.email && !input.email.includes("@")) {
    errors.push("Email address is invalid.");
  }

  return errors;
}
