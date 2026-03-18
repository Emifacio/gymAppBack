import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { BookingEligibilityModal } from "@/components/booking-eligibility-modal";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/hooks/use-auth";
import { useShareToStrava } from "@/hooks/use-workouts";
import { canManageOperations } from "@/lib/roles";
import { WorkoutInfoPanel } from "./components/WorkoutInfoPanel";
import { BookingPanel } from "./components/BookingPanel";
import { AdminPanel } from "./components/AdminPanel";
import { MembersList } from "./components/MembersList";
import { AttendancePanel } from "./components/AttendancePanel";
import { useWorkoutBooking } from "./hooks/useWorkoutBooking";
import { useWorkoutAdmin } from "./hooks/useWorkoutAdmin";

export function WorkoutDetailPage() {
  const { workoutId = "" } = useParams();
  const navigate = useNavigate();
  const { session } = useAuth();

  const {
    workout,
    subscription,
    bookingButtonConfig,
    bookingFeedbackMessage,
    bookingState,
    bookingMutation,
    precheckErrorCode,
    eligibilityModal,
    isCheckingEligibility,
    handleBook,
    handleCloseEligibilityModal
  } = useWorkoutBooking(workoutId);

  const canManage = canManageOperations(session?.member);
  const { classMembersQuery, classAttendanceQuery, assignMemberMutation, updateWorkoutMutation, deleteWorkoutMutation } = useWorkoutAdmin(workoutId);
  const shareToStrava = useShareToStrava();

  const isLoading = !workout && (isCheckingEligibility || bookingMutation.isPending);
  const isPast = useMemo(() => (workout ? new Date(workout.scheduled_at) < new Date() : false), [workout]);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!workout) {
    return (
      <div className="pt-10">
        <p className="text-center text-xl text-[var(--accent)]">Clase no encontrada o ya eliminada.</p>
      </div>
    );
  }

  const handleDelete = async () => {
    await deleteWorkoutMutation.mutateAsync({ workoutId: workout.id });
    void navigate("/workouts");
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
      <WorkoutInfoPanel workout={workout} isPast={isPast} />

      <BookingPanel
        bookingButtonConfig={bookingButtonConfig}
        bookingState={bookingState}
        bookingFeedbackMessage={bookingFeedbackMessage}
        bookingMutationPending={bookingMutation.isPending}
        subscription={subscription}
        precheckErrorCode={precheckErrorCode}
        eligibilityModal={eligibilityModal}
        onBook={handleBook}
        onCloseModal={handleCloseEligibilityModal}
        onRedirect={() => navigate("/workouts")}
      />

      {isPast && workout.member_booking_status === "confirmed" && (
        <div className="xl:col-span-2 glass-panel rounded-[2.25rem] p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#FC4C02]">Integración Strava</p>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Comparte tu esfuerzo. Envía esta sesión a tu cuenta de Strava para registrar tus estadísticas de entrenamiento.
          </p>
          <Button
            className="mt-4 w-full bg-[#FC4C02] text-white hover:bg-[#E34402]"
            disabled={shareToStrava.isPending}
            loading={shareToStrava.isPending}
            onClick={() => {
              shareToStrava.mutate({ bookingId: workout.id }, {
                onSuccess: (data) => {
                  if (data.external_url) {
                    window.open(data.external_url, "_blank");
                  }
                }
              });
            }}
            variant="primary"
          >
            {shareToStrava.isPending ? "Compartiendo..." : "Compartir en Strava"}
          </Button>
          {shareToStrava.isSuccess && (
            <p className="mt-3 text-sm text-emerald-600 font-medium">¡Actividad compartida correctamente!</p>
          )}
          {shareToStrava.error && (
            <p className="mt-3 text-sm text-rose-600 font-medium">
              {shareToStrava.error instanceof Error
                ? shareToStrava.error.message
                : "No se pudo compartir la actividad."}
            </p>
          )}
        </div>
      )}

      {canManage ? (
        <AdminPanel
          workout={workout}
          onDelete={handleDelete}
          assignMemberMutation={assignMemberMutation}
          updateWorkoutMutation={updateWorkoutMutation}
          deleteWorkoutMutation={deleteWorkoutMutation}
        />
      ) : null}

      {canManage ? (
        <section className="glass-panel rounded-[2.25rem] p-8 xl:col-span-2">
          <div className="grid gap-6 xl:grid-cols-2">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[var(--accent)]">Lista de inscritos</p>
              <h2 className="section-title mt-3 text-3xl font-semibold">Miembros confirmados</h2>
              <div className="mt-6">
                <MembersList members={classMembersQuery.data ?? []} />
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[var(--accent)]">Asistencia</p>
              <h2 className="section-title mt-3 text-3xl font-semibold">Resumen de asistencia</h2>
              <div className="mt-6">
                <AttendancePanel attendance={classAttendanceQuery.data ?? []} />
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <BookingEligibilityModal
        onClose={handleCloseEligibilityModal}
        open={eligibilityModal !== null}
        title={eligibilityModal?.title ?? ""}
        description={eligibilityModal?.description ?? ""}
      />
    </div>
  );
}
