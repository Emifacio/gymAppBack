import { Button } from "@/components/ui/Button";
import { AlertTriangle, X } from "lucide-react";

interface CancellationModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLate: boolean;
  loading: boolean;
}

export function CancellationModal({ open, onClose, onConfirm, isLate, loading }: CancellationModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md animate-in fade-in duration-300">
      <div className="apple-card max-w-md w-full p-8 space-y-8 shadow-2xl animate-in zoom-in-95 duration-200 bg-[var(--bg-surface)] border border-[var(--border-base)] relative overflow-hidden">
        {/* Decorative corner accent */}
        <div className="absolute top-0 right-0 h-24 w-24 bg-[var(--accent)] opacity-[0.03] rounded-full -mr-12 -mt-12 pointer-events-none" />
        
        <header className="text-center space-y-3">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--bg-surface-secondary)] text-[var(--accent)] shadow-inner mb-2">
            <X className="h-8 w-8" />
          </div>
          <h2 className="section-title text-2xl font-bold text-[var(--text-primary)] leading-tight tracking-tight">
            ¿Confirmar cancelación?
          </h2>
          <p className="text-sm font-medium text-[var(--text-secondary)] opacity-80 leading-relaxed max-w-[280px] mx-auto">
            Estás a punto de liberar tu lugar en esta sesión. Esta acción es irreversible.
          </p>
        </header>

        {isLate ? (
          <div className="p-5 rounded-2xl bg-[var(--danger-soft)]/50 border border-[var(--danger-soft)] space-y-3 shadow-sm">
            <div className="flex items-center gap-2 text-[var(--danger)]">
              <AlertTriangle className="h-4 w-4" />
              <p className="text-[10px] font-black uppercase tracking-widest">
                Acceso denegado
              </p>
            </div>
            <p className="text-xs font-bold text-[var(--danger)] leading-relaxed">
              Faltan menos de 24 horas. Por política de asistencia, no puedes cancelar esta reserva desde la app.
            </p>
          </div>
        ) : (
          <div className="p-5 rounded-2xl bg-[var(--accent-soft)]/40 border border-[var(--accent-soft)]/20 shadow-sm text-center">
             <p className="text-xs font-bold text-[var(--accent)]">Tu crédito será reembolsado automáticamente.</p>
          </div>
        )}

        <div className="flex flex-col gap-3">
          <Button
            variant="danger"
            className="w-full h-14 text-base font-bold shadow-lg shadow-[var(--danger-soft)] rounded-2xl"
            onClick={onConfirm}
            loading={loading}
            disabled={isLate}
          >
            {isLate ? "Restringido" : "Sí, Cancelar Reserva"}
          </Button>
          <Button
            variant="secondary"
            className="w-full h-14 text-sm font-bold border-[var(--border-base)] rounded-2xl"
            onClick={onClose}
            disabled={loading}
          >
            Mantener mi lugar
          </Button>
        </div>
      </div>
    </div>
  );
}
