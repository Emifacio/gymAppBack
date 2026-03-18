import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/empty-state";
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
    .regex(/^\d{2}:\d{2}$/, "Formato de hora inválido")
    .transform((value) => value),
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
  const [submissionMessage, setSubmissionMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
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

  const onSubmit = async (values: WorkoutCreateFormValues) => {
    if (selectedDates.length === 0) {
      setSubmissionMessage("Por favor, selecciona al menos una fecha para la clase.");
      return;
    }

    setSubmissionMessage(null);

    const payloads: WorkoutCreatePayload[] = selectedDates.map((date) => ({
      name: values.name,
      location: values.location,
      instructor_id: values.instructor_id?.trim() || null,
      duration_minutes: values.duration_minutes,
      capacity: values.capacity,
      scheduled_at: `${date}T${values.class_time}:00`,
      description: values.description ?? "",
      status: "scheduled"
    }));

    const results = await Promise.allSettled<Workout>(payloads.map((payload) => createWorkout.mutateAsync(payload)));

    const successCount = results.filter((r): r is PromiseFulfilledResult<Workout> => r.status === "fulfilled").length;
    const failedResults = results.filter((r): r is PromiseRejectedResult => r.status === "rejected");

    if (successCount > 0) {
      reset();
      setSelectedDates([]);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }

    if (failedResults.length > 0) {
      const firstError: unknown = failedResults[0]!.reason;
      const errorReason = firstError instanceof Error ? firstError.message : String(firstError);
      setSubmissionMessage(
        `Se crearon ${successCount} de ${payloads.length} entrenamientos; ${failedResults.length} fallaron. Error: ${errorReason}`
      );
      return;
    }

    setSubmissionMessage(`¡${successCount} entrenamiento(s) creado(s) con éxito!`);
  };

  const isFormDisabled = isSubmitting || createWorkout.isPending;

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
              <div className="sm:col-span-2 lg:col-span-3 rounded-xl border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
                {submissionMessage}
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
                      onChange={(e) => {
                        if (e.target.value && !selectedDates.includes(e.target.value)) {
                          setSelectedDates((prevDates) => [...new Set([...prevDates, e.target.value])].sort());
                        }
                        e.target.value = "";
                      }}
                    />
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
                          className="hover:text-red-200"
                          onClick={() => setSelectedDates((dates) => dates.filter((d) => d !== date))}
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

