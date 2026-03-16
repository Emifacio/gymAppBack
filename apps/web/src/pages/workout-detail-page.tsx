import { useParams } from "react-router-dom";

import { EmptyState } from "@/components/empty-state";
import { useAuth } from "@/hooks/use-auth";
import { useCreateBooking, useWorkout } from "@/hooks/use-workouts";
import { formatWorkoutSchedule } from "@/lib/format";

export function WorkoutDetailPage() {
  const { workoutId = "" } = useParams();
  const { session } = useAuth();
  const workoutQuery = useWorkout(workoutId);
  const bookingMutation = useCreateBooking();

  const workout = workoutQuery.data;

  if (!workout && workoutQuery.isSuccess) {
    return (
      <EmptyState
        eyebrow="Not found"
        title="This workout no longer exists"
        description="The route is wired correctly, but the backend did not return a matching class for the provided id."
      />
    );
  }

  if (!workout) {
    return null;
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
      <section className="glass-panel rounded-[2.25rem] p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[var(--accent)]">Workout detail</p>
        <h1 className="section-title mt-4 text-4xl font-semibold">{workout.name}</h1>
        <p className="mt-4 text-base leading-8 text-[var(--muted)]">
          {workout.description ??
            "This workout is coming from the backend classes resource and is rendered through the shared OpenAPI client."}
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <div className="rounded-[1.75rem] bg-white/80 p-5">
            <p className="text-sm font-semibold text-[var(--ink)]">Schedule</p>
            <p className="mt-2 text-sm text-[var(--muted)]">{formatWorkoutSchedule(workout.scheduled_at)}</p>
          </div>
          <div className="rounded-[1.75rem] bg-white/80 p-5">
            <p className="text-sm font-semibold text-[var(--ink)]">Location</p>
            <p className="mt-2 text-sm text-[var(--muted)]">{workout.location}</p>
          </div>
          <div className="rounded-[1.75rem] bg-white/80 p-5">
            <p className="text-sm font-semibold text-[var(--ink)]">Duration</p>
            <p className="mt-2 text-sm text-[var(--muted)]">{workout.duration_minutes} minutes</p>
          </div>
          <div className="rounded-[1.75rem] bg-white/80 p-5">
            <p className="text-sm font-semibold text-[var(--ink)]">Capacity</p>
            <p className="mt-2 text-sm text-[var(--muted)]">{workout.capacity} athletes</p>
          </div>
        </div>
      </section>

      <aside className="glass-panel rounded-[2.25rem] p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[var(--accent)]">Booking action</p>
        <h2 className="section-title mt-4 text-3xl font-semibold">Reserve your spot</h2>
        <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
          This action uses the shared `useCreateBooking` hook, which invalidates both the workouts list and
          member bookings after success.
        </p>

        <button
          className="mt-8 w-full rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#ff6942] disabled:cursor-not-allowed disabled:opacity-60"
          disabled={bookingMutation.isPending}
          onClick={() => {
            bookingMutation.mutate({
              class_id: workout.id,
              member_id: session!.member.id
            });
          }}
          type="button"
        >
          {bookingMutation.isPending ? "Booking..." : "Book workout"}
        </button>

        {bookingMutation.data ? (
          <div className="mt-4 rounded-2xl bg-[rgba(23,184,156,0.12)] px-4 py-3 text-sm text-[var(--highlight)]">
            {bookingMutation.data.message}
          </div>
        ) : null}

        {bookingMutation.error ? (
          <div className="mt-4 rounded-2xl bg-[var(--accent-soft)] px-4 py-3 text-sm text-[var(--accent)]">
            {bookingMutation.error.message}
          </div>
        ) : null}
      </aside>
    </div>
  );
}
