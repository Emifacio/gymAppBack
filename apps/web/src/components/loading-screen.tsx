interface LoadingScreenProps {
  label?: string;
}

export function LoadingScreen({ label = "Loading..." }: LoadingScreenProps) {
  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="glass-panel flex max-w-md items-center gap-4 rounded-full px-6 py-4 text-sm text-[var(--muted)]">
        <span className="h-3 w-3 animate-pulse rounded-full bg-[var(--accent)]" />
        <span>{label}</span>
      </div>
    </div>
  );
}
