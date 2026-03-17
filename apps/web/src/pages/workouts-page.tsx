import { useState } from "react";
import { useSearchParams } from "react-router-dom";

import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/empty-state";
import { WorkoutCard } from "@/components/workout-card";
import { StatCard } from "@/components/stat-card";
import { WeeklySchedule } from "@/components/weekly-schedule";
import { useAuth } from "@/hooks/use-auth";
import { useCreateWorkout, useMySubscriptionStatus, useWorkouts, useMembers } from "@/hooks/use-workouts";
import { formatCredits, formatDateTime } from "@/lib/format";
import { canManageOperations } from "@/lib/roles";
import type { Workout } from "@/types/gym";
import type { WorkoutCreatePayload } from "@gym/api-client";

function getFormValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export function WorkoutsPage() {
  const { session } = useAuth();
  const subscriptionQuery = useMySubscriptionStatus();
  const [filters, setFilters] = useState({
    status: "" as "" | "scheduled" | "cancelled" | "completed",
    offset: 0,
    limit: 24
  });
  const [searchParams] = useSearchParams();
  const workoutsQuery = useWorkouts({
    status: filters.status || null,
    offset: filters.offset,
    limit: filters.limit
  });
  const instructorsQuery = useMembers({ role: "instructor" });
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [classTime, setClassTime] = useState("18:00");
  
  const createWorkout = useCreateWorkout();
  const workouts: Workout[] = workoutsQuery.data ?? [];
  const instructors = instructorsQuery.data ?? [];
  const subscription = subscriptionQuery.data;
  const canManage = canManageOperations(session?.member);
  const showEmptyState = !workouts.length && workoutsQuery.isSuccess;

  return (
    <div className="space-y-[var(--section-gap)]">
      <header>
        <h1 className="section-title text-[var(--font-size-4xl)]">Horario</h1>
        <p className="mt-2 text-sm font-medium text-[var(--ink-500)] lg:text-base">
          Explora próximas clases, gestiona tus reservas y haz un seguimiento de tu progreso.
        </p>
      </header>

      <section className="grid gap-[var(--stack-gap)] sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          detail={
            subscription?.active_plan
              ? subscription.plan_name ?? "Asignado"
              : "Sin plan activo"
          }
          label="Plan activo"
          value={subscription?.active_plan ? "Asignado" : "Ninguno"}
        />
        <StatCard
          detail={
            subscription?.active_plan
              ? subscription.allows_free_pass
              ? "Capacidad ilimitada"
              : `${formatCredits(subscription.active_credits)} restantes`
            : "Reservas bloqueadas"
          }
          label="Créditos"
          value={subscription?.active_plan ? String(subscription.active_credits) : "0"}
        />
        <StatCard
          detail={formatDateTime(subscription?.period_end)}
          label="Renovación"
          value="Fin del periodo"
        />
      </section>

      <section className="apple-card">
        <div className="mb-6">
          <h2 className="section-title text-[var(--font-size-xl)] text-[var(--ink-900)]">Refinar Horario</h2>
          <p className="mt-1 text-sm font-medium text-[var(--ink-500)]">Filtrar por estado de clase y disponibilidad.</p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--ink-500)]">Estado</span>
            <select
              className="w-full rounded-xl border border-[var(--surface-outline)] bg-[var(--bg-main)] px-4 py-3 text-sm font-medium outline-none transition focus:border-[var(--primary)]"
              value={filters.status}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  status: event.target.value as "" | "scheduled" | "cancelled" | "completed"
                }))
              }
            >
              <option value="">Todos los estados</option>
              <option value="scheduled">Programado</option>
              <option value="cancelled">Cancelado</option>
              <option value="completed">Completado</option>
            </select>
          </div>
        </div>
      </section>

      {canManage ? (
        <section className="apple-card bg-[var(--bg-main)]/50">
          <div className="mb-8">
            <h2 className="section-title text-[var(--font-size-2xl)]">Crear Entrenamiento</h2>
            <p className="mt-1 text-sm font-medium text-[var(--ink-500)] lg:text-base">Programa una nueva sesión de entrenamiento para la comunidad.</p>
          </div>

          <form
            className="grid gap-[var(--stack-gap)] sm:grid-cols-2 lg:grid-cols-3"
            onSubmit={async (event) => {
              event.preventDefault();
              const formData = new FormData(event.currentTarget);
              
              if (selectedDates.length === 0) {
                alert("Por favor, selecciona al menos una fecha para la clase.");
                return;
              }

              const dates = selectedDates.map(date => `${date}T${classTime}:00`);
              
              const payload = {
                name: getFormValue(formData, "name"),
                location: getFormValue(formData, "location"),
                instructor_id: getFormValue(formData, "instructor_id") || null,
                duration_minutes: parseInt(getFormValue(formData, "duration_minutes"), 10),
                capacity: parseInt(getFormValue(formData, "capacity"), 10),
                scheduled_at: dates[0],
                dates: dates.length > 1 ? dates : undefined,
                description: getFormValue(formData, "description"),
                status: "scheduled"
              } satisfies WorkoutCreatePayload;

              try {
                await createWorkout.mutateAsync(payload);
                event.currentTarget.reset();
                setSelectedDates([]);
                window.scrollTo({ top: 0, behavior: "smooth" });
              } catch (error) {
                console.error("Error al crear el entrenamiento:", error);
              }
            }}
          >
            <input 
              className="rounded-xl border border-[var(--surface-outline)] bg-white px-4 py-3 text-sm font-medium" 
              name="name" 
              placeholder="Nombre del entrenamiento" 
              required 
              defaultValue={searchParams.get("name") || ""}
            />
            <input 
              className="rounded-xl border border-[var(--surface-outline)] bg-white px-4 py-3 text-sm font-medium" 
              name="location" 
              placeholder="Ubicación" 
              required 
              defaultValue={searchParams.get("location") || ""}
            />
            
            <select 
              className="rounded-xl border border-[var(--surface-outline)] bg-white px-4 py-3 text-sm font-medium" 
              name="instructor_id" 
              required
              defaultValue={searchParams.get("instructor_id") || ""}
            >
              <option value="">Seleccionar Instructor</option>
              {instructors.map((instructor) => (
                <option key={instructor.id} value={instructor.instructor_profile?.id}>
                  {instructor.full_name}
                </option>
              ))}
            </select>

            <input 
              className="rounded-xl border border-[var(--surface-outline)] bg-white px-4 py-3 text-sm font-medium" 
              min={15} 
              name="duration_minutes" 
              placeholder="Duración (m)" 
              required 
              type="number" 
              defaultValue={searchParams.get("duration_minutes") || "60"}
            />
            
            <input 
              className="rounded-xl border border-[var(--surface-outline)] bg-white px-4 py-3 text-sm font-medium" 
              min={1} 
              name="capacity" 
              placeholder="Capacidad" 
              required 
              type="number" 
              defaultValue={searchParams.get("capacity") || "12"}
            />

            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--ink-500)]">Fechas</span>
              <div className="flex gap-2">
                <input 
                  className="flex-1 rounded-xl border border-[var(--surface-outline)] bg-white px-4 py-3 text-sm font-medium" 
                  type="date"
                  onChange={(e) => {
                    if (e.target.value && !selectedDates.includes(e.target.value)) {
                      setSelectedDates([...selectedDates, e.target.value].sort());
                    }
                    e.target.value = "";
                  }}
                />
              </div>
              <div className="flex flex-wrap gap-2 min-h-[40px] p-2 rounded-xl border border-dashed border-[var(--surface-outline)]">
                {selectedDates.length === 0 ? <span className="text-xs text-[var(--ink-400)]">No hay fechas seleccionadas</span> : null}
                {selectedDates.map(date => (
                  <span key={date} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[var(--primary)] text-white text-xs font-bold">
                    {date}
                    <button 
                      type="button" 
                      className="hover:text-red-200"
                      onClick={() => setSelectedDates(selectedDates.filter(d => d !== date))}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--ink-500)]">Hora (para todas las fechas)</span>
              <input 
                className="w-full rounded-xl border border-[var(--surface-outline)] bg-white px-4 py-3 text-sm font-medium" 
                name="class_time" 
                required 
                type="time"
                value={classTime}
                onChange={(e) => setClassTime(e.target.value)}
              />
            </div>

            <textarea 
              className="rounded-xl border border-[var(--surface-outline)] bg-white px-4 py-3 text-sm font-medium sm:col-span-2 lg:col-span-3" 
              name="description" 
              placeholder="Descripción" 
              defaultValue={searchParams.get("description") || ""}
            />
            
            <div className="sm:col-span-2 lg:col-span-3">
              <Button className="w-full h-12" loading={createWorkout.isPending} type="submit" variant="primary">
                {createWorkout.isPending ? "Programando..." : "Crear entrenamiento"}
              </Button>
            </div>
          </form>
        </section>
      ) : null}

      {showEmptyState ? (
        <EmptyState
          eyebrow="Disponibilidad"
          title="No hay clases programadas"
          description="Vuelve más tarde o contacta a los administradores para el próximo bloque de entrenamiento."
        />
      ) : (
        <div className="space-y-8">
          <WeeklySchedule classes={workouts} />
          
          <div className="grid gap-6">
            {workouts.map((workout, index) => (
              <WorkoutCard key={workout.id} workout={workout} id={index === 0 ? "tour-workouts" : undefined} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

