import type { Workout } from "@gym/api-client";
import { formatWorkoutSchedule } from "@/lib/format";

interface Props {
  workout: Workout;
  isPast: boolean;
}

export function WorkoutInfoPanel({ workout, isPast }: Props) {
  return (
    <section className="glass-panel rounded-[2.25rem] p-8">
      <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[var(--accent)]">Detalle de la clase</p>
      <h1 className="section-title mt-4 text-4xl font-semibold">{workout.name}</h1>

      {isPast && (
        <div className="mt-4 inline-flex items-center rounded-full bg-red-50 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-red-500 border border-red-100">
          <span className="mr-2 h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
          Clase concluida
        </div>
      )}

      <p className="mt-4 text-base leading-8 text-[var(--muted)]">
        {workout.description ??
          "Esta clase se renderiza desde el horario del backend con información de disponibilidad en vivo, lista de espera y estado de reserva."}
      </p>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {[{
          label: "Horario",
          value: formatWorkoutSchedule(workout.scheduled_at)
        }, {
          label: "Ubicación",
          value: workout.location
        }, {
          label: "Disponibilidad",
          value:
            typeof workout.available_spots === "number"
              ? `${workout.available_spots} ${workout.available_spots === 1 ? "lugar restante" : "lugares restantes"}`
              : `${workout.capacity} lugares totales`
        }, {
          label: "Lista de espera",
          value: `${workout.waitlist_size ?? 0} miembros esperando`
        }, {
          label: "Duración",
          value: `${workout.duration_minutes} minutos`
        }, {
          label: "Instructor",
          value: workout.instructor?.full_name ?? "Sin asignar"
        }, {
          label: "Tu estado",
          value: workout.member_booking_status ?? "no reservado"
        }].map((item) => (
          <div key={item.label} className="rounded-[1.75rem] bg-white/80 p-5">
            <p className="text-sm font-semibold text-[var(--ink)]">{item.label}</p>
            <p className="mt-2 text-sm text-[var(--muted)]">{item.value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
