import { useState } from "react";
import type { ChangeEvent } from "react";
import { parseMembersCsv } from "../../features/members/csv";
import { importMembers } from "../../features/members/api";

type MemberImportProps = {
  onImported: () => Promise<void>;
};

export function MemberImport({ onImported }: MemberImportProps) {
  const [message, setMessage] = useState(
    "CSV headers: firstName,lastName,phoneNumber,email,expiryDate,notes",
  );
  const [errors, setErrors] = useState<Array<{ row: number; message: string }>>(
    [],
  );

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const parsed = parseMembersCsv(await file.text());

    if (parsed.errors.length > 0) {
      setErrors(parsed.errors);
      setMessage("Import file needs attention.");
      return;
    }

    const result = await importMembers(parsed.rows);
    setErrors(result.errors);
    setMessage(
      result.errors.length > 0
        ? "Import blocked by duplicate or invalid rows."
        : `Imported ${result.createdCount} members.`,
    );

    if (result.errors.length === 0) {
      await onImported();
    }
  };

  return (
    <div className="import-box">
      <label className="file-input">
        Import CSV
        <input type="file" accept=".csv,text/csv" onChange={handleFile} />
      </label>
      <p>{message}</p>
      {errors.length > 0 ? (
        <ul className="form-errors">
          {errors.map((error) => (
            <li key={`${error.row}-${error.message}`}>
              Row {error.row}: {error.message}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
