import { Link } from "react-router-dom";

import { buttonClassName } from "@/components/ui/Button";
import { EmptyState } from "@/components/empty-state";
import { StatCard } from "@/components/stat-card";
import { WorkoutCard } from "@/components/workout-card";
import { useAuth } from "@/hooks/use-auth";
import { useMemberBookings, useMySubscriptionStatus, useWorkouts } from "@/hooks/use-workouts";
import { formatCredits, formatDateTime, formatRelativeSlot } from "@/lib/format";

export function DashboardPage() {
  const { session } = useAuth();
  const workoutsQuery = useWorkouts({ limit: 6 });
  const bookingsQuery = useMemberBookings(session!.member.id);
  const subscriptionQuery = useMySubscriptionStatus();

  const workouts = workoutsQuery.data ?? [];
  const bookings = bookingsQuery.data?.bookings ?? [];
  const waitlist = bookingsQuery.data?.waitlist ?? [];
  const confirmedBookings = bookings.filter((booking) => booking.status === "confirmed");
  const activeWaitlist = waitlist.filter((entry) => entry.status === "waiting");
  const subscription = subscriptionQuery.data;
  const upcomingWorkout = workouts[0];

  if (!workouts.length && workoutsQuery.isSuccess) {
    return (
      <EmptyState
        eyebrow="Ready to grow"
        title="No workouts are scheduled yet"
        description="The frontend stack is live and wired to the FastAPI contract. As soon as classes are created in the backend, they’ll land here automatically with full type safety."
      />
    );
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <div className="glass-panel overflow-hidden rounded-[2.5rem] p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[var(--accent)]">
                Typed training command center
              </p>
              <h2 className="section-title mt-4 text-4xl font-semibold md:text-5xl">
                Real backend data, one shared contract, zero duplicated types.
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-8 text-[var(--muted)]">
                This dashboard is powered by the generated OpenAPI client, TanStack Query, shared session
                state, and the same reusable hooks your mobile app uses.
              </p>
            </div>

            <Link
              className={buttonClassName({ variant: "primary" })}
              to="/workouts"
            >
              Explore all workouts
            </Link>
          </div>

          {upcomingWorkout ? (
            <div className="mt-8 rounded-[2rem] bg-[linear-gradient(135deg,#132238_0%,#1e3555_100%)] p-6 text-white">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/70">
                Next available training block
              </p>
              <div className="mt-3 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
                <div>
                  <h3 className="section-title text-3xl font-semibold">{upcomingWorkout.name}</h3>
                  <p className="mt-2 text-sm text-white/75">{formatRelativeSlot(upcomingWorkout.scheduled_at)}</p>
                </div>
                <Link
                  className={buttonClassName({ size: "sm", variant: "secondary" })}
                  to={`/workouts/${upcomingWorkout.id}`}
                >
                  Open details
                </Link>
              </div>
            </div>
          ) : null}
        </div>

        <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-1">
          <StatCard
            detail={
              subscription?.active_plan
                ? `Renews on ${formatDateTime(subscription.period_end)}.`
                : subscription?.error_code === "PLAN_EXPIRED"
                  ? "Your last assigned plan has expired."
                  : "Assign a subscription to unlock bookings."
            }
            label={subscription?.plan_name ?? "Active plan"}
            tone="accent"
            value={
              subscription?.active_plan
                ? subscription.allows_free_pass
                  ? "Free pass"
                  : formatCredits(subscription.active_credits)
                : subscription?.error_code === "PLAN_EXPIRED"
                  ? "Expired"
                  : "No active plan"
            }
          />
          <StatCard
            detail="Confirmed reservations in the current booking feed."
            label="Your bookings"
            tone="highlight"
            value={String(confirmedBookings.length)}
          />
          <StatCard
            detail="Live availability from the current schedule response."
            label="Upcoming classes"
            value={String(workouts.length)}
          />
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="glass-panel rounded-[2rem] p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[var(--accent)]">
            Subscription
          </p>
          <h2 className="section-title mt-3 text-3xl font-semibold">Membership snapshot</h2>
          {subscription?.active_plan ? (
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-[1.5rem] bg-white/80 p-5">
                <p className="text-sm font-semibold text-[var(--ink)]">Plan</p>
                <p className="mt-2 text-sm text-[var(--muted)]">{subscription.plan_name}</p>
              </div>
              <div className="rounded-[1.5rem] bg-white/80 p-5">
                <p className="text-sm font-semibold text-[var(--ink)]">Remaining credits</p>
                <p className="mt-2 text-sm text-[var(--muted)]">
                  {subscription.allows_free_pass
                    ? "Unlimited while spots remain"
                    : formatCredits(subscription.active_credits)}
                </p>
              </div>
              <div className="rounded-[1.5rem] bg-white/80 p-5">
                <p className="text-sm font-semibold text-[var(--ink)]">Period end</p>
                <p className="mt-2 text-sm text-[var(--muted)]">{formatDateTime(subscription.period_end)}</p>
              </div>
              <div className="rounded-[1.5rem] bg-white/80 p-5">
                <p className="text-sm font-semibold text-[var(--ink)]">Waitlist entries</p>
                <p className="mt-2 text-sm text-[var(--muted)]">{activeWaitlist.length}</p>
              </div>
            </div>
          ) : (
            <div className="mt-6 rounded-[1.5rem] bg-white/80 p-5 text-sm text-[var(--muted)]">
              {subscription?.error_code === "PLAN_EXPIRED"
                ? `Your last plan expired on ${formatDateTime(subscription.period_end)}.`
                : "No active subscription is assigned to this member yet."}
            </div>
          )}
        </div>

        <div className="glass-panel rounded-[2rem] p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[var(--accent)]">
            Booking status
          </p>
          <h2 className="section-title mt-3 text-3xl font-semibold">Reservation overview</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-[1.5rem] bg-white/80 p-5">
              <p className="text-sm font-semibold text-[var(--ink)]">Confirmed</p>
              <p className="mt-2 text-sm text-[var(--muted)]">{confirmedBookings.length} active bookings</p>
            </div>
            <div className="rounded-[1.5rem] bg-white/80 p-5">
              <p className="text-sm font-semibold text-[var(--ink)]">Waitlist</p>
              <p className="mt-2 text-sm text-[var(--muted)]">{activeWaitlist.length} pending promotions</p>
            </div>
            <div className="rounded-[1.5rem] bg-white/80 p-5 md:col-span-2">
              <p className="text-sm font-semibold text-[var(--ink)]">Next class</p>
              <p className="mt-2 text-sm text-[var(--muted)]">
                {upcomingWorkout ? formatRelativeSlot(upcomingWorkout.scheduled_at) : "No scheduled classes yet."}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[var(--accent)]">Upcoming</p>
            <h2 className="section-title mt-1 text-3xl font-semibold">Workout sessions</h2>
          </div>
          <Link className={buttonClassName({ size: "sm", variant: "ghost" })} to="/workouts">
            View all
          </Link>
        </div>

        <div className="grid gap-5">
          {workouts.slice(0, 3).map((workout) => (
            <WorkoutCard key={workout.id} workout={workout} />
          ))}
        </div>
      </section>
    </div>
  );
}
