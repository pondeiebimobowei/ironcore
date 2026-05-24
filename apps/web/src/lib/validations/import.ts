import type { MemberFormInput } from "./member";
import { validateMemberInput } from "./member";

export type ImportValidationResult = {
  rows: MemberFormInput[];
  errors: Array<{ row: number; message: string }>;
};

const requiredHeaders = ["firstName", "phoneNumber"];

export function validateImportRows(
  rows: MemberFormInput[],
): ImportValidationResult {
  const seenPhones = new Set<string>();
  const errors: Array<{ row: number; message: string }> = [];

  rows.forEach((row, index) => {
    const rowNumber = index + 2;

    validateMemberInput(row).forEach((message) => {
      errors.push({ row: rowNumber, message });
    });

    if (seenPhones.has(row.phoneNumber)) {
      errors.push({
        row: rowNumber,
        message: "Duplicate phone number in import file.",
      });
    }

    if (
      row.membershipAmount &&
      !/^\d+(\.\d{1,2})?$/.test(row.membershipAmount.trim())
    ) {
      errors.push({
        row: rowNumber,
        message: "Membership amount must be a number with up to 2 decimals.",
      });
    }

    seenPhones.add(row.phoneNumber);
  });

  return { rows, errors };
}

export function validateImportHeaders(headers: string[]) {
  return requiredHeaders.filter((header) => !headers.includes(header));
}
