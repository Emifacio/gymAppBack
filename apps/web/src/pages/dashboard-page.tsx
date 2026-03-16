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
    <div className="space-y-[var(--section-gap)]">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
          <Sparkles className="h-7 w-7" />
        </div>
        <div>
          <h2 className="section-title text-[var(--font-size-2xl)]">
            Good morning, {session?.member.full_name.split(' ')[0]}
          </h2>
          <p className="mt-1 text-sm font-medium text-[var(--ink-500)] lg:text-base">
            You have {confirmedBookings.length} classes scheduled for this week.
          </p>
        </div>
      </header>

      <section className="grid gap-[var(--stack-gap)] sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          detail={
            subscription?.active_plan
              ? `Renews on ${formatDateTime(subscription.period_end)}.`
              : "Assign a subscription to unlock bookings."
          }
          label={subscription?.plan_name ?? "Active plan"}
          value={
            subscription?.active_plan
              ? subscription.allows_free_pass
                ? "Free pass"
                : formatCredits(subscription.active_credits)
              : "No active plan"
          }
        />
        <StatCard
          detail="Confirmed reservations in your feed."
          label="Your bookings"
          value={String(confirmedBookings.length)}
        />
        <StatCard
          detail="Classes available for booking today."
          label="Upcoming classes"
          value={String(workouts.length)}
        />
      </section>

      <section className="grid gap-[var(--section-gap)] lg:grid-cols-2">
        <div className="apple-card">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--accent)]">
            Subscription
          </p>
          <h2 className="section-title mt-2 text-[var(--font-size-xl)]">Membership snapshot</h2>
          {subscription?.active_plan ? (
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-[1.25rem] bg-[var(--bg-main)] p-4">
                <p className="text-xs font-bold text-[var(--ink-500)] uppercase">Plan</p>
                <p className="mt-1 text-sm font-semibold text-[var(--ink-900)]">{subscription.plan_name}</p>
              </div>
              <div className="rounded-[1.25rem] bg-[var(--bg-main)] p-4">
                <p className="text-xs font-bold text-[var(--ink-500)] uppercase">Remaining credits</p>
                <p className="mt-1 text-sm font-semibold text-[var(--ink-900)]">
                  {subscription.allows_free_pass
                    ? "Unlimited"
                    : formatCredits(subscription.active_credits)}
                </p>
              </div>
              <div className="rounded-[1.25rem] bg-[var(--bg-main)] p-4">
                <p className="text-xs font-bold text-[var(--ink-500)] uppercase">Period end</p>
                <p className="mt-1 text-sm font-semibold text-[var(--ink-900)]">{formatDateTime(subscription.period_end)}</p>
              </div>
              <div className="rounded-[1.25rem] bg-[var(--bg-main)] p-4">
                <p className="text-xs font-bold text-[var(--ink-500)] uppercase">Waitlist</p>
                <p className="mt-1 text-sm font-semibold text-[var(--ink-900)]">{activeWaitlist.length} entries</p>
              </div>
            </div>
          ) : (
            <div className="mt-6 rounded-[1.25rem] bg-[var(--bg-main)] p-5 text-sm font-medium text-[var(--ink-500)]">
              {subscription?.error_code === "PLAN_EXPIRED"
                ? `Your last plan expired on ${formatDateTime(subscription.period_end)}.`
                : "No active subscription is assigned yet."}
            </div>
          )}
        </div>

        <div className="apple-card">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--accent)]">
            Booking status
          </p>
          <h2 className="section-title mt-2 text-[var(--font-size-xl)]">Reservation overview</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-[1.25rem] bg-[var(--bg-main)] p-4">
              <p className="text-xs font-bold text-[var(--ink-500)] uppercase">Confirmed</p>
              <p className="mt-1 text-sm font-semibold text-[var(--ink-900)]">{confirmedBookings.length} bookings</p>
            </div>
            <div className="rounded-[1.25rem] bg-[var(--bg-main)] p-4">
              <p className="text-xs font-bold text-[var(--ink-500)] uppercase">Waitlist</p>
              <p className="mt-1 text-sm font-semibold text-[var(--ink-900)]">{activeWaitlist.length} pending</p>
            </div>
            <div className="rounded-[1.25rem] bg-[var(--bg-main)] p-4 sm:col-span-2">
              <p className="text-xs font-bold text-[var(--ink-500)] uppercase">Next class</p>
              <p className="mt-1 text-sm font-semibold text-[var(--ink-900)]">
                {upcomingWorkout ? formatRelativeSlot(upcomingWorkout.scheduled_at) : "No classes yet."}
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
