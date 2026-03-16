import { useAuth } from "@/hooks/use-auth";
import {
  useCancelBooking,
  useMemberAttendance,
  useMemberBookings,
  useMySubscriptionStatus
} from "@/hooks/use-workouts";
import { formatCredits, formatDateTime, formatWorkoutSchedule } from "@/lib/format";

export function BookingsPage() {
  const { session } = useAuth();
  const bookingsQuery = useMemberBookings(session!.member.id);
  const attendanceQuery = useMemberAttendance(session!.member.id);
  const subscriptionQuery = useMySubscriptionStatus();
  const cancelBooking = useCancelBooking();

  const bookings = bookingsQuery.data?.bookings ?? [];
  const waitlist = bookingsQuery.data?.waitlist ?? [];
  const attendance = attendanceQuery.data ?? [];
  const subscription = subscriptionQuery.data;

  return (
    <div className="space-y-6">
      <section className="glass-panel rounded-[2rem] p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[var(--accent)]">Operaciones de miembro</p>
        <h1 className="section-title mt-3 text-4xl font-semibold">Tus reservas e historial</h1>
        <p className="mt-3 max-w-3xl text-sm leading-8 text-[var(--muted)]">
          Haz un seguimiento de reservas confirmadas, listas de espera y cómo cambian los créditos de tu plan a medida que se reservan,
          cancelan o promueven clases de la lista de espera.
        </p>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-[1.5rem] bg-white/80 p-5">
            <p className="text-sm font-semibold text-[var(--ink)]">Plan</p>
            <p className="mt-2 text-sm text-[var(--muted)]">
              {subscription?.active_plan
                ? subscription.plan_name
                : subscription?.error_code === "PLAN_EXPIRED"
                  ? "Plan expirado"
                  : "Sin plan activo"}
            </p>
          </div>
          <div className="rounded-[1.5rem] bg-white/80 p-5">
            <p className="text-sm font-semibold text-[var(--ink)]">Créditos</p>
            <p className="mt-2 text-sm text-[var(--muted)]">
              {subscription?.active_plan
                ? subscription.allows_free_pass
                  ? "Ilimitado mientras queden lugares"
                  : formatCredits(subscription.active_credits)
                : "Reserva no disponible"}
            </p>
          </div>
          <div className="rounded-[1.5rem] bg-white/80 p-5">
            <p className="text-sm font-semibold text-[var(--ink)]">Fin del periodo</p>
            <p className="mt-2 text-sm text-[var(--muted)]">{formatDateTime(subscription?.period_end)}</p>
          </div>
        </div>

        {cancelBooking.data ? (
          <div className="mt-6 rounded-[1.5rem] bg-[rgba(23,184,156,0.12)] px-4 py-3 text-sm text-[var(--highlight)]">
            Cancelación completada.
            {cancelBooking.data.credit_restored ? " Crédito restaurado a tu suscripción." : ""}
            {cancelBooking.data.promoted_booking ? " El siguiente miembro elegible de la lista de espera fue promovido." : ""}
          </div>
        ) : null}
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="glass-panel rounded-[2rem] p-8">
          <h2 className="section-title text-3xl font-semibold">Reservas</h2>
          <div className="mt-6 space-y-4">
            {bookings.map((booking) => (
              <div key={booking.id} className="rounded-[1.5rem] bg-white/80 p-5">
                <p className="text-lg font-semibold text-[var(--ink)]">
                  {booking.gym_class?.name ?? booking.class_id}
                </p>
                <p className="mt-2 text-sm text-[var(--muted)]">
                  {booking.gym_class?.scheduled_at
                    ? formatWorkoutSchedule(booking.gym_class.scheduled_at)
                    : formatWorkoutSchedule(booking.booked_at)}
                </p>
                <p className="mt-1 text-sm text-[var(--muted)]">Estado: {booking.status === "confirmed" ? "confirmado" : booking.status}</p>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  Tipo de reserva: {booking.booking_type}
                  {booking.credits_consumed ? ` · Créditos usados: ${booking.credits_consumed}` : ""}
                </p>
                <button
                  className="mt-4 rounded-full border border-[rgba(255,122,89,0.3)] px-4 py-2 text-sm font-semibold text-[var(--accent)]"
                  disabled={cancelBooking.isPending || booking.status !== "confirmed"}
                  onClick={() => {
                    cancelBooking.mutate({
                      bookingId: booking.id,
                      memberId: session!.member.id
                    });
                  }}
                  type="button"
                >
                  {booking.status === "confirmed" ? "Cancelar reserva" : "No cancelable"}
                </button>
              </div>
            ))}

            {!bookings.length ? (
              <div className="rounded-[1.5rem] bg-white/80 p-5 text-sm text-[var(--muted)]">
                Aún no tienes reservas.
              </div>
            ) : null}
          </div>
        </div>

        <div className="glass-panel rounded-[2rem] p-8">
          <h2 className="section-title text-3xl font-semibold">Lista de espera</h2>
          <div className="mt-6 space-y-4">
            {waitlist.map((entry) => (
              <div key={entry.id} className="rounded-[1.5rem] bg-white/80 p-5">
                <p className="text-lg font-semibold text-[var(--ink)]">
                  {entry.gym_class?.name ?? entry.class_id}
                </p>
                <p className="mt-2 text-sm text-[var(--muted)]">
                  Posición {entry.position} · Estado {entry.status === "waiting" ? "en espera" : entry.status}
                </p>
                <button
                  className="mt-4 rounded-full border border-[rgba(255,122,89,0.3)] px-4 py-2 text-sm font-semibold text-[var(--accent)]"
                  disabled={cancelBooking.isPending || entry.status !== "waiting"}
                  onClick={() => {
                    cancelBooking.mutate({
                      bookingId: entry.id,
                      memberId: session!.member.id
                    });
                  }}
                  type="button"
                >
                  {entry.status === "waiting" ? "Salir de la lista de espera" : "No cancelable"}
                </button>
              </div>
            ))}

            {!waitlist.length ? (
              <div className="rounded-[1.5rem] bg-white/80 p-5 text-sm text-[var(--muted)]">
                No estás en ninguna lista de espera.
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section className="glass-panel rounded-[2rem] p-8">
        <h2 className="section-title text-3xl font-semibold">Historial de asistencia</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {attendance.map((record) => (
            <div key={record.id} className="rounded-[1.5rem] bg-white/80 p-5">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
                {record.status === "present" ? "presente" : "ausente"}
              </p>
              <p className="mt-2 text-sm text-[var(--muted)]">ID de clase: {record.class_id}</p>
              <p className="mt-1 text-sm text-[var(--muted)]">Marcado el: {formatWorkoutSchedule(record.marked_at)}</p>
            </div>
          ))}

          {!attendance.length ? (
            <div className="rounded-[1.5rem] bg-white/80 p-5 text-sm text-[var(--muted)]">
              Aún no hay registros de asistencia.
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
