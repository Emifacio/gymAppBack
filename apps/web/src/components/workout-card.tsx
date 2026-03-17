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
      ? `${workout.available_spots} de ${workout.capacity} libres`
      : `${workout.capacity} lugares totales`;

  const occupancyRate = typeof workout.available_spots === "number" 
    ? (workout.capacity - workout.available_spots) / workout.capacity 
    : 0;

  const barColor = occupancyRate >= 0.9 ? "bg-[#FF3B30]" : occupancyRate >= 0.7 ? "bg-[#FFCC00]" : "bg-[#34C759]";

  return (
    <article className="apple-card p-5 lg:p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all active:scale-[0.98] lg:hover:translate-y-[-2px] lg:hover:shadow-md">
      <div className="flex-1">
        <div className="flex items-center gap-3">
          <span className={`inline-flex rounded-lg px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${
            workout.status === 'scheduled' ? 'bg-blue-50 text-blue-600' : 'bg-red-50 text-red-600'
          }`}>
            {workout.status === 'scheduled' ? 'Programada' : workout.status}
          </span>
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--ink-500)] flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {workout.duration_minutes} min
          </span>
          {workout.instructor?.full_name ? (
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--primary)] bg-[var(--accent-soft)] px-2 py-1 rounded-lg">
              Prof: {workout.instructor.full_name}
            </span>
          ) : null}
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
          <div className="flex flex-col gap-1 w-full max-w-[200px] mt-1 md:mt-0">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-[var(--ink-400)]">
              <span>Ocupación</span>
              <span>{Math.round(occupancyRate * 100)}%</span>
            </div>
            <div className="h-1.5 w-full bg-[var(--ink-100)] rounded-full overflow-hidden">
              <div 
                className={`h-full ${barColor} transition-all duration-500`} 
                style={{ width: `${occupancyRate * 100}%` }}
              />
            </div>
            <div className="text-[10px] text-[var(--ink-500)] mt-1">{availabilityLabel}</div>
          </div>
        </div>
      </div>


      <div className="flex items-center gap-4 mt-2 md:mt-0">
        {workout.member_booking_status ? (
          <span className="text-[10px] font-bold text-[var(--primary)] bg-[var(--accent-soft)] px-3 py-2 rounded-xl uppercase tracking-wider">
            {workout.member_booking_status}
          </span>
        ) : null}
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
