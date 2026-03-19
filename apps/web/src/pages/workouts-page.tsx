import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/empty-state";
import { SkeletonWorkoutCard } from "@/components/ui/skeletons";
import { apiClient } from "@/api/client";
import { WorkoutCard } from "@/components/workout-card";
import { StatCard } from "@/components/stat-card";
import { WeeklySchedule } from "@/components/weekly-schedule";
import { useAuth } from "@/hooks/use-auth";
import { useCreateWorkout, useMySubscriptionStatus, useWorkouts } from "@/hooks/use-workouts";
import { getMembersQueryOptions } from "@gym/api-client";
import { formatCredits, formatDateTime } from "@/lib/format";
import { canManageOperations } from "@/lib/roles";
import type { Workout } from "@/types/gym";
import type { WorkoutCreatePayload } from "@gym/api-client";

const workoutCreateSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio"),
  location: z.string().trim().min(1, "La ubicación es obligatoria"),
  instructor_id: z.string().nullable().optional(),
  duration_minutes: z.number().int().min(15, "La duración mínima es de 15 minutos"),
  capacity: z.number().int().min(1, "La capacidad debe ser al menos 1"),
  class_time: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "Formato de hora inválido"),
  description: z.string().max(500, "Descripción demasiado larga").optional().nullable()
});

