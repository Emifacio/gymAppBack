import { Button } from "@/components/ui/Button";
import { BookingEligibilityModal } from "@/components/booking-eligibility-modal";
import { getSubscriptionCreditDetail, getSubscriptionStatusLabel } from "@/features/subscription/utils/subscriptionDisplay";
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
  bookingMutationPending,
  subscription,
  precheckErrorCode,
  eligibilityModal,
  onBook,
  onCloseModal,
  onRedirect
}: Props) {
  return (
    <aside className="glass-panel rounded-[2.25rem] p-8">
      <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[var(--accent)]">Flujo de reserva</p>
      <h2 className="section-title mt-4 text-3xl font-semibold">Reserva tu lugar</h2>
      <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
        Reserva al instante cuando haya capacidad, únete a la lista de espera cuando la clase esté llena y mantén tus
        créditos sincronizados con el plan activo.
      </p>

      <div className="mt-6 rounded-[1.5rem] bg-white/80 p-5 text-sm text-[var(--muted)]">
        <p className="font-semibold text-[var(--ink)]">Suscripción activa</p>
        <p className="mt-2">{getSubscriptionStatusLabel(subscription)}</p>
        <p className="mt-1">{getSubscriptionCreditDetail(subscription)}</p>
        <p className="mt-1">Fin del periodo: {subscription?.period_end ?? "-"}</p>
      </div>

      <div className="mt-6">
        <Button
          className="w-full"
          loading={bookingMutationPending}
          disabled={bookingButtonConfig.disabled || bookingMutationPending}
          onClick={() => onBook()}
          variant="primary"
        >
          {bookingMutationPending ? "Procesando..." : bookingButtonConfig.label}
        </Button>
      </div>

      {precheckErrorCode && (
        <p className="mt-3 text-sm text-[var(--accent)]">
          Tus créditos semanales se han agotado. Contacta con administración para más información o para ajustar tu plan de membresía.
        </p>
      )}

      {bookingFeedbackMessage && (
        <div className="mt-4 rounded-2xl bg-[rgba(23,184,156,0.12)] px-4 py-3 text-sm text-[var(--highlight)]">
          {bookingFeedbackMessage}
        </div>
      )}

      <BookingEligibilityModal
        description={eligibilityModal?.description ?? ""}
        onClose={() => onCloseModal()}
        open={eligibilityModal !== null}
        title={eligibilityModal?.title ?? ""}
        actionLabel={onRedirect ? "Ver próximas clases" : undefined}
        onAction={onRedirect ? () => onRedirect() : undefined}
      />
    </aside>
  );
}
