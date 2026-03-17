import { Button } from "@/components/ui/Button";

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="apple-card max-w-md w-full p-8 space-y-6 shadow-2xl animate-in zoom-in-95 duration-200">
        <header className="text-center space-y-2">
          <h2 className="section-title text-2xl font-bold text-[var(--ink-900)]">
            ¿Confirmar cancelación?
          </h2>
          <p className="text-sm font-medium text-[var(--ink-500)]">
            Estás a punto de cancelar tu reserva para esta clase.
          </p>
        </header>

        {isLate ? (
          <div className="p-4 rounded-2xl bg-red-50 border border-red-100 space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider text-red-600">
              ⚠️ Aviso de cancelación tardía
            </p>
            <p className="text-sm font-medium text-red-700 leading-relaxed">
              Faltan menos de 24 horas para la clase. Si cancelas ahora, **perderás el crédito** utilizado para esta reserva.
            </p>
          </div>
        ) : null}

        <div className="flex flex-col gap-3">
          <Button
            variant="danger"
            className="w-full h-12"
            onClick={onConfirm}
            loading={loading}
          >
            Confirmar Cancelación
          </Button>
          <Button
            variant="secondary"
            className="w-full h-12"
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
