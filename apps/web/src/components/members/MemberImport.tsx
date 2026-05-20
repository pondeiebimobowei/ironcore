import { useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import {
  confirmMemberImport,
  dryRunMemberImport,
  type ImportDryRunResult,
  type ImportDuplicateStrategy,
  type ImportReportRow,
} from "../../features/members/api";
import { parseCsv } from "../../features/members/csv";
import { validateImportRows } from "../../lib/validations/import";
import type { MemberFormInput } from "../../lib/validations/member";
import { captureEvent } from "../../lib/posthog/posthog";

type MemberImportProps = {
  onImported: () => Promise<void>;
  analyticsUserId?: string;
  analyticsOrganizationId?: string;
};

type ImportStep = "upload" | "map" | "review" | "importing" | "complete";
type ReviewTab = "ready" | "resolution" | "failed";
type MemberField = keyof Pick<
  MemberFormInput,
  "firstName" | "lastName" | "phoneNumber" | "email" | "expiryDate" | "notes"
>;

const memberFields: Array<{
  value: MemberField;
  label: string;
  required?: boolean;
}> = [
  { value: "firstName", label: "First name", required: true },
  { value: "lastName", label: "Last name" },
  { value: "phoneNumber", label: "Phone number", required: true },
  { value: "email", label: "Email" },
  { value: "expiryDate", label: "Expiry date" },
  { value: "notes", label: "Notes" },
];

const emptyReport: ImportDryRunResult = {
  validRows: [],
  warningRows: [],
  errorRows: [],
};

function normalizeHeader(header: string) {
  return header.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function guessField(header: string): MemberField | "" {
  const normalized = normalizeHeader(header);
  const guesses: Record<string, MemberField> = {
    firstname: "firstName",
    fname: "firstName",
    name: "firstName",
    lastname: "lastName",
    lname: "lastName",
    surname: "lastName",
    phone: "phoneNumber",
    phonenumber: "phoneNumber",
    mobile: "phoneNumber",
    mobilenumber: "phoneNumber",
    email: "email",
    emailaddress: "email",
    expiry: "expiryDate",
    expirydate: "expiryDate",
    membershipexpiry: "expiryDate",
    notes: "notes",
  };

  return guesses[normalized] ?? "";
}

function normalizeDate(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return "";
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  const slashDate = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);

  if (!slashDate) {
    return trimmed;
  }

  const [, month, day, year] = slashDate;

  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

function formatBytes(size: number) {
  if (size < 1024) {
    return `${size} B`;
  }

  return `${(size / 1024).toFixed(1)} KB`;
}

function csvRow(row: number) {
  return row + 1;
}

export function MemberImport({
  onImported,
  analyticsUserId,
  analyticsOrganizationId,
}: MemberImportProps) {
  const [step, setStep] = useState<ImportStep>("upload");
  const [tab, setTab] = useState<ReviewTab>("ready");
  const [fileName, setFileName] = useState("");
  const [fileSize, setFileSize] = useState(0);
  const [headers, setHeaders] = useState<string[]>([]);
  const [records, setRecords] = useState<string[][]>([]);
  const [mappings, setMappings] = useState<Record<string, MemberField | "">>(
    {},
  );
  const [report, setReport] = useState<ImportDryRunResult>(emptyReport);
  const [resolutions, setResolutions] = useState<
    Record<number, ImportDuplicateStrategy>
  >({});
  const [errors, setErrors] = useState<Array<{ row: number; message: string }>>(
    [],
  );
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{
    createdCount: number;
    updatedCount: number;
    skippedCount: number;
  } | null>(null);

  const mappedRows = useMemo(
    () =>
      records.map((record) => {
        const row: MemberFormInput = {
          firstName: "",
          phoneNumber: "",
        };

        headers.forEach((header, index) => {
          const field = mappings[header];
          const value = record[index]?.trim() ?? "";

          if (!field) {
            return;
          }

          row[field] = field === "expiryDate" ? normalizeDate(value) : value;
        });

        return row;
      }),
    [headers, mappings, records],
  );

  const mappedFieldCount = new Set(
    Object.values(mappings).filter(Boolean),
  ).size;
  const requiredFieldsMapped = memberFields
    .filter((field) => field.required)
    .every((field) => Object.values(mappings).includes(field.value));
  const totalRows =
    report.validRows.length + report.warningRows.length + report.errorRows.length;
  const visibleReviewRows =
    tab === "ready"
      ? report.validRows.map((row, index) => ({
          row: index + 1,
          data: row,
          issues: [],
        }))
      : tab === "resolution"
        ? report.warningRows
        : report.errorRows;

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const parsed = parseCsv(await file.text());
    const guessedMappings = parsed.headers.reduce<Record<string, MemberField | "">>(
      (accumulator, header) => {
        const guess = guessField(header);

        accumulator[header] = Object.values(accumulator).includes(guess)
          ? ""
          : guess;

        return accumulator;
      },
      {},
    );

    setFileName(file.name);
    setFileSize(file.size);
    setHeaders(parsed.headers);
    setRecords(parsed.records);
    setMappings(guessedMappings);
    setReport(emptyReport);
    setErrors(parsed.errors);
    setResult(null);
    setProgress(0);
    setStep(parsed.errors.length > 0 ? "upload" : "map");
  };

  const updateMapping = (header: string, field: MemberField | "") => {
    setMappings((current) => ({
      ...Object.fromEntries(
        Object.entries(current).map(([key, value]) => [
          key,
          value === field && field ? "" : value,
        ]),
      ),
      [header]: field,
    }));
  };

  const reviewImport = async () => {
    const localValidation = validateImportRows(mappedRows);

    if (localValidation.errors.length > 0) {
      setReport({
        validRows: mappedRows.filter(
          (_row, index) =>
            !localValidation.errors.some((error) => error.row === index + 2),
        ),
        warningRows: [],
        errorRows: localValidation.errors.map((error) => ({
          row: error.row - 1,
          data: mappedRows[error.row - 2] ?? { firstName: "", phoneNumber: "" },
          issues: [{ row: error.row - 1, message: error.message }],
        })),
      });
      setTab("failed");
      setErrors([]);
      setStep("review");
      return;
    }

    try {
      const dryRun = await dryRunMemberImport(mappedRows);
      const defaultResolutions = dryRun.warningRows.reduce<
        Record<number, ImportDuplicateStrategy>
      >((accumulator, row) => {
        accumulator[row.row] = "SKIP_ROW";
        return accumulator;
      }, {});

      setReport(dryRun);
      setResolutions(defaultResolutions);
      setTab(dryRun.warningRows.length > 0 ? "resolution" : "ready");
      setErrors([]);
      setStep("review");
    } catch {
      setErrors([{ row: 1, message: "Could not validate this import." }]);
    }
  };

  const confirmImport = async () => {
    setStep("importing");
    setProgress(34);

    try {
      const timer = window.setInterval(() => {
        setProgress((current) => Math.min(current + 18, 88));
      }, 250);
      const importResult = await confirmMemberImport(
        mappedRows,
        Object.entries(resolutions).map(([row, strategy]) => ({
          row: Number(row),
          strategy,
        })),
      );

      window.clearInterval(timer);

      if (importResult.errors.length > 0) {
        setErrors(importResult.errors);
        setStep("review");
        return;
      }

      setProgress(100);
      setResult(importResult);
      captureEvent("members_imported", analyticsUserId, {
        organizationId: analyticsOrganizationId,
        createdCount: importResult.createdCount,
        updatedCount: importResult.updatedCount,
        skippedCount: importResult.skippedCount,
      });
      await onImported();
      setStep("complete");
    } catch {
      setErrors([{ row: 1, message: "Import failed. Please try again." }]);
      setStep("review");
    }
  };

  return (
    <div className="member-import-flow">
      <ImportSteps step={step} fileName={fileName} report={report} />

      {step === "upload" ? (
        <div className="import-grid">
          <section className="import-card">
            <h3>1. Upload CSV file</h3>
            <label className="import-dropzone">
              <span>Choose CSV file</span>
              <strong>Drag and drop or select a CSV export</strong>
              <small>Required columns can be mapped on the next screen.</small>
              <input type="file" accept=".csv,text/csv" onChange={handleFile} />
            </label>
            {errors.length > 0 ? <ImportErrors errors={errors} /> : null}
          </section>
          <ImportSidePanel fileName={fileName} fileSize={fileSize} rows={0} />
        </div>
      ) : null}

      {step === "map" ? (
        <div className="import-grid">
          <section className="import-card">
            <div className="import-card-heading">
              <div>
                <h3>Map CSV Columns to Member Fields</h3>
                <p>Match each column from your CSV file to a member field.</p>
              </div>
              <span>{headers.length - mappedFieldCount} unmapped</span>
            </div>
            <div className="mapping-list">
              {headers.map((header, index) => (
                <div className="mapping-row" key={header}>
                  <div>
                    <strong>{header}</strong>
                    <small>Column {String.fromCharCode(65 + index)}</small>
                  </div>
                  <span aria-hidden="true">to</span>
                  <label>
                    <span className="sr-only">Map {header}</span>
                    <select
                      value={mappings[header] ?? ""}
                      onChange={(event) =>
                        updateMapping(
                          header,
                          event.target.value as MemberField | "",
                        )
                      }
                    >
                      <option value="">Do not import</option>
                      {memberFields.map((field) => (
                        <option key={field.value} value={field.value}>
                          {field.label}
                          {field.required ? " *" : ""}
                        </option>
                      ))}
                    </select>
                  </label>
                  <small>{records.slice(0, 3).map((row) => row[index]).join(", ")}</small>
                </div>
              ))}
            </div>
            <div className="import-actions">
              <button type="button" onClick={() => setStep("upload")}>
                Back
              </button>
              <button
                type="button"
                className="primary-button"
                disabled={!requiredFieldsMapped || records.length === 0}
                onClick={() => void reviewImport()}
              >
                Continue
              </button>
            </div>
          </section>
          <ImportSidePanel
            fileName={fileName}
            fileSize={fileSize}
            rows={records.length}
            mappedCount={mappedFieldCount}
          />
        </div>
      ) : null}

      {step === "review" ? (
        <div className="import-grid">
          <section className="import-card">
            <div className="import-card-heading">
              <div>
                <h3>Review Member Data</h3>
                <p>Resolve duplicate rows and confirm what will be imported.</p>
              </div>
              <button type="button" onClick={() => setStep("map")}>
                Edit mappings
              </button>
            </div>
            <div className="import-summary-grid">
              <SummaryTile label="Ready to import" value={report.validRows.length} />
              <SummaryTile
                label="Requires resolution"
                value={report.warningRows.length}
              />
              <SummaryTile label="Failed rows" value={report.errorRows.length} />
            </div>
            <div className="import-tabs" role="tablist">
              <button
                type="button"
                className={tab === "ready" ? "active" : ""}
                onClick={() => setTab("ready")}
              >
                Ready to Import ({report.validRows.length})
              </button>
              <button
                type="button"
                className={tab === "resolution" ? "active" : ""}
                onClick={() => setTab("resolution")}
              >
                Requires Resolution ({report.warningRows.length})
              </button>
              <button
                type="button"
                className={tab === "failed" ? "active" : ""}
                onClick={() => setTab("failed")}
              >
                Failed Rows ({report.errorRows.length})
              </button>
            </div>
            <ReviewRows
              rows={visibleReviewRows}
              mode={tab}
              resolutions={resolutions}
              onResolutionChange={(row, strategy) =>
                setResolutions((current) => ({ ...current, [row]: strategy }))
              }
            />
            {errors.length > 0 ? <ImportErrors errors={errors} /> : null}
            <div className="import-actions">
              <button type="button" onClick={() => setStep("map")}>
                Back
              </button>
              <button
                type="button"
                className="primary-button"
                disabled={
                  report.validRows.length === 0 &&
                  !Object.values(resolutions).some(
                    (strategy) => strategy !== "SKIP_ROW",
                  )
                }
                onClick={() => void confirmImport()}
              >
                Import members
              </button>
            </div>
          </section>
          <ImportSidePanel
            fileName={fileName}
            fileSize={fileSize}
            rows={totalRows}
            validRows={report.validRows.length}
            issueRows={report.warningRows.length + report.errorRows.length}
          />
        </div>
      ) : null}

      {step === "importing" || step === "complete" ? (
        <div className="import-grid">
          <section className="import-card import-final-card">
            <div className="import-illustration" aria-hidden="true">
              CSV
            </div>
            <h3>
              {step === "complete" ? "Import complete" : "Importing members..."}
            </h3>
            <p>
              {step === "complete"
                ? "Your member list has been updated."
                : "Please keep this window open while the import finishes."}
            </p>
            <div className="import-progress">
              <span style={{ width: `${progress}%` }} />
            </div>
            <strong>{progress}% complete</strong>
            {result ? (
              <div className="import-result-list">
                <span>Created {result.createdCount}</span>
                <span>Updated {result.updatedCount}</span>
                <span>Skipped {result.skippedCount}</span>
              </div>
            ) : null}
          </section>
          <ImportSidePanel
            fileName={fileName}
            fileSize={fileSize}
            rows={totalRows}
            validRows={report.validRows.length}
            issueRows={report.warningRows.length + report.errorRows.length}
          />
        </div>
      ) : null}
    </div>
  );
}

function ImportSteps({
  step,
  fileName,
  report,
}: {
  step: ImportStep;
  fileName: string;
  report: ImportDryRunResult;
}) {
  const currentIndex = ["upload", "map", "review", "importing", "complete"].indexOf(
    step,
  );
  const steps = [
    { label: "Upload File", detail: fileName || "Select CSV file" },
    { label: "Map Fields", detail: "Match columns" },
    {
      label: "Review Data",
      detail: report.validRows.length
        ? `${report.validRows.length} ready`
        : "Verify rows",
    },
    { label: "Import", detail: "Save members" },
  ];

  return (
    <ol className="import-steps">
      {steps.map((item, index) => {
        const isComplete =
          index < currentIndex || (step === "complete" && index === 3);
        const isActive =
          index === Math.min(currentIndex, 3) && step !== "complete";

        return (
          <li
            className={`${isComplete ? "complete" : ""} ${
              isActive ? "active" : ""
            }`}
            key={item.label}
          >
            <span>{isComplete ? "OK" : index + 1}</span>
            <div>
              <strong>{item.label}</strong>
              <small>{item.detail}</small>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function ImportSidePanel({
  fileName,
  fileSize,
  rows,
  mappedCount,
  validRows,
  issueRows,
}: {
  fileName: string;
  fileSize: number;
  rows: number;
  mappedCount?: number;
  validRows?: number;
  issueRows?: number;
}) {
  return (
    <aside className="import-side-panel">
      <h3>Import Summary</h3>
      <dl>
        <div>
          <dt>File name</dt>
          <dd>{fileName || "No file selected"}</dd>
        </div>
        <div>
          <dt>File size</dt>
          <dd>{fileSize ? formatBytes(fileSize) : "-"}</dd>
        </div>
        <div>
          <dt>Total rows</dt>
          <dd>{rows}</dd>
        </div>
        {mappedCount !== undefined ? (
          <div>
            <dt>Mapped fields</dt>
            <dd>{mappedCount} of {memberFields.length}</dd>
          </div>
        ) : null}
        {validRows !== undefined ? (
          <div>
            <dt>Ready rows</dt>
            <dd>{validRows}</dd>
          </div>
        ) : null}
        {issueRows !== undefined ? (
          <div>
            <dt>Rows needing attention</dt>
            <dd>{issueRows}</dd>
          </div>
        ) : null}
      </dl>
      <div className="import-help-box">
        <strong>Required fields</strong>
        <span>First name and phone number must be mapped before review.</span>
      </div>
    </aside>
  );
}

function SummaryTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="import-summary-tile">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function ReviewRows({
  rows,
  mode,
  resolutions,
  onResolutionChange,
}: {
  rows: ImportReportRow[];
  mode: ReviewTab;
  resolutions: Record<number, ImportDuplicateStrategy>;
  onResolutionChange: (row: number, strategy: ImportDuplicateStrategy) => void;
}) {
  if (rows.length === 0) {
    return (
      <div className="empty-state">
        <strong>No rows in this view</strong>
        <span>Switch tabs to review the remaining import data.</span>
      </div>
    );
  }

  return (
    <div className="table-wrap import-review-table">
      <table>
        <thead>
          <tr>
            <th>Row</th>
            <th>Name</th>
            <th>Email</th>
            <th>Phone</th>
            <th>Expiry</th>
            <th>Status</th>
            {mode === "resolution" ? <th>Resolution</th> : null}
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, 10).map((row) => {
            const existingMember = row.issues.find(
              (issue) => issue.existingMember,
            )?.existingMember;
            const hasPhoneConflict = row.issues.some(
              (issue) =>
                issue.field === "phoneNumber" &&
                issue.duplicateType === "existing",
            );

            return (
              <tr key={row.row}>
                <td data-label="Row">{csvRow(row.row)}</td>
                <td data-label="Name">
                  {row.data.firstName} {row.data.lastName}
                </td>
                <td data-label="Email">{row.data.email || "-"}</td>
                <td data-label="Phone">{row.data.phoneNumber}</td>
                <td data-label="Expiry">{row.data.expiryDate || "-"}</td>
                <td data-label="Status">
                  <span
                    className={`import-status-pill import-status-${mode}`}
                  >
                    {mode === "ready"
                      ? "Ready"
                      : row.issues.map((issue) => issue.message).join("; ")}
                  </span>
                  {existingMember ? (
                    <small>
                      Matches {existingMember.firstName}{" "}
                      {existingMember.lastName ?? ""}
                    </small>
                  ) : null}
                </td>
                {mode === "resolution" ? (
                  <td data-label="Resolution">
                    <select
                      value={resolutions[row.row] ?? "SKIP_ROW"}
                      onChange={(event) =>
                        onResolutionChange(
                          row.row,
                          event.target.value as ImportDuplicateStrategy,
                        )
                      }
                    >
                      <option value="SKIP_ROW">Skip row</option>
                      <option value="UPDATE_EXISTING" disabled={!existingMember}>
                        Update existing
                      </option>
                      <option value="CREATE_NEW" disabled={hasPhoneConflict}>
                        Create new
                      </option>
                    </select>
                  </td>
                ) : null}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ImportErrors({
  errors,
}: {
  errors: Array<{ row: number; message: string }>;
}) {
  return (
    <ul className="form-errors">
      {errors.map((error) => (
        <li key={`${error.row}-${error.message}`}>
          Row {error.row}: {error.message}
        </li>
      ))}
    </ul>
  );
}
