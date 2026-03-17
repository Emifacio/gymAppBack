import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { getApiErrorCode, getApiErrorMessage } from "@gym/api-client";

import { BookingEligibilityModal } from "@/components/booking-eligibility-modal";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/empty-state";
import { useAuth } from "@/hooks/use-auth";
import {
  useAssignMemberToClass,
  useClassAttendance,
  useClassMembers,
  useCreateBooking,
  useDeleteWorkout,
  useMySubscriptionStatus,
  useShareToStrava,
  useUpdateWorkout,
  useWorkout
} from "@/hooks/use-workouts";
import {
  getBookingEligibilityModalContent,
  getPrecheckErrorCode
} from "@/lib/booking-eligibility";
import {
  formatCredits,
  formatDateTime,
  formatWorkoutSchedule,
  toDateTimeLocalValue
} from "@/lib/format";
import { canManageOperations } from "@/lib/roles";

function getFormValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export function WorkoutDetailPage() {
  const navigate = useNavigate();
  const { workoutId = "" } = useParams();
  const { session } = useAuth();
  const [eligibilityModal, setEligibilityModal] = useState<{
    title: string;
    description: string;
  } | null>(null);
  const [isRedirectModal, setIsRedirectModal] = useState(false);
  const workoutQuery = useWorkout(workoutId);
  const canManage = canManageOperations(session?.member);
  const classAttendanceQuery = useClassAttendance(workoutId, canManage);
  const classMembersQuery = useClassMembers(workoutId, canManage);
  const subscriptionQuery = useMySubscriptionStatus();
  const bookingMutation = useCreateBooking();
  const assignMemberMutation = useAssignMemberToClass();
  const updateWorkout = useUpdateWorkout();
  const deleteWorkout = useDeleteWorkout();
  const shareToStrava = useShareToStrava();

  const workout = workoutQuery.data;
  const subscription = subscriptionQuery.data;
  const isCheckingEligibility = subscriptionQuery.isPending;
  const precheckErrorCode = getPrecheckErrorCode(subscription);
  
  const isPast = workout ? new Date(workout.scheduled_at) < new Date() : false;

  const reserveLabel =
    bookingMutation.isPending
      ? "Reservando..."
      : isCheckingEligibility
      ? "Verificando elegibilidad..."
      : isPast
      ? "Clase concluida"
      : workout?.member_booking_status === "confirmed"
      ? "Ya reservado"
      : workout?.member_booking_status === "en lista de espera"
        ? "Ya en la lista de espera"
        : (workout?.available_spots ?? 0) > 0
          ? "Reservar clase"
          : "Unirse a la lista de espera";
  const bookingErrorCode = getApiErrorCode(bookingMutation.error);
  const bookingErrorMessage =
    bookingMutation.error && !getBookingEligibilityModalContent(bookingErrorCode)
      ? getApiErrorMessage(bookingMutation.error)
      : null;
  const bookingFeedbackMessage = bookingMutation.data
    ? bookingMutation.data.state === "ADDED_TO_WAITLIST"
      ? "Agregado a la lista de espera. Te promoveremos automáticamente si se abre un lugar."
      : "Reserva confirmada. Tu reserva y créditos ahora están sincronizados."
    : null;

  function openEligibilityModal(errorCode: string | undefined) {
    if (errorCode === "DUPLICATE_BOOKING") {
      setEligibilityModal({
        title: "Ya reservado",
        description: "Ya tienes una reserva confirmada o una entrada activa en la lista de espera para esta clase."
      });
      return;
    }

    const content = getBookingEligibilityModalContent(errorCode);

    if (content) {
      setEligibilityModal(content);
    }
  }

  if (!workout && workoutQuery.isSuccess) {
    return (
      <EmptyState
        eyebrow="No encontrado"
        title="Esta clase ya no existe"
        description="La ruta está conectada correctamente, pero el backend no devolvió una clase coincidente para el id proporcionado."
      />
    );
  }

  if (!workout) {
    return null;
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
      <section className="glass-panel rounded-[2.25rem] p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[var(--accent)]">Detalle de la clase</p>
        <h1 className="section-title mt-4 text-4xl font-semibold">{workout.name}</h1>
        
        {isPast ? (
          <div className="mt-4 inline-flex items-center rounded-full bg-red-50 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-red-500 border border-red-100">
            <span className="mr-2 h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
            Clase concluida
          </div>
        ) : null}
        <p className="mt-4 text-base leading-8 text-[var(--muted)]">
          {workout.description ??
            "Esta clase se renderiza desde el horario del backend con información de disponibilidad en vivo, lista de espera y estado de reserva."}
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <div className="rounded-[1.75rem] bg-white/80 p-5">
            <p className="text-sm font-semibold text-[var(--ink)]">Horario</p>
            <p className="mt-2 text-sm text-[var(--muted)]">{formatWorkoutSchedule(workout.scheduled_at)}</p>
          </div>
          <div className="rounded-[1.75rem] bg-white/80 p-5">
            <p className="text-sm font-semibold text-[var(--ink)]">Ubicación</p>
            <p className="mt-2 text-sm text-[var(--muted)]">{workout.location}</p>
          </div>
          <div className="rounded-[1.75rem] bg-white/80 p-5">
            <p className="text-sm font-semibold text-[var(--ink)]">Disponibilidad</p>
            <p className="mt-2 text-sm text-[var(--muted)]">
              {typeof workout.available_spots === "number"
                ? `${workout.available_spots} ${workout.available_spots === 1 ? "lugar restante" : "lugares restantes"}`
                : `${workout.capacity} lugares totales`}
            </p>
          </div>
          <div className="rounded-[1.75rem] bg-white/80 p-5">
            <p className="text-sm font-semibold text-[var(--ink)]">Lista de espera</p>
            <p className="mt-2 text-sm text-[var(--muted)]">{workout.waitlist_size ?? 0} miembros esperando</p>
          </div>
          <div className="rounded-[1.75rem] bg-white/80 p-5">
            <p className="text-sm font-semibold text-[var(--ink)]">Duración</p>
            <p className="mt-2 text-sm text-[var(--muted)]">{workout.duration_minutes} minutos</p>
          </div>
          <div className="rounded-[1.75rem] bg-white/80 p-5">
            <p className="text-sm font-semibold text-[var(--ink)]">Instructor</p>
            <p className="mt-2 text-sm text-[var(--muted)]">{workout.instructor?.full_name ?? "Sin asignar"}</p>
          </div>
          <div className="rounded-[1.75rem] bg-white/80 p-5">
            <p className="text-sm font-semibold text-[var(--ink)]">Tu estado</p>
            <p className="mt-2 text-sm capitalize text-[var(--muted)]">
              {workout.member_booking_status ?? "no reservado"}
            </p>
          </div>
        </div>
      </section>

      <aside className="glass-panel rounded-[2.25rem] p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[var(--accent)]">Flujo de reserva</p>
        <h2 className="section-title mt-4 text-3xl font-semibold">Reserva tu lugar</h2>
        <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
          Reserva al instante cuando haya capacidad, únete a la lista de espera cuando la clase esté llena y mantén tus
          créditos alineados con la suscripción activa en tu cuenta.
        </p>

        <div className="mt-6 rounded-[1.5rem] bg-white/80 p-5 text-sm text-[var(--muted)]">
          <p className="font-semibold text-[var(--ink)]">Suscripción activa</p>
          <p className="mt-2">
            {subscription?.active_plan
              ? subscription.plan_name ?? "Plan asignado"
              : subscription?.error_code === "PLAN_EXPIRED"
                ? "Plan expirado"
                : "Sin plan activo asignado"}
          </p>
          <p className="mt-1">
            {subscription?.active_plan
              ? subscription.allows_free_pass
                ? "Ilimitado mientras haya capacidad disponible"
                : formatCredits(subscription.active_credits)
              : "La reserva está bloqueada hasta que tu plan esté activo."}
          </p>
          <p className="mt-1">Fin del periodo: {formatDateTime(subscription?.period_end)}</p>
        </div>

        <form
          className="mt-8 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (isPast) {
              setIsRedirectModal(true);
              setEligibilityModal({
                title: "Clase finalizada",
                description: "El tiempo de inscripción ha terminado. Por favor, selecciona otra sesión disponible."
              });
              return;
            }
            if (isCheckingEligibility) {
              return;
            }
            if (precheckErrorCode) {
              openEligibilityModal(precheckErrorCode);
              return;
            }
            bookingMutation.mutate({
              classId: workout.id,
              memberId: session!.member.id
            }, {
              onError: (error) => {
                openEligibilityModal(getApiErrorCode(error));
              }
            });
          }}
        >
          <Button
            className="w-full"
            disabled={
              isCheckingEligibility ||
              bookingMutation.isPending ||
              workout.member_booking_status === "confirmed" ||
              workout.member_booking_status === "en lista de espera" ||
              isPast
            }
            loading={bookingMutation.isPending}
            type="submit"
            variant="primary"
          >
            {reserveLabel}
          </Button>
          {precheckErrorCode ? (
            <p className="text-sm text-[var(--accent)]">
              Tus créditos semanales se han agotado. Contactate con administración para más información o para ajustar tu plan de membresía.
            </p>
          ) : null}
        </form>

        {bookingFeedbackMessage ? (
          <div className="mt-4 rounded-2xl bg-[rgba(23,184,156,0.12)] px-4 py-3 text-sm text-[var(--highlight)]">
            {bookingFeedbackMessage}
          </div>
        ) : null}

        {bookingErrorMessage ? (
          <div className="mt-4 rounded-2xl bg-[var(--accent-soft)] px-4 py-3 text-sm text-[var(--accent)]">
            {bookingErrorMessage}
          </div>
        ) : null}

        {isPast && workout.member_booking_status === "confirmed" && (
          <div className="mt-8 border-t border-[rgba(19,34,56,0.08)] pt-8">
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
              <p className="mt-3 text-sm text-emerald-600 font-medium">
                ¡Actividad compartida correctamente!
              </p>
            )}
            {shareToStrava.error && (
              <p className="mt-3 text-sm text-rose-600 font-medium">
                {shareToStrava.error.message || "No se pudo compartir la actividad."}
              </p>
            )}
          </div>
        )}

        {canManage ? (
          <form
            className="mt-8 space-y-4 border-t border-[rgba(19,34,56,0.08)] pt-8"
            onSubmit={(event) => {
              event.preventDefault();
              const formData = new FormData(event.currentTarget);
              const memberId = getFormValue(formData, "member_id");

              assignMemberMutation.mutate({
                classId: workout.id,
                memberId,
                payload: { member_id: memberId }
              });
              event.currentTarget.reset();
            }}
          >
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[var(--accent)]">
              Asignación manual
            </p>
            <input
              className="w-full rounded-2xl border border-[rgba(19,34,56,0.08)] bg-white px-4 py-3"
              name="member_id"
              placeholder="ID del miembro"
              required
            />
            <Button className="w-full" loading={assignMemberMutation.isPending} type="submit" variant="secondary">
              {assignMemberMutation.isPending ? "Asignando..." : "Asignar miembro a la clase"}
            </Button>
            {assignMemberMutation.data ? (
              <div className="rounded-2xl bg-[rgba(23,184,156,0.12)] px-4 py-3 text-sm text-[var(--highlight)]">
                {assignMemberMutation.data.message}
              </div>
            ) : null}
          </form>
        ) : null}

        {canManage ? (
          <form
            className="mt-8 space-y-4 border-t border-[rgba(19,34,56,0.08)] pt-8"
            onSubmit={(event) => {
              event.preventDefault();
              const formData = new FormData(event.currentTarget);

              updateWorkout.mutate({
                workoutId: workout.id,
                payload: {
                  name: getFormValue(formData, "name"),
                  location: getFormValue(formData, "location"),
                  instructor_id: getFormValue(formData, "instructor_id") || null,
                  scheduled_at: new Date(getFormValue(formData, "scheduled_at")).toISOString(),
                  description: getFormValue(formData, "description") || null,
                  duration_minutes: Number(formData.get("duration_minutes") ?? workout.duration_minutes),
                  capacity: Number(formData.get("capacity") ?? workout.capacity),
                  status: getFormValue(formData, "status") as "scheduled" | "cancelled" | "completed"
                }
              });
            }}
          >
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[var(--accent)]">
              Gestión de clase
            </p>
            <input className="w-full rounded-2xl border border-[rgba(19,34,56,0.08)] bg-white px-4 py-3" defaultValue={workout.name} name="name" required />
            <input className="w-full rounded-2xl border border-[rgba(19,34,56,0.08)] bg-white px-4 py-3" defaultValue={workout.location} name="location" required />
            <input className="w-full rounded-2xl border border-[rgba(19,34,56,0.08)] bg-white px-4 py-3" defaultValue={workout.instructor_id ?? ""} name="instructor_id" placeholder="ID del instructor" />
            <input className="w-full rounded-2xl border border-[rgba(19,34,56,0.08)] bg-white px-4 py-3" defaultValue={toDateTimeLocalValue(workout.scheduled_at)} name="scheduled_at" required type="datetime-local" />
            <textarea className="min-h-28 w-full rounded-2xl border border-[rgba(19,34,56,0.08)] bg-white px-4 py-3" defaultValue={workout.description ?? ""} name="description" />
            <div className="grid gap-4 md:grid-cols-2">
              <input className="rounded-2xl border border-[rgba(19,34,56,0.08)] bg-white px-4 py-3" defaultValue={workout.duration_minutes} min={15} name="duration_minutes" type="number" />
              <input className="rounded-2xl border border-[rgba(19,34,56,0.08)] bg-white px-4 py-3" defaultValue={workout.capacity} min={1} name="capacity" type="number" />
            </div>
            <select className="w-full rounded-2xl border border-[rgba(19,34,56,0.08)] bg-white px-4 py-3" defaultValue={workout.status} name="status">
              <option value="scheduled">programado</option>
              <option value="cancelled">cancelado</option>
              <option value="completed">completado</option>
            </select>
            <div className="flex flex-wrap gap-3">
              <Button loading={updateWorkout.isPending} type="submit" variant="primary">
                {updateWorkout.isPending ? "Guardando..." : "Guardar cambios"}
              </Button>
              <Button
                disabled={deleteWorkout.isPending}
                loading={deleteWorkout.isPending}
                onClick={() => {
                  deleteWorkout.mutate(
                    { workoutId: workout.id },
                    {
                      onSuccess: () => {
                        void navigate("/workouts");
                      }
                    }
                  );
                }}
                type="button"
                variant="danger"
              >
                {deleteWorkout.isPending ? "Eliminando..." : "Eliminar clase"}
              </Button>
            </div>
          </form>
        ) : null}
      </aside>

      {canManage ? (
        <section className="glass-panel rounded-[2.25rem] p-8 xl:col-span-2">
          <div className="grid gap-6 xl:grid-cols-2">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[var(--accent)]">Lista de inscritos</p>
              <h2 className="section-title mt-3 text-3xl font-semibold">Miembros confirmados</h2>
              <div className="mt-6 grid gap-4">
                {(classMembersQuery.data ?? []).map((member) => (
                  <div key={member.booking_id} className="rounded-[1.5rem] bg-white/80 p-5">
                    <p className="text-sm font-semibold text-[var(--ink)]">{member.full_name}</p>
                    <p className="mt-2 text-sm text-[var(--muted)]">{member.email}</p>
                    <p className="mt-1 text-sm text-[var(--muted)]">
                      reserva de {member.booking_type}
                      {member.credits_consumed ? ` · ${member.credits_consumed} ${member.credits_consumed === 1 ? 'crédito usado' : 'créditos usados'}` : ""}
                    </p>
                  </div>
                ))}
                {!classMembersQuery.data?.length ? (
                  <div className="rounded-[1.5rem] bg-white/80 p-5 text-sm text-[var(--muted)]">
                    Aún no hay miembros confirmados para esta clase.
                  </div>
                ) : null}
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[var(--accent)]">Asistencia</p>
              <h2 className="section-title mt-3 text-3xl font-semibold">Resumen de asistencia</h2>
              <div className="mt-6 grid gap-4">
                {(classAttendanceQuery.data ?? []).map((record) => (
                  <div key={record.id} className="rounded-[1.5rem] bg-white/80 p-5">
                    <p className="text-sm font-semibold text-[var(--ink)]">{record.member_id}</p>
                    <p className="mt-2 text-sm text-[var(--muted)]">
                      Estado: {record.status === "present" ? "presente" : record.status === "absent" ? "ausente" : record.status} · Marcado el {formatWorkoutSchedule(record.marked_at)}
                    </p>
                  </div>
                ))}
                {!classAttendanceQuery.data?.length ? (
                  <div className="rounded-[1.5rem] bg-white/80 p-5 text-sm text-[var(--muted)]">
                    Aún no se ha marcado asistencia para esta clase.
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <BookingEligibilityModal
        description={eligibilityModal?.description ?? ""}
        onClose={() => {
          setEligibilityModal(null);
          setIsRedirectModal(false);
        }}
        open={eligibilityModal !== null}
        title={eligibilityModal?.title ?? ""}
        actionLabel={isRedirectModal ? "Ver próximas clases" : undefined}
        onAction={isRedirectModal ? () => navigate("/workouts") : undefined}
      />
    </div>
  );
}
