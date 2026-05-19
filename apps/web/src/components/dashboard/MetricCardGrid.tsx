import type { MetricCardProps } from "./MetricCard";
import { MetricCard } from "./MetricCard";

type MetricCardGridProps = {
  metrics: MetricCardProps[];
};

export function MetricCardGrid({ metrics }: MetricCardGridProps) {
  return (
    <section className="metric-card-grid">
      {metrics.map((metric) => (
        <MetricCard key={metric.label} {...metric} />
      ))}
    </section>
  );
}
