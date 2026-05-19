export function ProofPreview({ proofUrl }: { proofUrl?: string | null }) {
  if (!proofUrl) {
    return <p className="empty-state">No proof uploaded.</p>;
  }

  return (
    <div className="line-item">
      <strong>Payment proof</strong>
      <a href={proofUrl} target="_blank" rel="noreferrer" className="subtle-link">
        Open proof
      </a>
    </div>
  );
}
