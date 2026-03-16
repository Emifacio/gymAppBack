import { Link } from "react-router-dom";

import { EmptyState } from "@/components/empty-state";
import { StatCard } from "@/components/stat-card";
import { WorkoutCard } from "@/components/workout-card";
import { useAuth } from "@/hooks/use-auth";
import { useMemberBookings, useWorkouts } from "@/hooks/use-workouts";
import { formatRelativeSlot } from "@/lib/format";

export function DashboardPage() {
  const { session } = useAuth();
  const workoutsQuery = useWorkouts({ limit: 6 });
  const bookingsQuery = useMemberBookings(session!.member.id);

  const workouts = workoutsQuery.data ?? [];
  const bookings = bookingsQuery.data?.bookings ?? [];
  const waitlist = bookingsQuery.data?.waitlist ?? [];
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
              className="inline-flex rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#ff6942]"
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
                  className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-[var(--ink)]"
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
            detail="Live count from the `/classes` endpoint."
            label="Scheduled workouts"
            tone="accent"
            value={String(workouts.length)}
          />
          <StatCard
            detail="Fetched from `/members/{id}/bookings`."
            label="Your bookings"
            tone="highlight"
            value={String(bookings.length)}
          />
          <StatCard
            detail="Shared auth/session state across routes."
            label="Waitlist entries"
            value={String(waitlist.length)}
          />
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[var(--accent)]">Upcoming</p>
            <h2 className="section-title mt-1 text-3xl font-semibold">Workout sessions</h2>
          </div>
          <Link className="text-sm font-semibold text-[var(--ink)]" to="/workouts">
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
