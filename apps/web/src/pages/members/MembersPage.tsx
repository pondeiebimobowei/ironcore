import { useCallback, useEffect, useMemo, useState } from "react";
import { MemberForm } from "../../components/members/MemberForm";
import { MemberImport } from "../../components/members/MemberImport";
import { MemberTable } from "../../components/members/MemberTable";
import { createMember, listMembers } from "../../features/members/api";
import type { MemberStatus, MemberSummary } from "../../features/members/types";
import type { MemberFormInput } from "../../lib/validations/member";

const statuses: Array<{ value: MemberStatus | ""; label: string }> = [
  { value: "", label: "All statuses" },
  { value: "ACTIVE", label: "Active" },
  { value: "EXPIRING", label: "Expiring" },
  { value: "OVERDUE", label: "Overdue" },
  { value: "AT_RISK", label: "At risk" },
  { value: "PENDING_VERIFICATION", label: "Pending verification" },
  { value: "CHURNED", label: "Churned" },
];

export function MembersPage() {
  const [members, setMembers] = useState<MemberSummary[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<MemberStatus | "">("");
  const [error, setError] = useState("");

  const loadMembers = useCallback(async () => {
    try {
      setError("");
      setMembers(await listMembers({ search, status }));
    } catch {
      setError("Could not load members.");
    }
  }, [search, status]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadMembers();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadMembers]);

  const counts = useMemo(
    () => ({
      total: members.length,
      overdue: members.filter((member) => member.status === "OVERDUE").length,
      atRisk: members.filter((member) => member.status === "AT_RISK").length,
    }),
    [members],
  );

  const handleCreate = async (input: MemberFormInput) => {
    await createMember(input);
    await loadMembers();
  };

  return (
    <main className="page">
      <header className="page-header">
        <div>
          <h1>Members</h1>
          <p>Import, search, and manage recovery status.</p>
        </div>
      </header>
      <section className="toolbar">
        <label>
          Search
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Name, phone, or email"
          />
        </label>
        <label>
          Status
          <select
            value={status}
            onChange={(event) =>
              setStatus(event.target.value as MemberStatus | "")
            }
          >
            {statuses.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </section>
      <section className="dashboard-grid compact">
        <div className="metric">
          <span>Visible members</span>
          <strong>{counts.total}</strong>
        </div>
        <div className="metric">
          <span>Overdue</span>
          <strong>{counts.overdue}</strong>
        </div>
        <div className="metric">
          <span>At risk</span>
          <strong>{counts.atRisk}</strong>
        </div>
      </section>
      <section className="split-layout">
        <div>
          {error ? <p className="form-errors">{error}</p> : null}
          <MemberTable members={members} />
        </div>
        <aside className="side-panel">
          <h2>Add member</h2>
          <MemberForm onSubmit={handleCreate} />
          <h2>Import</h2>
          <MemberImport onImported={loadMembers} />
        </aside>
      </section>
    </main>
  );
}
