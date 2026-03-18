import type { BookingAction, Workout, MemberSubscriptionStatus } from "@gym/api-client";

export type BookingUIState =
  | "LOADING"
  | "PAST"
  | "ALREADY_BOOKED"
  | "WAITLISTED"
  | "CAN_BOOK"
  | "FULL_CAN_WAITLIST"
  | "BLOCKED";

export interface BookingButtonConfig {
  label: string;
  disabled: boolean;
}

export function isWorkoutPast(workout?: Workout | null) {
  if (!workout) return false;
  return new Date(workout.scheduled_at) < new Date();
}

export function getBookingUIState(
  workout: Workout | null | undefined,
  subscription: MemberSubscriptionStatus | null | undefined,
  bookingMutation: { isPending: boolean; error?: unknown },
  isCheckingEligibility: boolean
): BookingUIState {
  if (!workout) return "BLOCKED";
  if (isCheckingEligibility || bookingMutation.isPending) return "LOADING";
  if (isWorkoutPast(workout)) return "PAST";

  const status = workout.member_booking_status;
  if (status === "confirmed") return "ALREADY_BOOKED";
  if (status === "en lista de espera") return "WAITLISTED";

  if (subscription?.active_plan === false || subscription?.error_code) {
    return "BLOCKED";
  }

  if ((workout.available_spots ?? 0) > 0) return "CAN_BOOK";

  return "FULL_CAN_WAITLIST";
}

export function getBookingButtonConfig(state: BookingUIState): BookingButtonConfig {
  switch (state) {
    case "LOADING":
      return { label: "Verificando disponibilidad...", disabled: true };
    case "PAST":
      return { label: "Clase concluida", disabled: true };
    case "ALREADY_BOOKED":
      return { label: "Ya reservado", disabled: true };
    case "WAITLISTED":
      return { label: "Ya en la lista de espera", disabled: true };
    case "CAN_BOOK":
      return { label: "Reservar clase", disabled: false };
    case "FULL_CAN_WAITLIST":
      return { label: "Unirse a lista de espera", disabled: false };
    case "BLOCKED":
    default:
      return { label: "Reservas bloqueadas", disabled: true };
  }
}

export function getBookingFeedbackMessage(bookingAction?: BookingAction | null): string | null {
  if (!bookingAction) return null;
  return bookingAction.state === "ADDED_TO_WAITLIST"
    ? "Agregado a la lista de espera. Te promoveremos automáticamente si se abre un lugar."
    : "Reserva confirmada. Tu reserva y créditos ahora están sincronizados.";
}
