import { useState } from "react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/empty-state";
import { WorkoutCard } from "@/components/workout-card";
import { StatCard } from "@/components/stat-card";
import { useAuth } from "@/hooks/use-auth";
import { useCreateWorkout, useMySubscriptionStatus, useWorkouts } from "@/hooks/use-workouts";
import { formatCredits, formatDateTime } from "@/lib/format";
import { canManageOperations } from "@/lib/roles";

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
  const workoutsQuery = useWorkouts({
    status: filters.status || null,
    offset: filters.offset,
    limit: filters.limit
  });
  const createWorkout = useCreateWorkout();
  const workouts = workoutsQuery.data ?? [];
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

      {canManage && (
        <section className="apple-card bg-[var(--bg-main)]/50">
          <div className="mb-8">
            <h2 className="section-title text-[var(--font-size-2xl)]">Crear Entrenamiento</h2>
            <p className="mt-1 text-sm font-medium text-[var(--ink-500)] lg:text-base">Programa una nueva sesión de entrenamiento para la comunidad.</p>
          </div>

          <form
            className="grid gap-[var(--stack-gap)] sm:grid-cols-2 lg:grid-cols-3"
            onSubmit={(event) => {
              // ... mutation logic
            }}
          >
            <input className="rounded-xl border border-[var(--surface-outline)] bg-white px-4 py-3 text-sm font-medium" name="name" placeholder="Nombre del entrenamiento" required />
            <input className="rounded-xl border border-[var(--surface-outline)] bg-white px-4 py-3 text-sm font-medium" name="location" placeholder="Ubicación" required />
            <input className="rounded-xl border border-[var(--surface-outline)] bg-white px-4 py-3 text-sm font-medium" name="instructor_id" placeholder="ID del instructor (opcional)" />
            <input className="rounded-xl border border-[var(--surface-outline)] bg-white px-4 py-3 text-sm font-medium" min={15} name="duration_minutes" placeholder="Duración (m)" required type="number" />
            <input className="rounded-xl border border-[var(--surface-outline)] bg-white px-4 py-3 text-sm font-medium" min={1} name="capacity" placeholder="Capacidad" required type="number" />
            <input className="rounded-xl border border-[var(--surface-outline)] bg-white px-4 py-3 text-sm font-medium" name="scheduled_at" required type="datetime-local" />
            <textarea className="rounded-xl border border-[var(--surface-outline)] bg-white px-4 py-3 text-sm font-medium sm:col-span-2 lg:col-span-3" name="description" placeholder="Descripción" />
            
            <div className="sm:col-span-2 lg:col-span-3">
              <Button className="w-full h-12" loading={createWorkout.isPending} type="submit" variant="primary">
                {createWorkout.isPending ? "Programando..." : "Crear entrenamiento"}
              </Button>
            </div>
          </form>
        </section>
      )}

      {showEmptyState ? (
        <EmptyState
          eyebrow="Disponibilidad"
          title="No hay clases programadas"
          description="Vuelve más tarde o contacta a los administradores para el próximo bloque de entrenamiento."
        />
      ) : (
        <div className="grid gap-6">
          {workouts.map((workout) => (
            <WorkoutCard key={workout.id} workout={workout} />
          ))}
        </div>
      )}
    </div>
  );
}
