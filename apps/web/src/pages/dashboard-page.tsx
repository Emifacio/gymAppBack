import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { StatCard } from "@/components/stat-card";
import { WorkoutCard } from "@/components/workout-card";
import { Skeleton } from "@/components/ui/skeletons";
import { buttonClassName } from "@/components/ui/button-utils";
import { useAuth } from "@/hooks/use-auth";
import { useRandomMessage } from "@/hooks/use-random-message";
import { useMemberBookings, useMySubscriptionStatus, useWorkouts } from "@/hooks/use-workouts";
import { getDashboardMotivationMessages } from "@/lib/dashboard-motivation";
import { formatCredits, formatDateTime, formatRelativeSlot } from "@/lib/format";
import { filterActionableWaitlistEntries } from "@/lib/waitlist";
import type { Booking, Subscription, Workout } from "@/types/gym";

function DashboardSectionSkeleton({ compact = false }: { compact?: boolean }) {
  return (
    <div className="mt-6 grid gap-4 sm:grid-cols-2">
      {[1, 2, 3].map((index) => (
        <div
          key={index}
          className={`rounded-[1.25rem] bg-[var(--bg-surface-secondary)] p-5 shadow-sm ${
            !compact && index === 3 ? "sm:col-span-2" : ""
          }`}
        >
          <Skeleton className="h-3 w-20" />
          <Skeleton className="mt-3 h-5 w-28" />
        </div>
      ))}
      {compact ? (
        <div className="rounded-[1.25rem] bg-[var(--bg-surface-secondary)] p-5 shadow-sm">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="mt-3 h-5 w-28" />
        </div>
      ) : null}
    </div>
  );
}

