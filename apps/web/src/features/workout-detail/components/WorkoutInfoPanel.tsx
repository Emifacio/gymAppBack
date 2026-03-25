import type { Workout } from "@gym/api-client";

import { Badge } from "@/components/ui/Badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardEyebrow,
  CardHeader,
  CardInset,
  CardTitle
} from "@/components/ui/Card";
import { formatWorkoutInfo, type InstructorNameMap } from "../utils/workout.utils";

interface Props {
  workout: Workout;
  isPast: boolean;
  instructorsMap?: InstructorNameMap;
}

export function WorkoutInfoPanel({ workout, isPast, instructorsMap = {} }: Props) {
  const workoutInfo = formatWorkoutInfo(workout, instructorsMap);
  const details = [
    {
      label: "Horario",
      value: workoutInfo.schedule
    },
    {
      label: "Ubicación",
      value: workoutInfo.location
    },
    {
      label: "Disponibilidad",
      value: workoutInfo.availability
    },
    {
      label: "Lista de espera",
      value: workoutInfo.waitlist
    },
    {
      label: "Duración",
      value: workoutInfo.duration
    },
    {
      label: "Instructor",
      value: workoutInfo.instructor
    },
    {
      label: "Tu estado",
      value: workoutInfo.memberStatus
    }
  ];

  return (
    <Card as="section" className="space-y-6">
      <CardHeader>
        <CardEyebrow>Detalle de la clase</CardEyebrow>
        <CardTitle className="text-[var(--font-size-2xl)]">{workout.name}</CardTitle>

        {isPast ? (
          <Badge dot size="md" tone="danger">
            Clase concluida
          </Badge>
        ) : null}

        <CardDescription className="max-w-3xl text-base leading-8">
          {workout.description ??
            "Esta clase se renderiza desde el horario del backend con información de disponibilidad en vivo, lista de espera y estado de reserva."}
        </CardDescription>
      </CardHeader>

      <CardContent className="mt-0 grid gap-4 md:grid-cols-2">
        {details.map((item) => (
          <CardInset key={item.label}>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
              {item.label}
            </p>
            <p className="mt-2 text-sm font-semibold text-[var(--text-primary)]">{item.value}</p>
          </CardInset>
        ))}
      </CardContent>
    </Card>
  );
}
