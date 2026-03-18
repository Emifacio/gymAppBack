import { useState } from "react";
import { getApiErrorCode, type MemberSubscriptionStatus } from "@gym/api-client";
import { useAuth } from "@/hooks/use-auth";
import { useCreateBooking, useMySubscriptionStatus, useWorkout } from "@/hooks/use-workouts";
import { getBookingEligibilityModalContent, getPrecheckErrorCode } from "@/lib/booking-eligibility";
import { getBookingUIState, getBookingButtonConfig, getBookingFeedbackMessage, type BookingUIState } from "../utils/booking-state";
import type { Workout } from "@gym/api-client";

export interface UseWorkoutBookingResult {
  workout: Workout | null;
  workoutQuery: ReturnType<typeof useWorkout>;
  subscription: MemberSubscriptionStatus | null | undefined;
  bookingState: BookingUIState;
  bookingButtonConfig: { label: string; disabled: boolean };
  bookingFeedbackMessage: string | null;
  bookingMutation: ReturnType<typeof useCreateBooking>;
  eligibilityModal: { title: string; description: string } | null;
  isCheckingEligibility: boolean;
  precheckErrorCode: string | null | undefined;
  handleBook: () => void;
  handleCloseEligibilityModal: () => void;
  handleBookingError: (error: unknown) => void;
}

export function useWorkoutBooking(workoutId: string | undefined): UseWorkoutBookingResult {
  const workoutQuery = useWorkout(workoutId ?? "");
  const subscriptionQuery = useMySubscriptionStatus();
  const bookingMutation = useCreateBooking();

  const [eligibilityModal, setEligibilityModal] = useState<{ title: string; description: string } | null>(null);

  const { session } = useAuth();
  const workout = workoutQuery.data ?? null;
  const subscription = subscriptionQuery.data;
  const isCheckingEligibility = subscriptionQuery.isPending;

  const precheckErrorCode = getPrecheckErrorCode(subscription);

  const bookingState = getBookingUIState(workout, subscription, bookingMutation, isCheckingEligibility);
  const bookingButtonConfig = getBookingButtonConfig(bookingState);
  const bookingFeedbackMessage = getBookingFeedbackMessage(bookingMutation.data ?? null);

  const handleBookingError = (error: unknown) => {
    const code = getApiErrorCode(error);
    const content = getBookingEligibilityModalContent(code);

    if (content) {
      setEligibilityModal(content);
      return;
    }

    setEligibilityModal({
      title: "Error al reservar",
      description: "Algo salió mal con tu reserva. Por favor, inténtalo de nuevo más tarde."
    });
  };

  const handleBook = () => {
    if (!workout || bookingButtonConfig.disabled || !workout.id) return;

    if (bookingState === "PAST") {
      setEligibilityModal({
        title: "Clase finalizada",
        description: "El tiempo de inscripción ha terminado. Por favor, selecciona otra sesión disponible."
      });
      return;
    }

    if (precheckErrorCode) {
      const content = getBookingEligibilityModalContent(precheckErrorCode);
      if (content) {
        setEligibilityModal(content);
      }
      return;
    }

    const memberId = session?.member?.id;
    if (!memberId) {
      setEligibilityModal({
        title: "No autenticado",
        description: "Debes iniciar sesión para reservar esta clase."
      });
      return;
    }

    bookingMutation.mutate(
      { classId: workout.id, memberId },
      {
        onError: (error) => handleBookingError(error),
        onSuccess: () => {
          // we allow cancellation by updating local state via invalidation from hook
        }
      }
    );
  };

  const handleCloseEligibilityModal = () => setEligibilityModal(null);

  return {
    workout,
    workoutQuery,
    subscription,
    bookingState,
    bookingButtonConfig,
    bookingFeedbackMessage,
    bookingMutation,
    eligibilityModal,
    isCheckingEligibility,
    precheckErrorCode,
    handleBook,
    handleCloseEligibilityModal,
    handleBookingError
  };
}
