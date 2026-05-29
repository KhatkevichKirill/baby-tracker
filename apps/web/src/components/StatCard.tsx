export function StatCard({
  label,
  value,
  hint
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="card p-4">
      <div className="text-sm font-semibold text-[var(--muted)]">{label}</div>
      <div className="mt-2 text-2xl font-bold">{value}</div>
      {hint ? <div className="mt-1 text-sm text-[var(--muted)]">{hint}</div> : null}
    </div>
  );
}
