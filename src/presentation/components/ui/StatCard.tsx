import { Card } from "./Card";

/** A single metric tile: big value + label, with an optional sub-hint. */
export function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: number | string;
  hint?: string;
}) {
  return (
    <Card className="flex flex-col gap-1">
      <span className="text-2xl font-bold text-brand-600">{value}</span>
      <span className="text-sm text-muted">{label}</span>
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </Card>
  );
}
