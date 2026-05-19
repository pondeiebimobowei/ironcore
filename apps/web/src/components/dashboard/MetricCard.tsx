type MetricTone = "neutral" | "warning" | "danger" | "success";

type MetricCardProps = {
  label: string;
  value: string | number;
  detail?: string;
  tone?: MetricTone;
};

export function MetricCard({
  label,
  value,
  detail,
  tone = "neutral",
}: MetricCardProps) {
  return (
    <article className={`metric-card metric-card-${tone}`}>
      <span className="metric-card-label">{label}</span>
      <strong className="metric-card-value">{value}</strong>
      {detail ? <span className="metric-card-detail">{detail}</span> : null}
    </article>
  );
}

export type { MetricCardProps, MetricTone };
