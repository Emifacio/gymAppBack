import { Link } from "react-router-dom";

import type { Workout } from "@gym/api-client";

import { formatWorkoutSchedule } from "@/lib/format";

interface WorkoutCardProps {
  workout: Workout;
  actionLabel?: string;
}

export function WorkoutCard({ workout, actionLabel = "View session" }: WorkoutCardProps) {
  const availabilityLabel =
    typeof workout.available_spots === "number"
      ? `${workout.available_spots} spot${workout.available_spots === 1 ? "" : "s"} left`
      : `${workout.capacity} total spots`;

  return (
    <article className="glass-panel rounded-[2rem] p-6 transition-transform duration-200 hover:-translate-y-1">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--accent)]">
            {workout.status}
          </p>
          <h3 className="section-title mt-2 text-2xl font-semibold">{workout.name}</h3>
          <p className="mt-3 max-w-xl text-sm leading-7 text-[var(--muted)]">
            {workout.description ?? "High-energy training block with guided pacing and coaching."}
          </p>
        </div>
        <span className="rounded-full bg-[rgba(19,34,56,0.08)] px-3 py-1 text-xs font-medium text-[var(--ink)]">
          {workout.duration_minutes} min
        </span>
      </div>

      <div className="mt-6 grid gap-4 text-sm text-[var(--muted)] md:grid-cols-3">
        <div>
          <p className="font-semibold text-[var(--ink)]">Schedule</p>
          <p className="mt-1">{formatWorkoutSchedule(workout.scheduled_at)}</p>
        </div>
        <div>
          <p className="font-semibold text-[var(--ink)]">Location</p>
          <p className="mt-1">{workout.location}</p>
        </div>
        <div>
          <p className="font-semibold text-[var(--ink)]">Capacity</p>
          <p className="mt-1">{availabilityLabel}</p>
        </div>
        <div>
          <p className="font-semibold text-[var(--ink)]">Waitlist</p>
          <p className="mt-1">{workout.waitlist_size ?? 0} waiting</p>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-[0.22em] text-[var(--muted)]">
          {workout.member_booking_status
            ? `Your status: ${workout.member_booking_status}`
            : "Ready for booking"}
        </p>
        <Link
          className="rounded-full bg-[var(--ink)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1f3453]"
          to={`/workouts/${workout.id}`}
        >
          {actionLabel}
        </Link>
      </div>
    </article>
  );
}
