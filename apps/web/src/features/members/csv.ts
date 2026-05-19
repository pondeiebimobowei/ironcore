import type { MemberFormInput } from "../../lib/validations/member";
import {
  validateImportHeaders,
  validateImportRows,
} from "../../lib/validations/import";

function parseCsvLine(line: string) {
  const values: string[] = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"' && next === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      values.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  values.push(current.trim());

  return values;
}

export function parseMembersCsv(csv: string) {
  const [headerLine, ...dataLines] = csv
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (!headerLine) {
    return { rows: [], errors: [{ row: 1, message: "CSV file is empty." }] };
  }

  const headers = parseCsvLine(headerLine);
  const missingHeaders = validateImportHeaders(headers);

  if (missingHeaders.length > 0) {
    return {
      rows: [],
      errors: missingHeaders.map((header) => ({
        row: 1,
        message: `Missing required header: ${header}`,
      })),
    };
  }

  const rows = dataLines.map((line) => {
    const values = parseCsvLine(line);
    const row = headers.reduce<Record<string, string>>(
      (accumulator, header, index) => {
        accumulator[header] = values[index] ?? "";
        return accumulator;
      },
      {},
    );

    return {
      firstName: row.firstName ?? "",
      lastName: row.lastName,
      phoneNumber: row.phoneNumber ?? "",
      email: row.email,
      expiryDate: row.expiryDate,
      notes: row.notes,
    } satisfies MemberFormInput;
  });

  return validateImportRows(rows);
}