type WorkoutCreateFormValues = z.infer<typeof workoutCreateSchema>;

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
  const canManage = canManageOperations(session?.member);
  const instructorsQuery = useQuery({
    ...getMembersQueryOptions(apiClient, { role: "instructor" }),
    enabled: canManage
  });
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [pendingDate, setPendingDate] = useState<string>("");
  const [submissionMessage, setSubmissionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<WorkoutCreateFormValues>({
    resolver: zodResolver(workoutCreateSchema),
    defaultValues: {
      class_time: "18:00",
      duration_minutes: 60,
      capacity: 12
    }
  });

  const createWorkout = useCreateWorkout();
  const workouts: Workout[] = workoutsQuery.data ?? [];
  const instructors = instructorsQuery.data ?? [];
  const subscription = subscriptionQuery.data;
  const showEmptyState = !workouts.length && workoutsQuery.isSuccess;

  const isFormDisabled = createWorkout.isPending;

  const addDate = () => {
    if (pendingDate && !selectedDates.includes(pendingDate)) {
      setSelectedDates((prev) => [...prev, pendingDate].sort());
      setPendingDate("");
    }
  };

  const removeDate = (date: string) => {
    setSelectedDates((prev) => prev.filter((d) => d !== date));
  };

  const onSubmit = async (values: WorkoutCreateFormValues) => {
    setSubmissionMessage(null);

    if (selectedDates.length === 0) {
      setSubmissionMessage({ type: "error", text: "Selecciona al menos una fecha para crear la clase." });
      return;
    }

    const dates = selectedDates.map((date) => `${date}T${values.class_time}:00`);

    const payload: WorkoutCreatePayload = {
      name: values.name.trim(),
      location: values.location.trim(),
      capacity: values.capacity,
      duration_minutes: values.duration_minutes,
      instructor_id: values.instructor_id?.trim() || null,
      description: values.description?.trim() || null,
      dates
    };

    try {
      await createWorkout.mutateAsync(payload);
      reset();
      setSelectedDates([]);
      setPendingDate("");
      window.scrollTo({ top: 0, behavior: "smooth" });
      setSubmissionMessage({ type: "success", text: "¡Entrenamientos creados con éxito!" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error al crear los entrenamientos.";
      setSubmissionMessage({ type: "error", text: message });
    }
  };

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

          <form className="grid gap-[var(--stack-gap)] sm:grid-cols-2 lg:grid-cols-3" onSubmit={handleSubmit(onSubmit)}>
            {submissionMessage ? (
              <div className={`sm:col-span-2 lg:col-span-3 rounded-xl border p-4 text-sm ${
                submissionMessage.type === "success" 
                  ? "border-green-200 bg-green-50 text-green-800" 
                  : "border-red-200 bg-red-50 text-red-800"
              }`}>
                {submissionMessage.text}
              </div>
            ) : null}

            <div className="sm:col-span-2 lg:col-span-3 rounded-xl border border-[var(--surface-outline)] bg-white p-4">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <input
                    className="w-full rounded-xl border border-[var(--surface-outline)] bg-white px-4 py-3 text-sm font-medium"
                    placeholder="Nombre del entrenamiento"
                    {...register("name")}
                    defaultValue={searchParams.get("name") ?? ""}
                  />
                  {errors.name ? <p className="mt-1 text-xs text-red-500">{errors.name.message}</p> : null}
                </div>

                <div>
                  <input
                    className="w-full rounded-xl border border-[var(--surface-outline)] bg-white px-4 py-3 text-sm font-medium"
                    placeholder="Ubicación"
                    {...register("location")}
                    defaultValue={searchParams.get("location") ?? ""}
                  />
                  {errors.location ? <p className="mt-1 text-xs text-red-500">{errors.location.message}</p> : null}
                </div>

                <div>
                  <select
                    className="w-full rounded-xl border border-[var(--surface-outline)] bg-white px-4 py-3 text-sm font-medium"
                    {...register("instructor_id")}
                    defaultValue={searchParams.get("instructor_id") ?? ""}
                  >
                    <option value="">Seleccionar Instructor</option>
                    {instructors.map((instructor) => (
                      <option key={instructor.id} value={instructor.instructor_profile?.id ?? ""}>
                        {instructor.full_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <input
                    className="w-full rounded-xl border border-[var(--surface-outline)] bg-white px-4 py-3 text-sm font-medium"
                    type="number"
                    min={15}
                    placeholder="Duración (m)"
                    {...register("duration_minutes", { valueAsNumber: true })}
                    defaultValue={Number(searchParams.get("duration_minutes") ?? "60")}
                  />
                  {errors.duration_minutes ? (
                    <p className="mt-1 text-xs text-red-500">{errors.duration_minutes.message}</p>
                  ) : null}
                </div>

                <div>
                  <input
                    className="w-full rounded-xl border border-[var(--surface-outline)] bg-white px-4 py-3 text-sm font-medium"
                    type="number"
                    min={1}
                    placeholder="Capacidad"
                    {...register("capacity", { valueAsNumber: true })}
                    defaultValue={Number(searchParams.get("capacity") ?? "12")}
                  />
                  {errors.capacity ? <p className="mt-1 text-xs text-red-500">{errors.capacity.message}</p> : null}
                </div>

                <div className="space-y-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-[var(--ink-500)]">Fechas</span>
                  <div className="flex gap-2">
                    <input
                      className="flex-1 rounded-xl border border-[var(--surface-outline)] bg-white px-4 py-3 text-sm font-medium"
                      type="date"
                      value={pendingDate}
                      onChange={(e) => setPendingDate(e.target.value)}
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={addDate}
                      disabled={!pendingDate || selectedDates.includes(pendingDate)}
                      className="px-3"
                    >
                      +
                    </Button>
                  </div>

                  <div className="flex flex-wrap gap-2 min-h-[40px] p-2 rounded-xl border border-dashed border-[var(--surface-outline)]">
                    {selectedDates.length === 0 ? (
                      <span className="text-xs text-[var(--ink-400)]">No hay fechas seleccionadas</span>
                    ) : null}
                    {selectedDates.map((date) => (
                      <span key={date} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[var(--primary)] text-white text-xs font-bold">
                        {date}
                        <button
                          type="button"
                          className="hover:text-red-200 ml-1"
                          onClick={() => removeDate(date)}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                  {selectedDates.length === 0 && (
                    <p className="text-xs text-[var(--ink-400)]">Selecciona al menos una fecha</p>
                  )}
                </div>

                <div className="space-y-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-[var(--ink-500)]">Hora (para todas las fechas)</span>
                  <input
                    className="w-full rounded-xl border border-[var(--surface-outline)] bg-white px-4 py-3 text-sm font-medium"
                    type="time"
                    {...register("class_time")}
                  />
                  {errors.class_time ? <p className="mt-1 text-xs text-red-500">{errors.class_time.message}</p> : null}
                </div>

                <div className="sm:col-span-2 lg:col-span-3">
                  <textarea
                    className="w-full rounded-xl border border-[var(--surface-outline)] bg-white px-4 py-3 text-sm font-medium"
                    placeholder="Descripción"
                    {...register("description")}
                    defaultValue={searchParams.get("description") ?? ""}
                  />
                  {errors.description ? <p className="mt-1 text-xs text-red-500">{errors.description.message}</p> : null}
                </div>

                <div className="sm:col-span-2 lg:col-span-3">
                  <Button className="w-full h-12" loading={isFormDisabled} disabled={isFormDisabled} type="submit" variant="primary">
                    {isFormDisabled ? "Programando..." : "Crear entrenamiento"}
                  </Button>
                </div>
              </div>
            </div>
          </form>
        </section>
      ) : null}

      <div id="tour-workouts" className="space-y-8">
        {workoutsQuery.isLoading ? (
          <>
            <div className="space-y-4">
              <div className="h-8 w-48 animate-pulse rounded-lg bg-slate-200" />
              <div className="h-4 w-64 animate-pulse rounded bg-slate-200" />
            </div>
            <div className="grid gap-6">
              <SkeletonWorkoutCard />
              <SkeletonWorkoutCard />
              <SkeletonWorkoutCard />
            </div>
          </>
        ) : showEmptyState ? (
          <EmptyState
            eyebrow="Disponibilidad"
            title="No hay clases programadas"
            description="Vuelve más tarde o contacta a los administradores para el próximo bloque de entrenamiento."
          />
        ) : (
          <>
            <WeeklySchedule classes={workouts} />
            
            <div className="grid gap-6">
              {workouts.map((workout) => (
                <WorkoutCard key={workout.id} workout={workout} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

