import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";

import { buttonClassName } from "@/components/ui/Button";
import { EmptyState } from "@/components/empty-state";
import { StatCard } from "@/components/stat-card";
import { WorkoutCard } from "@/components/workout-card";
import { useAuth } from "@/hooks/use-auth";
import { useMemberBookings, useMySubscriptionStatus, useWorkouts } from "@/hooks/use-workouts";
import { formatCredits, formatDateTime, formatRelativeSlot } from "@/lib/format";

export function DashboardPage() {
  const { session } = useAuth();

  if (!session) {
    return null;
  }

  const workoutsQuery = useWorkouts({ limit: 6 });
  const bookingsQuery = useMemberBookings(session.member.id);
  const subscriptionQuery = useMySubscriptionStatus();

  const workouts = workoutsQuery.data ?? [];
  const bookings = bookingsQuery.data?.bookings ?? [];
  const waitlist = bookingsQuery.data?.waitlist ?? [];
  const confirmedBookings = bookings.filter((booking) => booking.status === "confirmed");
  const activeWaitlist = waitlist.filter((entry) => entry.status === "waiting");
  const subscription = subscriptionQuery.data;
  const upcomingWorkout = workouts[0];

  const showEmptyState = !workouts.length && workoutsQuery.isSuccess;

  return (
    <div className="space-y-[var(--section-gap)]">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
          <Sparkles className="h-7 w-7" />
        </div>
        <div>
          <h2 className="section-title text-[var(--font-size-2xl)]">
            Buenos días, {session?.member.full_name.split(' ')[0]}
          </h2>
          <p className="mt-1 text-sm font-medium text-[var(--ink-500)] lg:text-base">
            Tienes {confirmedBookings.length} clases programadas para esta semana.
          </p>
        </div>
      </header>

      <section className="grid gap-[var(--stack-gap)] sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          id="tour-credits"
          detail={
            subscription?.active_plan
              ? `Se renueva el ${formatDateTime(subscription.period_end)}.`
              : "Asigna una suscripción para desbloquear reservas."
          }
          label={subscription?.plan_name ?? "Plan activo"}
          value={
            subscription?.active_plan
              ? subscription.allows_free_pass
                ? "Pase libre"
                : formatCredits(subscription.active_credits)
              : "Sin plan activo"
          }
        />
        <StatCard
          detail="Reservas confirmadas en tu feed."
          label="Mis reservas"
          value={String(confirmedBookings.length)}
        />
        <StatCard
          detail="Clases disponibles para reservar hoy."
          label="Próximas clases"
          value={String(workouts.length)}
        />
      </section>

      {showEmptyState ? (
        <EmptyState
          eyebrow="Listo para crecer"
          title="Aún no hay entrenamientos programados"
          description="El stack frontend está activo y conectado al contrato de FastAPI. Tan pronto como se creen clases en el backend, aparecerán aquí automáticamente con total seguridad de tipos."
        />
      ) : (
        <>
          <section className="grid gap-[var(--section-gap)] lg:grid-cols-2">
            <div className="apple-card">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--accent)]">
                Suscripción
              </p>
              <h2 className="section-title mt-2 text-[var(--font-size-xl)]">Resumen de membresía</h2>
              {subscription?.active_plan ? (
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-[1.25rem] bg-[var(--bg-main)] p-4">
                    <p className="text-xs font-bold text-[var(--ink-500)] uppercase">Plan</p>
                    <p className="mt-1 text-sm font-semibold text-[var(--ink-900)]">{subscription.plan_name}</p>
                  </div>
                  <div className="rounded-[1.25rem] bg-[var(--bg-main)] p-4">
                    <p className="text-xs font-bold text-[var(--ink-500)] uppercase">Créditos restantes</p>
                    <p className="mt-1 text-sm font-semibold text-[var(--ink-900)]">
                      {subscription.allows_free_pass
                        ? "Ilimitados"
                        : formatCredits(subscription.active_credits)}
                    </p>
                  </div>
                  <div className="rounded-[1.25rem] bg-[var(--bg-main)] p-4">
                    <p className="text-xs font-bold text-[var(--ink-500)] uppercase">Fin del periodo</p>
                    <p className="mt-1 text-sm font-semibold text-[var(--ink-900)]">{formatDateTime(subscription.period_end)}</p>
                  </div>
                  <div className="rounded-[1.25rem] bg-[var(--bg-main)] p-4">
                    <p className="text-xs font-bold text-[var(--ink-500)] uppercase">Lista de espera</p>
                    <p className="mt-1 text-sm font-semibold text-[var(--ink-900)]">{activeWaitlist.length} entradas</p>
                  </div>
                </div>
              ) : (
                <div className="mt-6 rounded-[1.25rem] bg-[var(--bg-main)] p-5 text-sm font-medium text-[var(--ink-500)]">
                  {subscription?.error_code === "PLAN_EXPIRED"
                    ? `Tu último plan expiró el ${formatDateTime(subscription.period_end)}.`
                    : "Aún no se ha asignado una suscripción activa."}
                </div>
              )}
            </div>

            <div className="apple-card">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--accent)]">
            Estado de reserva
          </p>
          <h2 className="section-title mt-2 text-[var(--font-size-xl)]">Vista general de reservas</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-[1.25rem] bg-[var(--bg-main)] p-4">
              <p className="text-xs font-bold text-[var(--ink-500)] uppercase">Confirmadas</p>
              <p className="mt-1 text-sm font-semibold text-[var(--ink-900)]">{confirmedBookings.length} reservas</p>
            </div>
            <div className="rounded-[1.25rem] bg-[var(--bg-main)] p-4">
              <p className="text-xs font-bold text-[var(--ink-500)] uppercase">Lista de espera</p>
              <p className="mt-1 text-sm font-semibold text-[var(--ink-900)]">{activeWaitlist.length} pendientes</p>
            </div>
            <div className="rounded-[1.25rem] bg-[var(--bg-main)] p-4 sm:col-span-2">
              <p className="text-xs font-bold text-[var(--ink-500)] uppercase">Próxima clase</p>
              <p className="mt-1 text-sm font-semibold text-[var(--ink-900)]">
                {upcomingWorkout ? formatRelativeSlot(upcomingWorkout.scheduled_at) : "Sin clases aún."}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[var(--accent)]">Próximamente</p>
            <h2 className="section-title mt-1 text-3xl font-semibold">Sesiones de entrenamiento</h2>
          </div>
          <Link className={buttonClassName({ size: "sm", variant: "ghost" })} to="/workouts">
            Ver todas
          </Link>
        </div>

        <div className="grid gap-5">
          {workouts.slice(0, 3).map((workout) => (
            <WorkoutCard key={workout.id} workout={workout} />
          ))}
        </div>
      </section>
    </>
      )}
    </div>
  );
}
