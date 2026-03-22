import { SkeletonStatCard } from "@/components/ui/skeletons";

interface StatCardProps {
  label: string;
  value: string;
  tone?: "accent" | "highlight" | "default";
  detail: string;
  id?: string | undefined;
  loading?: boolean;
}

export function StatCard({ label, value, detail, id, loading }: StatCardProps) {
  if (loading) {
    return <SkeletonStatCard className="h-full" />;
  }

  return (
    <div className="apple-card flex flex-col justify-between" id={id}>
      <div className="space-y-1">
        <h3 className="section-title text-[var(--font-size-xs)] uppercase tracking-[0.2em] text-[var(--text-muted)] opacity-80">
          {label}
        </h3>
        <p className="text-[var(--font-size-2xl)] font-bold text-[var(--text-primary)] tracking-tight">
          {value}
        </p>
      </div>
      {detail && (
        <div className="mt-6 flex items-center gap-2">
          <div className="h-1 w-1 rounded-full bg-[var(--accent)] opacity-40" />
          <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
            {detail}
          </p>
        </div>
      )}
    </div>
  );
}
