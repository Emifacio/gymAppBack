interface StatCardProps {
  label: string;
  value: string;
  tone?: "accent" | "highlight" | "default";
  detail: string;
}

export function StatCard({ label, value, detail }: StatCardProps) {
  return (
    <article className="apple-card p-6">
      <p className="text-sm font-medium text-[var(--ink-500)] uppercase tracking-wider">{label}</p>
      <p className="section-title mt-2 text-4xl font-bold text-[var(--ink-900)] tracking-tight">{value}</p>
      <p className="mt-4 text-xs font-medium text-[var(--ink-500)] leading-relaxed">{detail}</p>
    </article>
  );
}
