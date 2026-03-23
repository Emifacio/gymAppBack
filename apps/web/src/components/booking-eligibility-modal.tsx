import { Button } from "@/components/ui/Button";
import { Card, CardDescription, CardEyebrow, CardHeader, CardTitle } from "@/components/ui/Card";

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
      <Card className="w-full max-w-md rounded-[2rem] shadow-[0_40px_100px_rgba(19,34,56,0.3)]">
        <CardHeader>
          <CardEyebrow>Reserva no disponible</CardEyebrow>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>

        <div className="mt-8 flex justify-end">
          {actionLabel && onAction ? (
            <Button
              className="rounded-2xl"
              onClick={onAction}
              type="button"
            >
              {actionLabel}
            </Button>
          ) : (
            <Button
              className="rounded-2xl"
              onClick={onClose}
              type="button"
              variant="secondary"
            >
              Cerrar
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
