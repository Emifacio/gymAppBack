interface StatCardProps {
  label: string;
  value: string;
  tone?: "accent" | "highlight" | "default";
  detail: string;
}

const toneClass: Record<NonNullable<StatCardProps["tone"]>, string> = {
  accent: "bg-[var(--accent-soft)] text-[var(--accent)]",
  highlight: "bg-[rgba(23,184,156,0.15)] text-[var(--highlight)]",
  default: "bg-[rgba(19,34,56,0.08)] text-[var(--ink)]"
};

export function StatCard({ label, value, tone = "default", detail }: StatCardProps) {
  return (
    <article className="glass-panel rounded-[1.75rem] p-6">
      <div className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${toneClass[tone]}`}>
        {label}
      </div>
      <p className="section-title mt-5 text-4xl font-semibold">{value}</p>
      <p className="mt-2 text-sm text-[var(--muted)]">{detail}</p>
    </article>
  );
}
