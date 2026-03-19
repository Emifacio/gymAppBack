interface SkeletonProps {
  className?: string;
  count?: number;
}

export function Skeleton({ className = "" }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 bg-[length:200%_100%] ${className}`}
      aria-hidden="true"
    />
  );
}

export function SkeletonText({ className = "", lines = 1 }: SkeletonProps & { lines?: number }) {
  return (
    <div className={`space-y-2 ${className}`} aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={i === lines - 1 && lines > 1 ? "w-3/4" : "w-full"} />
      ))}
    </div>
  );
}

export function SkeletonBlock({ className = "" }: SkeletonProps) {
  return <Skeleton className={`h-4 ${className}`} />;
}

export function SkeletonCard({ className = "" }: SkeletonProps) {
  return (
    <div className={`rounded-xl border border-[var(--surface-outline)] bg-white p-5 ${className}`} aria-hidden="true">
      <Skeleton className="h-5 w-1/3 mb-3" />
      <Skeleton className="h-4 w-full mb-2" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  );
}

export function SkeletonListRow({ className = "" }: SkeletonProps) {
  return (
    <div className={`flex items-center justify-between p-4 rounded-xl border border-[var(--surface-outline)] ${className}`} aria-hidden="true">
      <div className="space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-48" />
      </div>
      <div className="flex items-center gap-3">
        <Skeleton className="h-6 w-16 rounded-lg" />
        <Skeleton className="h-2 w-2 rounded-full" />
      </div>
    </div>
  );
}

export function SkeletonStatCard({ className = "" }: SkeletonProps) {
  return (
    <div className={`rounded-2xl border border-[var(--surface-outline)] bg-white/80 p-6 ${className}`} aria-hidden="true">
      <Skeleton className="h-3 w-20 mb-3" />
      <Skeleton className="h-8 w-16 mb-2" />
      <Skeleton className="h-3 w-24" />
    </div>
  );
}

export function SkeletonWorkoutCard({ className = "" }: SkeletonProps) {
  return (
    <div className={`rounded-2xl border border-[var(--surface-outline)] bg-white p-5 ${className}`} aria-hidden="true">
      <div className="flex items-start justify-between">
        <div className="space-y-2 flex-1">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-8 w-20 rounded-full" />
      </div>
      <div className="mt-4 flex items-center gap-4">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-28" />
      </div>
      <div className="mt-4 flex items-center gap-3">
        <Skeleton className="h-9 w-28 rounded-full" />
        <Skeleton className="h-9 w-32 rounded-full" />
      </div>
    </div>
  );
}

export function SkeletonMemberRow({ className = "" }: SkeletonProps) {
  return (
    <div className={`flex items-center justify-between p-4 rounded-xl border border-[var(--surface-outline)] hover:bg-[var(--ink-100)] transition-colors ${className}`} aria-hidden="true">
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-48" />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Skeleton className="h-6 w-20 rounded-lg" />
        <Skeleton className="h-2 w-2 rounded-full" />
      </div>
    </div>
  );
}

export function SkeletonPlanCard({ className = "" }: SkeletonProps) {
  return (
    <div className={`rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm ${className}`} aria-hidden="true">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2 flex-1">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
      <div className="mt-6 space-y-4">
        <Skeleton className="h-10 w-full rounded-2xl" />
        <Skeleton className="h-24 w-full rounded-2xl" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-10 rounded-2xl" />
          <Skeleton className="h-10 rounded-2xl" />
        </div>
        <div className="flex gap-3">
          <Skeleton className="h-11 w-32 rounded-full" />
          <Skeleton className="h-11 w-28 rounded-full" />
        </div>
      </div>
    </div>
  );
}
