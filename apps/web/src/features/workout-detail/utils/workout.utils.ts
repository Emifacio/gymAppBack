import { formatWorkoutSchedule } from "@/lib/format";
import type { Member, Workout } from "@gym/api-client";

export type InstructorNameMap = Record<string, string>;

export function buildInstructorNameMap(members: Member[] = []): InstructorNameMap {
  return Object.fromEntries(
    members.flatMap((member) =>
      member.instructor_profile?.id ? [[member.instructor_profile.id, member.full_name]] : []
    )
  );
}

export function resolveWorkoutInstructorName(
  workout: Pick<Workout, "instructor" | "instructor_id">,
  instructorsMap: InstructorNameMap = {}
) {
  const directInstructorName = workout.instructor?.name ?? workout.instructor?.full_name;

  if (typeof directInstructorName === "string" && directInstructorName.trim()) {
    return directInstructorName;
  }

  if (workout.instructor_id) {
    return instructorsMap[workout.instructor_id] ?? "Sin asignar";
  }

  return "Sin asignar";
}

export function formatWorkoutInfo(workout: Workout, instructorsMap: InstructorNameMap = {}) {
  return {
    schedule: formatWorkoutSchedule(workout.scheduled_at),
    location: workout.location,
    availability:
      typeof workout.available_spots === "number"
        ? `${workout.available_spots} ${workout.available_spots === 1 ? "lugar restante" : "lugares restantes"}`
        : `${workout.capacity} lugares totales`,
    waitlist: `${workout.waitlist_size ?? 0} miembros esperando`,
    duration: `${workout.duration_minutes} minutos`,
    instructor: resolveWorkoutInstructorName(workout, instructorsMap),
    memberStatus: workout.member_booking_status ?? "No reservado"
  };
}
