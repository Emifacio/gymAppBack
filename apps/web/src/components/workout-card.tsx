import { Link } from "react-router-dom";
import { Clock, MapPin, Users, Ticket } from "lucide-react";

import type { Workout } from "@gym/api-client";

import { buttonClassName } from "@/components/ui/Button";
import { formatWorkoutSchedule } from "@/lib/format";

interface WorkoutCardProps {
  workout: Workout;
  actionLabel?: string;
}

export function WorkoutCard({ workout, actionLabel = "View session" }: WorkoutCardProps) {
  const availabilityLabel =
    typeof workout.available_spots === "number"
      ? `${workout.available_spots} spots remaining`
      : `${workout.capacity} total spots`;

  return (
    <article className="apple-card p-5 lg:p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all active:scale-[0.98] lg:hover:translate-y-[-2px] lg:hover:shadow-md">
      <div className="flex-1">
        <div className="flex items-center gap-3">
          <span className="inline-flex rounded-lg bg-[var(--accent-soft)] px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--primary)]">
            {workout.status}
          </span>
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--ink-500)]">
            {workout.duration_minutes} min
          </span>
        </div>
        <h3 className="section-title mt-2 text-[var(--font-size-lg)] text-[var(--ink-900)]">{workout.name}</h3>
        
        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-3 text-sm font-medium text-[var(--ink-500)]">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 shrink-0" />
            <span className="truncate">{formatWorkoutSchedule(workout.scheduled_at)}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 shrink-0" />
            <span className="truncate">{workout.location}</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 shrink-0" />
            <span>{availabilityLabel}</span>
          </div>
          <div className="flex items-center gap-2">
            <Ticket className="h-4 w-4 shrink-0 text-[var(--primary)]" />
            <span className="font-bold text-[var(--ink-700)]">1 credit</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 mt-2 md:mt-0">
        {workout.member_booking_status && (
          <span className="text-[10px] font-bold text-[var(--primary)] bg-[var(--accent-soft)] px-3 py-2 rounded-xl uppercase tracking-wider">
            {workout.member_booking_status}
          </span>
        )}
        <Link
          className={buttonClassName({ size: "md", variant: "secondary" }) + " w-full md:w-auto h-12 flex items-center justify-center"}
          to={`/workouts/${workout.id}`}
        >
          {actionLabel}
        </Link>
      </div>
    </article>
  );
}
