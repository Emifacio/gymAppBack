import { Link } from "react-router-dom";
import { Clock, MapPin } from "lucide-react";

import type { Workout } from "@gym/api-client";

import { buttonClassName } from "@/components/ui/button-utils";
import { formatWorkoutSchedule } from "@/lib/format";

interface WorkoutCardProps {
  workout: Workout;
  actionLabel?: string;
  id?: string | undefined;
}

export function WorkoutCard({ workout, actionLabel = "View session", id }: WorkoutCardProps) {
  const availabilityLabel =
    typeof workout.available_spots === "number"
      ? `${workout.available_spots} de ${workout.capacity} libres`
      : `${workout.capacity} lugares totales`;

  const occupancyRate = typeof workout.available_spots === "number" 
    ? (workout.capacity - workout.available_spots) / workout.capacity 
    : 0;

  const barColor = occupancyRate >= 0.9 ? "bg-[var(--danger)]" : occupancyRate >= 0.7 ? "bg-[var(--warning)]" : "bg-[var(--success)]";

  const now = new Date();
  const scheduledAt = new Date(workout.scheduled_at);
  const isPast = scheduledAt <= now;

  const statusLabel = workout.status === "cancelled"
    ? "Cancelada"
    : workout.status === "completed" || isPast
    ? "Concluída"
    : "Programada";

  const statusClass = workout.status === "cancelled" || workout.status === "completed" || isPast
    ? "bg-[var(--success-soft)] text-[var(--success)]"
    : "bg-[var(--accent-soft)] text-[var(--accent)]";

  return (
    <article className="apple-card p-5 lg:p-7 flex flex-col md:flex-row md:items-center justify-between gap-6" id={id}>
      <div className="flex-1 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`inline-flex rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${statusClass} border border-current opacity-90`}>
            {statusLabel}
          </span>
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5 px-2 py-1">
            <Clock className="h-3.5 w-3.5" />
            {workout.duration_minutes} min
          </span>
          {workout.instructor?.full_name ? (
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--accent)] bg-[var(--accent-soft)] px-2.5 py-1 rounded-lg border border-[var(--accent-soft)]">
              Prof: {workout.instructor.full_name}
            </span>
          ) : null}
        </div>
        
        <h3 className="section-title text-[var(--font-size-xl)] text-[var(--text-primary)] leading-tight">{workout.name}</h3>
        
        <div className="flex flex-wrap gap-x-8 gap-y-4 text-sm font-medium text-[var(--text-muted)]">
          <div className="flex items-center gap-2.5">
            <Clock className="h-4.5 w-4.5 shrink-0 opacity-70" />
            <span className="text-[var(--text-secondary)]">{formatWorkoutSchedule(workout.scheduled_at)}</span>
          </div>
          <div className="flex items-center gap-2.5">
            <MapPin className="h-4.5 w-4.5 shrink-0 opacity-70" />
            <span className="text-[var(--text-secondary)]">{workout.location}</span>
          </div>
          
          <div className="flex flex-col gap-2 w-full max-w-[240px] pt-1">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
              <span>Capacidad / Ocupación</span>
              <span>{Math.round(occupancyRate * 100)}%</span>
            </div>
            <div className="h-2 w-full bg-[var(--bg-surface-secondary)] rounded-full overflow-hidden shadow-inner">
              <div 
                className={`h-full ${barColor} transition-all duration-700 shadow-sm`} 
                style={{ width: `${occupancyRate * 100}%` }}
              />
            </div>
            <div className="text-[10px] font-semibold text-[var(--text-muted)] opacity-80">{availabilityLabel}</div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 pt-4 md:pt-0">
        {workout.member_booking_status ? (
          <span className="text-[10px] font-bold text-[var(--accent)] bg-[var(--accent-soft)] px-3 py-2 rounded-xl uppercase tracking-wider border border-[var(--accent-soft)]">
            {workout.member_booking_status}
          </span>
        ) : null}
        <Link
          className={buttonClassName({ size: "md", variant: "primary" }) + " w-full md:w-auto h-12 flex items-center justify-center min-w-[140px] shadow-sm hover:shadow-md"}
          to={`/workouts/${workout.id}`}
        >
          {actionLabel}
        </Link>
      </div>
    </article>
  );
}
