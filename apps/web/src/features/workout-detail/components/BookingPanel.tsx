import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardEyebrow,
  CardHeader,
  CardInset,
  CardTitle
} from "@/components/ui/Card";
import { BookingEligibilityModal } from "@/components/booking-eligibility-modal";
import {
  getSubscriptionCreditDetail,
  getSubscriptionStatusLabel
} from "@/features/subscription/utils/subscriptionDisplay";
import { formatDateTime } from "@/lib/format";
import type { MemberSubscriptionStatus } from "@gym/api-client";

interface Props {
  bookingButtonConfig: { label: string; disabled: boolean };
  bookingFeedbackMessage: string | null;
  bookingState: string;
  bookingMutationPending: boolean;
  subscription: MemberSubscriptionStatus | null | undefined;
  precheckErrorCode?: string | null | undefined;
  eligibilityModal: { title: string; description: string } | null;
  onBook: () => void;
  onCloseModal: () => void;
  onRedirect?: () => void;
}

export function BookingPanel({
  bookingButtonConfig,
  bookingFeedbackMessage,
  bookingState,
  bookingMutationPending,
  subscription,
  precheckErrorCode,
  eligibilityModal,
  onBook,
  onCloseModal,
  onRedirect
}: Props) {
  const bookingStateLabel =
    bookingState === "confirmed"
      ? "Reserva confirmada"
      : bookingState === "waitlisted"
        ? "En lista de espera"
        : bookingState === "closed"
          ? "Reserva cerrada"
          : "Disponible";
  const bookingStateTone =
    bookingState === "confirmed"
      ? "success"
      : bookingState === "waitlisted"
        ? "warning"
        : bookingState === "closed"
          ? "danger"
          : "accent";

  return (
    <Card as="aside" className="space-y-6">
      <CardHeader>
        <CardEyebrow>Flujo de reserva</CardEyebrow>
        <CardTitle>Reserva tu lugar</CardTitle>
        <CardDescription>
          Reserva al instante cuando haya capacidad, únete a la lista de espera cuando la clase esté
          llena y mantén tus créditos sincronizados con el plan activo.
        </CardDescription>
      </CardHeader>

      <CardContent className="mt-0 space-y-4">
        <CardInset>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                Suscripción activa
              </p>
              <p className="mt-2 text-sm font-semibold text-[var(--text-primary)]">
                {getSubscriptionStatusLabel(subscription)}
              </p>
            </div>
            <Badge tone={bookingStateTone}>{bookingStateLabel}</Badge>
          </div>
          <p className="mt-3 text-sm text-[var(--text-secondary)]">
            {getSubscriptionCreditDetail(subscription)}
          </p>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Fin del periodo: {formatDateTime(subscription?.period_end)}
          </p>
        </CardInset>

        <Button
          className="h-12 w-full rounded-2xl shadow-lg shadow-[var(--accent-soft)]"
          loading={bookingMutationPending}
          disabled={bookingButtonConfig.disabled || bookingMutationPending}
          onClick={() => onBook()}
          variant="primary"
        >
          {bookingMutationPending ? "Procesando..." : bookingButtonConfig.label}
        </Button>

        {precheckErrorCode ? (
          <CardInset className="border-[var(--warning-soft)] bg-[var(--warning-soft)] shadow-none">
            <p className="text-sm font-medium text-[var(--text-primary)]">
              Tus créditos semanales se han agotado. Contacta con administración para más
              información o para ajustar tu plan de membresía.
            </p>
          </CardInset>
        ) : null}

        {bookingFeedbackMessage ? (
          <CardInset className="border-[var(--success-soft)] bg-[var(--success-soft)] shadow-none">
            <p className="text-sm font-medium text-[var(--success)]">{bookingFeedbackMessage}</p>
          </CardInset>
        ) : null}
      </CardContent>

      <BookingEligibilityModal
        description={eligibilityModal?.description ?? ""}
        onClose={() => onCloseModal()}
        open={eligibilityModal !== null}
        title={eligibilityModal?.title ?? ""}
        actionLabel={onRedirect ? "Ver próximas clases" : undefined}
        onAction={onRedirect ? () => onRedirect() : undefined}
      />
    </Card>
  );
}
