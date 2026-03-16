interface StatCardProps {
  label: string;
  value: string;
  tone?: "accent" | "highlight" | "default";
  detail: string;
}

export function StatCard({ label, value, detail }: StatCardProps) {
  return (
    <div className="apple-card flex flex-col justify-between">
      <div>
        <h3 className="section-title text-[var(--font-size-sm)] uppercase tracking-[0.16em] text-[var(--ink-500)]">
          {label}
        </h3>
        <p className="mt-2 text-[var(--font-size-2xl)] font-semibold text-[var(--ink-900)] tracking-tight">
          {value}
        </p>
      </div>
      {detail && (
        <p className="mt-4 text-[10px] sm:text-xs font-bold uppercase tracking-wider text-[var(--ink-300)] border-t border-[var(--surface-outline)] pt-4">
          {detail}
        </p>
      )}
    </div>
  );
}
