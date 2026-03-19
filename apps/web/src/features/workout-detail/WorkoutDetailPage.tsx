import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { BookingEligibilityModal } from "@/components/booking-eligibility-modal";
import { useAuth } from "@/hooks/use-auth";
import { canManageOperations } from "@/lib/roles";
import { isApiResponseError } from "@gym/api-client";
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
    workoutQuery,
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
  const { classMembersQuery, classAttendanceQuery, assignMemberMutation, updateWorkoutMutation, deleteWorkoutMutation } = useWorkoutAdmin(workoutId, canManage);

  const isPast = useMemo(() => (workout ? new Date(workout.scheduled_at) < new Date() : false), [workout]);
  const isLoading = workoutQuery.isPending || isCheckingEligibility || bookingMutation.isPending;
  const isNotFound = workoutQuery.isSuccess && !workout;

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (isNotFound || (workoutQuery.isError && isApiResponseError(workoutQuery.error) && workoutQuery.error.status === 404)) {
    return (
      <div className="pt-10">
        <p className="text-center text-xl text-[var(--accent)]">Clase no encontrada o ya eliminada.</p>
      </div>
    );
  }

  if (workoutQuery.isError) {
    return (
      <div className="pt-10">
        <p className="text-center text-xl text-[var(--accent)]">Error al cargar la clase. Por favor intenta de nuevo.</p>
      </div>
    );
  }

  const handleDelete = async () => {
    if (!workout) return;
    await deleteWorkoutMutation.mutateAsync({ workoutId: workout.id });
    void navigate("/workouts");
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
      <WorkoutInfoPanel workout={workout!} isPast={isPast} />

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

      {canManage ? (
        <AdminPanel
          workout={workout!}
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
