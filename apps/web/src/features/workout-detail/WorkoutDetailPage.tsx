import { useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { BookingEligibilityModal } from "@/components/booking-eligibility-modal";
import { Card, CardContent, CardEyebrow, CardHeader, CardTitle } from "@/components/ui/Card";
import { useAuth } from "@/hooks/use-auth";
import { useMembers } from "@/hooks/use-workouts";
import { canManageOperations } from "@/lib/roles";
import { isApiResponseError } from "@gym/api-client";
import { WorkoutInfoPanel } from "./components/WorkoutInfoPanel";
import { BookingPanel } from "./components/BookingPanel";
import { AdminPanel } from "./components/AdminPanel";
import { MembersList } from "./components/MembersList";
import { AttendancePanel } from "./components/AttendancePanel";
import { useWorkoutBooking } from "./hooks/useWorkoutBooking";
import { useWorkoutAdmin } from "./hooks/useWorkoutAdmin";
import { buildInstructorNameMap, resolveWorkoutInstructorName } from "./utils/workout.utils";

import { SkeletonWorkoutDetail } from "@/components/ui/skeletons";

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
  const instructorsQuery = useMembers(
    {
      offset: 0,
      limit: 500,
      role: "instructor",
      membership_status: null
    },
    {
      enabled: canManage
    }
  );
  const {
    classMembersQuery,
    classAttendanceQuery,
    assignMemberMutation,
    updateWorkoutMutation,
    deleteWorkoutMutation
  } = useWorkoutAdmin(workoutId, canManage);

  const isPast = useMemo(
    () => (workout ? new Date(workout.scheduled_at) < new Date() : false),
    [workout]
  );
  const instructorsMap = useMemo(
    () => buildInstructorNameMap(instructorsQuery.data ?? []),
    [instructorsQuery.data]
  );
  const resolvedInstructorName = useMemo(
    () => (workout ? resolveWorkoutInstructorName(workout, instructorsMap) : null),
    [instructorsMap, workout]
  );
  const classMemberNamesById = useMemo(
    () =>
      Object.fromEntries(
        (classMembersQuery.data ?? []).map((member) => [member.member_id, member.full_name])
      ),
    [classMembersQuery.data]
  );
  const isLoading = workoutQuery.isPending || isCheckingEligibility || bookingMutation.isPending;
  const isNotFound = workoutQuery.isSuccess && !workout;

  useEffect(() => {
    if (!import.meta.env.DEV || !workoutQuery.data) {
      return;
    }

    console.debug("[WorkoutDetailPage] class detail instructor debug", {
      classId: workoutQuery.data.id,
      instructorId: workoutQuery.data.instructor_id,
      instructor: workoutQuery.data.instructor,
      fallbackInstructorName: workoutQuery.data.instructor_id
        ? instructorsMap[workoutQuery.data.instructor_id]
        : undefined,
      resolvedInstructorName
    });
  }, [instructorsMap, resolvedInstructorName, workoutQuery.data]);

  if (isLoading) {
    return <SkeletonWorkoutDetail />;
  }

  if (
    isNotFound ||
    (workoutQuery.isError &&
      isApiResponseError(workoutQuery.error) &&
      workoutQuery.error.status === 404)
  ) {
    return (
      <div className="pt-10">
        <p className="text-center text-xl text-[var(--accent)]">
          Clase no encontrada o ya eliminada.
        </p>
      </div>
    );
  }

  if (workoutQuery.isError) {
    return (
      <div className="pt-10">
        <p className="text-center text-xl text-[var(--accent)]">
          Error al cargar la clase. Por favor intenta de nuevo.
        </p>
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
      <WorkoutInfoPanel workout={workout!} isPast={isPast} instructorsMap={instructorsMap} />

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
          classMembers={classMembersQuery.data ?? []}
          onDelete={handleDelete}
          assignMemberMutation={assignMemberMutation}
          updateWorkoutMutation={updateWorkoutMutation}
          deleteWorkoutMutation={deleteWorkoutMutation}
        />
      ) : null}

      {canManage ? (
        <div className="grid gap-6 xl:col-span-2 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <CardEyebrow>Lista de inscritos</CardEyebrow>
              <CardTitle>Miembros confirmados</CardTitle>
            </CardHeader>
            <CardContent>
              <MembersList members={classMembersQuery.data ?? []} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardEyebrow>Asistencia</CardEyebrow>
              <CardTitle>Resumen de asistencia</CardTitle>
            </CardHeader>
            <CardContent>
              <AttendancePanel
                attendance={classAttendanceQuery.data ?? []}
                memberNamesById={classMemberNamesById}
              />
            </CardContent>
          </Card>
        </div>
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