export function DashboardPage() {
  const { session } = useAuth();

  const workoutsQuery = useWorkouts({ limit: 6 });
  const bookingsQuery = useMemberBookings(session?.member.id ?? "", {
    enabled: Boolean(session?.member.id)
  });
  const subscriptionQuery = useMySubscriptionStatus({ enabled: Boolean(session) });

  const workouts: Workout[] = useMemo(() => workoutsQuery.data ?? [], [workoutsQuery.data]);
  const bookings: Booking[] = useMemo(
    () => bookingsQuery.data?.bookings ?? [],
    [bookingsQuery.data]
  );
  const waitlist = useMemo(
    () => filterActionableWaitlistEntries(bookingsQuery.data?.waitlist ?? []),
    [bookingsQuery.data]
  );
  const confirmedBookings = bookings.filter((booking) => booking.status === "confirmed");
  const activeWaitlist = waitlist;
  const subscription: Subscription | undefined = subscriptionQuery.data;
  const firstName = session?.member.full_name.split(" ")[0] ?? "";
  const dashboardMotivationMessages = useMemo(
    () => getDashboardMotivationMessages(firstName),
    [firstName]
  );
  const motivationalEmptyStateMessage = useRandomMessage(dashboardMotivationMessages);

  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const clock = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(clock);
  }, []);

  useEffect(() => {
    const refresh = setInterval(() => {
      void workoutsQuery.refetch?.();
    }, 60_000);
    return () => clearInterval(refresh);
  }, [workoutsQuery]);

  const upcomingWorkouts = useMemo(() => {
    return workouts
      .filter((workout) => new Date(workout.scheduled_at) > now)
      .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());
  }, [workouts, now]);

  const upcomingWorkout = upcomingWorkouts[0];
  const isInitialWorkoutsLoading = workoutsQuery.isLoading;
  const isInitialBookingsLoading = bookingsQuery.isLoading;
  const isInitialSubscriptionLoading = subscriptionQuery.isLoading;
  const hasUpcomingWorkouts = upcomingWorkouts.length > 0;
  const dashboardSubtitle = isInitialBookingsLoading
    ? "Estamos preparando tu resumen de hoy."
    : `Tienes ${confirmedBookings.length} clases programadas para esta semana.`;
  const shouldRenderMembershipSection = isInitialSubscriptionLoading || subscriptionQuery.isSuccess;
  const shouldRenderOverviewSection =
    isInitialBookingsLoading ||
    isInitialWorkoutsLoading ||
    bookingsQuery.isSuccess ||
    workoutsQuery.isSuccess;
  const shouldRenderAgendaSection = hasUpcomingWorkouts;
  const shouldRenderEmptyState = workoutsQuery.isSuccess && !hasUpcomingWorkouts;

  useEffect(() => {
    if (!import.meta.env.DEV) {
      return;
    }

    console.debug("[DashboardPage] section visibility", {
      isInitialWorkoutsLoading,
      isInitialBookingsLoading,
      isInitialSubscriptionLoading,
      workoutsCount: workouts.length,
      confirmedBookingsCount: confirmedBookings.length,
      activeWaitlistCount: activeWaitlist.length,
      hasUpcomingWorkouts,
      shouldRenderMembershipSection,
      shouldRenderOverviewSection,
      shouldRenderAgendaSection,
      shouldRenderEmptyState
    });
  }, [
    activeWaitlist.length,
    confirmedBookings.length,
    hasUpcomingWorkouts,
    isInitialBookingsLoading,
    isInitialSubscriptionLoading,
    isInitialWorkoutsLoading,
    shouldRenderAgendaSection,
    shouldRenderEmptyState,
    shouldRenderMembershipSection,
    shouldRenderOverviewSection,
    workouts.length
  ]);

  if (!session) {
    return null;
  }

  return (
    <div className="space-y-[var(--section-gap)] transition-colors duration-300">
      <header className="flex flex-col gap-6 sm:flex-row sm:items-center">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[var(--accent)] text-[var(--text-on-accent)] shadow-lg shadow-[var(--accent-soft)]">
          <Sparkles className="h-8 w-8" />
        </div>
        <div>
          <h2 className="section-title text-[var(--font-size-2xl)] text-[var(--text-primary)] leading-tight">
            Buenos días, {firstName}
          </h2>
          <p className="mt-1 text-sm font-medium text-[var(--text-secondary)] lg:text-base opacity-80">
            {dashboardSubtitle}
          </p>
        </div>
      </header>

      <section className="grid gap-[var(--stack-gap)] sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          id="tour-credits"
          detail={
            subscription?.active_plan
              ? `Vence: ${formatDateTime(subscription.period_end)}`
              : "Asigna una suscripción para reservar."
          }
          label={subscription?.plan_name ?? "Plan activo"}
          value={
            subscription?.active_plan
              ? subscription.allows_free_pass
                ? "Pase libre"
                : formatCredits(subscription.active_credits)
              : "Sin plan activo"
          }
          loading={isInitialSubscriptionLoading}
        />
        <StatCard
          detail="Reservas confirmadas"
          label="Mis reservas"
          value={String(confirmedBookings.length)}
          loading={isInitialBookingsLoading}
        />
        <StatCard
          detail="Clases disponibles hoy"
          label="Próximas clases"
          value={String(upcomingWorkouts.length)}
          loading={isInitialWorkoutsLoading}
        />
      </section>

      {shouldRenderMembershipSection || shouldRenderOverviewSection ? (
        <section className="grid gap-[var(--section-gap)] lg:grid-cols-2">
          {shouldRenderMembershipSection ? (
            <div className="apple-card">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--accent)]">
                Suscripción
              </p>
              <h2 className="section-title mt-2 text-[var(--font-size-xl)] text-[var(--text-primary)]">
                Membresía
              </h2>
              {isInitialSubscriptionLoading ? (
                <DashboardSectionSkeleton compact />
              ) : subscription?.active_plan ? (
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-[1.25rem] bg-[var(--bg-surface-secondary)] p-5 border border-transparent hover:border-[var(--border-base)] transition-colors shadow-sm">
                    <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-tight">
                      Plan
                    </p>
                    <p className="mt-1 text-sm font-bold text-[var(--text-primary)]">
                      {subscription.plan_name}
                    </p>
                  </div>
                  <div className="rounded-[1.25rem] bg-[var(--bg-surface-secondary)] p-5 border border-transparent hover:border-[var(--border-base)] transition-colors shadow-sm">
                    <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-tight">
                      Créditos
                    </p>
                    <p className="mt-1 text-sm font-bold text-[var(--text-primary)]">
                      {subscription.allows_free_pass
                        ? "Ilimitados"
                        : formatCredits(subscription.active_credits)}
                    </p>
                  </div>
                  <div className="rounded-[1.25rem] bg-[var(--bg-surface-secondary)] p-5 border border-transparent hover:border-[var(--border-base)] transition-colors shadow-sm">
                    <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-tight">
                      Vencimiento
                    </p>
                    <p className="mt-1 text-sm font-bold text-[var(--text-primary)]">
                      {formatDateTime(subscription.period_end)}
                    </p>
                  </div>
                  <div className="rounded-[1.25rem] bg-[var(--bg-surface-secondary)] p-5 border border-transparent hover:border-[var(--border-base)] transition-colors shadow-sm">
                    <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-tight">
                      Espera
                    </p>
                    <p className="mt-1 text-sm font-bold text-[var(--text-primary)]">
                      {activeWaitlist.length} entradas
                    </p>
                  </div>
                </div>
              ) : (
                <div className="mt-6 rounded-[1.25rem] bg-[var(--bg-surface-secondary)] p-6 text-sm font-medium text-[var(--text-secondary)] shadow-sm">
                  {subscription?.error_code === "PLAN_EXPIRED"
                    ? `Expiró el ${formatDateTime(subscription.period_end)}.`
                    : "No hay suscripción activa."}
                </div>
              )}
            </div>
          ) : null}

          {shouldRenderOverviewSection ? (
            <div className="apple-card">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--accent)]">
                Estado
              </p>
              <h2 className="section-title mt-2 text-[var(--font-size-xl)] text-[var(--text-primary)]">
                Vista general
              </h2>
              {isInitialBookingsLoading || isInitialWorkoutsLoading ? (
                <DashboardSectionSkeleton />
              ) : (
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-[1.25rem] bg-[var(--bg-surface-secondary)] p-5 border border-transparent hover:border-[var(--border-base)] transition-colors shadow-sm">
                    <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-tight">
                      Confirmadas
                    </p>
                    <p className="mt-1 text-sm font-bold text-[var(--text-primary)]">
                      {confirmedBookings.length} reservas
                    </p>
                  </div>
                  <div className="rounded-[1.25rem] bg-[var(--bg-surface-secondary)] p-5 border border-transparent hover:border-[var(--border-base)] transition-colors shadow-sm">
                    <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-tight">
                      Pendientes
                    </p>
                    <p className="mt-1 text-sm font-bold text-[var(--text-primary)]">
                      {activeWaitlist.length} en espera
                    </p>
                  </div>
                  <div className="rounded-[1.25rem] bg-[var(--bg-surface-secondary)] p-5 sm:col-span-2 border border-transparent hover:border-[var(--border-base)] transition-colors shadow-sm">
                    <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-tight">
                      Próxima sesión
                    </p>
                    <p className="mt-1 text-sm font-bold text-[var(--text-primary)]">
                      {upcomingWorkout
                        ? formatRelativeSlot(upcomingWorkout.scheduled_at)
                        : "Sin clases pronto."}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </section>
      ) : null}

      {shouldRenderAgendaSection ? (
        <section className="space-y-6">
          <div className="flex items-end justify-between px-2">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--accent)] opacity-80">
                Próximamente
              </p>
              <h2 className="section-title mt-1 text-3xl font-bold text-[var(--text-primary)]">
                Tu Agenda
              </h2>
            </div>
            <Link
              className={
                buttonClassName({ size: "sm", variant: "ghost" }) +
                " text-[var(--accent)] font-bold"
              }
              to="/workouts"
            >
              Explorar todas →
            </Link>
          </div>

          <div className="grid gap-6">
            {upcomingWorkouts.slice(0, 3).map((workout) => (
              <WorkoutCard key={workout.id} workout={workout} />
            ))}
          </div>
        </section>
      ) : null}

      {shouldRenderEmptyState ? (
        <EmptyState
          eyebrow="Tu impulso"
          title="Hoy también cuenta"
          description={motivationalEmptyStateMessage}
        />
      ) : null}
    </div>
  );
}
