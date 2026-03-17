interface BookingEligibilityModalProps {
  open: boolean;
  title: string;
  description: string;
  onClose: () => void;
  actionLabel?: string | undefined;
  onAction?: (() => void) | undefined;
}

export function BookingEligibilityModal({
  open,
  title,
  description,
  onClose,
  actionLabel,
  onAction
}: BookingEligibilityModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(19,34,56,0.45)] px-4"
      role="dialog"
    >
      <div className="glass-panel w-full max-w-md rounded-[2.5rem] p-8 shadow-[0_40px_100px_rgba(19,34,56,0.3)] border border-white/20">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[var(--accent)]">
          Reserva no disponible
        </p>
        <h2 className="section-title mt-4 text-3xl font-semibold">{title}</h2>
        <p className="mt-4 text-sm leading-8 text-[var(--muted)]">{description}</p>

        <div className="mt-8 flex justify-end">
          {actionLabel && onAction ? (
            <button
              className="rounded-full bg-[var(--primary)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--primary)]/90"
              onClick={onAction}
              type="button"
            >
              {actionLabel}
            </button>
          ) : (
            <button
              className="rounded-full bg-[var(--ink)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#1f3453]"
              onClick={onClose}
              type="button"
            >
              Cerrar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
