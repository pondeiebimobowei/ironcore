import type { MemberFormInput } from "../../lib/validations/member";
import {
  validateImportHeaders,
  validateImportRows,
} from "../../lib/validations/import";

export function parseCsvLine(line: string) {
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

export type ParsedCsv = {
  headers: string[];
  records: string[][];
  errors: Array<{ row: number; message: string }>;
};

export function parseCsv(csv: string): ParsedCsv {
  const [headerLine, ...dataLines] = csv
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (!headerLine) {
    return {
      headers: [],
      records: [],
      errors: [{ row: 1, message: "CSV file is empty." }],
    };
  }

  const headers = parseCsvLine(headerLine);
  const records = dataLines.map((line) => parseCsvLine(line));

  return { headers, records, errors: [] };
}

export function parseMembersCsv(csv: string) {
  const { headers, records, errors } = parseCsv(csv);

  if (errors.length > 0) {
    return { rows: [], errors };
  }

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

  const rows = records.map((values) => {
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
