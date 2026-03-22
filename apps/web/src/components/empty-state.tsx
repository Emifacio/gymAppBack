interface EmptyStateProps {
  eyebrow: string;
  title: string;
  description: string;
}

export function EmptyState({ eyebrow, title, description }: EmptyStateProps) {
  return (
    <div className="glass-panel rounded-[2rem] p-8 text-center">
      <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[var(--accent)]">{eyebrow}</p>
      <h2 className="section-title mt-3 text-3xl font-semibold">{title}</h2>
      <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-[var(--text-secondary)]">{description}</p>
    </div>
  );
}
