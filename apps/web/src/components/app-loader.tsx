interface AppLoaderProps {
  label?: string;
  fullScreen?: boolean;
}

export function AppLoader({
  label = "Preparando la experiencia ATLHYT...",
  fullScreen = false
}: AppLoaderProps) {
  return (
    <div
      className={`flex items-center justify-center px-6 ${
        fullScreen ? "min-h-screen py-10" : "min-h-[50vh] py-12"
      }`}
    >
      <div className="glass-panel flex w-full max-w-md items-center gap-4 rounded-[1.75rem] border border-[var(--border-base)] bg-[color-mix(in_srgb,var(--bg-surface)_86%,white_14%)] px-6 py-5 text-sm text-[var(--text-secondary)] shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
        <span className="relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--accent-soft)]">
          <span className="absolute h-5 w-5 animate-ping rounded-full bg-[var(--accent)]/20" />
          <span className="relative h-3 w-3 rounded-full bg-[var(--accent)]" />
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--accent)]">
            ATLHYT
          </p>
          <p className="mt-1 truncate text-sm font-medium text-[var(--text-secondary)]">{label}</p>
        </div>
      </div>
    </div>
  );
}
