import { formatWorkoutSchedule } from "@/lib/format";
import type { Workout } from "@gym/api-client";

export function formatWorkoutInfo(workout: Workout) {
  return {
    schedule: formatWorkoutSchedule(workout.scheduled_at),
    location: workout.location,
    availability: typeof workout.available_spots === "number"
      ? `${workout.available_spots} ${workout.available_spots === 1 ? "lugar restante" : "lugares restantes"}`
      : `${workout.capacity} lugares totales`,
    waitlist: `${workout.waitlist_size ?? 0} miembros esperando`,
    duration: `${workout.duration_minutes} minutos`,
    instructor: workout.instructor?.full_name ?? "Sin asignar",
    memberStatus: workout.member_booking_status ?? "no reservado"
  };
}
