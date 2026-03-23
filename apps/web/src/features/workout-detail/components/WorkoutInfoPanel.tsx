import type { Workout } from "@gym/api-client";

import { Card, CardContent, CardDescription, CardEyebrow, CardHeader, CardInset, CardTitle } from "@/components/ui/Card";
import { formatWorkoutSchedule } from "@/lib/format";

interface Props {
  workout: Workout;
  isPast: boolean;
}

export function WorkoutInfoPanel({ workout, isPast }: Props) {
  const details = [
    {
      label: "Horario",
      value: formatWorkoutSchedule(workout.scheduled_at)
    },
    {
      label: "Ubicación",
      value: workout.location
    },
    {
      label: "Disponibilidad",
      value:
        typeof workout.available_spots === "number"
          ? `${workout.available_spots} ${workout.available_spots === 1 ? "lugar restante" : "lugares restantes"}`
          : `${workout.capacity} lugares totales`
    },
    {
      label: "Lista de espera",
      value: `${workout.waitlist_size ?? 0} miembros esperando`
    },
    {
      label: "Duración",
      value: `${workout.duration_minutes} minutos`
    },
    {
      label: "Instructor",
      value: workout.instructor?.full_name ?? "Sin asignar"
    },
    {
      label: "Tu estado",
      value: workout.member_booking_status ?? "No reservado"
    }
  ];

  return (
    <Card as="section" className="space-y-6">
      <CardHeader>
        <CardEyebrow>Detalle de la clase</CardEyebrow>
        <CardTitle className="text-[var(--font-size-2xl)]">{workout.name}</CardTitle>

        {isPast ? (
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--danger-soft)] bg-[var(--danger-soft)] px-4 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--danger)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--danger)]" />
            Clase concluida
          </div>
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
