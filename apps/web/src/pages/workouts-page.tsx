import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Calendar as CalendarIcon, Clock, MapPin, Sparkles, PlusCircle } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/empty-state";
import { InlineFeedback } from "@/components/ui/InlineFeedback";
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
import { useTransientState } from "@/hooks/useTransientState";
import { MotionTokens } from "@/components/ui/motion-tokens";
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
  const [listHighlight, setListHighlight] = useState(false);
  const feedback = useTransientState();

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
    if (selectedDates.length === 0) {
      feedback.triggerError("Selecciona al menos una fecha para crear la clase.");
      return;
    }

    feedback.triggerLoading();

    const dates = selectedDates.map((date) => `${date}T${values.class_time}:00`);

    const payload: WorkoutCreatePayload = {
      name: values.name.trim(),
      location: values.location.trim(),
      capacity: values.capacity,
      duration_minutes: values.duration_minutes,
      instructor_id: values.instructor_id?.trim() || null,
      description: values.description?.trim() || null,
      dates,
      status: "scheduled"
    };

    try {
      await createWorkout.mutateAsync(payload);
      reset();
      setSelectedDates([]);
      setPendingDate("");
      setListHighlight(true);
      setTimeout(() => setListHighlight(false), MotionTokens.highlight.containerReset);
      window.scrollTo({ top: 0, behavior: "smooth" });
      feedback.triggerSuccess("Entrenamientos creados con éxito.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error al crear los entrenamientos.";
      feedback.triggerError(message);
    }
  };

  return (
    <div className="space-y-[var(--section-gap)] transition-colors duration-300">
      <header className="flex flex-col gap-6 sm:flex-row sm:items-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--accent)] text-white shadow-lg shadow-[var(--accent-soft)]">
          <CalendarIcon className="h-8 w-8" />
        </div>
        <div>
          <h1 className="section-title text-[var(--font-size-2xl)] text-[var(--text-primary)] leading-tight">Agenda de Clases</h1>
          <p className="mt-1 text-sm font-medium text-[var(--text-secondary)] lg:text-base opacity-80">
            Reserva tus sesiones, revisa la disponibilidad y gestiona tus créditos.
          </p>
        </div>
      </header>

      <section className="grid gap-[var(--stack-gap)] sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          detail={subscription?.plan_name ?? ""}
          label="Suscripción"
          value={subscription?.active_plan ? "Activa" : "Bloqueada"}
          loading={subscriptionQuery.isLoading}
        />
        <StatCard
          detail={subscription?.allows_free_pass ? "Sin límites" : "Consumo por clase"}
          label="Créditos Disponibles"
          value={subscription?.active_plan ? (subscription.allows_free_pass ? "∞" : String(subscription.active_credits)) : "0"}
          loading={subscriptionQuery.isLoading}
        />
        <StatCard
          detail={subscription?.period_end ? `Hasta ${formatDateTime(subscription.period_end)}` : "-"}
          label="Vigencia"
          value="Ciclo actual"
          loading={subscriptionQuery.isLoading}
        />
      </section>

      <div className="flex flex-col lg:flex-row gap-8 items-start">
        <section className="apple-card flex-1 shadow-md hover:shadow-lg transition-shadow">
          <div className="flex items-center gap-3 mb-6">
            <h2 className="section-title text-[var(--font-size-xl)] text-[var(--text-primary)]">Próximos Entrenamientos</h2>
            <div className="h-px flex-1 bg-[var(--border-base)] opacity-50" />
          </div>
          
          <div className="mb-8 p-4 rounded-2xl bg-[var(--bg-surface-secondary)]/50 border border-[var(--border-base)] flex items-center gap-4">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] ml-2 whitespace-nowrap">Ver:</span>
            <select
              className="flex-1 bg-transparent text-sm font-bold text-[var(--text-primary)] outline-none cursor-pointer"
              value={filters.status}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  status: event.target.value as "" | "scheduled" | "cancelled" | "completed"
                }))
              }
            >
              <option value="">Todas las clases</option>
              <option value="scheduled">Programadas</option>
              <option value="cancelled">Canceladas</option>
              <option value="completed">Finalizadas</option>
            </select>
          </div>

          <div className={`space-y-6 transition-opacity duration-300 ${workoutsQuery.isFetching ? "opacity-50" : "opacity-100"}`}>
            {workoutsQuery.isLoading ? (
              <div className="space-y-6">
                <SkeletonWorkoutCard />
                <SkeletonWorkoutCard />
                <SkeletonWorkoutCard />
              </div>
            ) : showEmptyState ? (
              <EmptyState
                eyebrow="Gimnasio"
                title="Sin clases disponibles"
                description="No se encontraron sesiones con los filtros actuales."
              />
            ) : (
              <>
                <WeeklySchedule classes={workouts} />
                <div className="grid gap-6 mt-8">
                  {workouts.map((workout) => (
                    <WorkoutCard key={workout.id} workout={workout} />
                  ))}
                </div>
              </>
            )}
          </div>
        </section>

        {canManage && (
          <section className="apple-card w-full lg:w-96 shadow-xl sticky top-28 border border-[var(--accent-soft)]/20">
            <div className="flex items-center gap-2 mb-6 text-[var(--accent)]">
              <PlusCircle className="h-5 w-5" />
              <h2 className="section-title text-[var(--font-size-lg)] text-[var(--text-primary)]">Nueva Sesión</h2>
            </div>

            <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
              {feedback.message && (
                <InlineFeedback
                  message={feedback.message}
                  type={feedback.isSuccess ? "success" : "error"}
                />
              )}

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] px-1">Título</label>
                <input
                  className="w-full rounded-xl border border-transparent bg-[var(--bg-surface-secondary)] text-[var(--text-primary)] px-4 py-3 text-sm font-bold outline-none transition focus:bg-[var(--bg-surface)] focus:border-[var(--accent)] shadow-sm"
                  placeholder="Ej: Cross Training"
                  {...register("name")}
                />
                {errors.name && <p className="text-[10px] text-[var(--danger)] font-bold px-1">{errors.name.message}</p>}
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] px-1">Ubicación</label>
                <input
                  className="w-full rounded-xl border border-transparent bg-[var(--bg-surface-secondary)] text-[var(--text-primary)] px-4 py-3 text-sm font-bold outline-none transition focus:bg-[var(--bg-surface)] focus:border-[var(--accent)] shadow-sm"
                  placeholder="Sala Principal"
                  {...register("location")}
                />
                {errors.location && <p className="text-[10px] text-[var(--danger)] font-bold px-1">{errors.location.message}</p>}
              </div>

              <div className="grid gap-4 grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] px-1">Cupos</label>
                  <input
                    className="w-full rounded-xl border border-transparent bg-[var(--bg-surface-secondary)] text-[var(--text-primary)] px-4 py-3 text-sm font-bold outline-none transition focus:bg-[var(--bg-surface)] focus:border-[var(--accent)] shadow-sm"
                    type="number"
                    {...register("capacity", { valueAsNumber: true })}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] px-1">Minutos</label>
                  <input
                    className="w-full rounded-xl border border-transparent bg-[var(--bg-surface-secondary)] text-[var(--text-primary)] px-4 py-3 text-sm font-bold outline-none transition focus:bg-[var(--bg-surface)] focus:border-[var(--accent)] shadow-sm"
                    type="number"
                    {...register("duration_minutes", { valueAsNumber: true })}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] px-1">Instructor</label>
                <select
                  className="w-full rounded-xl border border-transparent bg-[var(--bg-surface-secondary)] text-[var(--text-primary)] px-4 py-3 text-sm font-bold outline-none transition focus:bg-[var(--bg-surface)] focus:border-[var(--accent)] shadow-sm appearance-none"
                  {...register("instructor_id")}
                >
                  <option value="">Seleccionar...</option>
                  {instructors.map((instructor) => (
                    <option key={instructor.id} value={instructor.instructor_profile?.id ?? ""}>
                      {instructor.full_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-[var(--border-base)]">
                <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] px-1">Programar Fecha</label>
                <div className="flex gap-2">
                  <input
                    className="flex-1 rounded-xl border border-transparent bg-[var(--bg-surface-secondary)] text-[var(--text-primary)] px-4 py-3 text-sm font-bold outline-none focus:border-[var(--accent)] shadow-sm"
                    type="date"
                    value={pendingDate}
                    onChange={(e) => setPendingDate(e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={addDate}
                    className="px-4 font-bold"
                  >
                    +
                  </Button>
                </div>
                
                <div className="flex flex-wrap gap-2 mt-3 p-3 rounded-2xl bg-[var(--bg-surface-secondary)]/30 border border-dashed border-[var(--border-base)] min-h-[44px]">
                  {selectedDates.map((date) => (
                    <span key={date} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--accent)] text-white text-[10px] font-black uppercase shadow-sm">
                      {date}
                      <button onClick={() => removeDate(date)} className="hover:opacity-60">×</button>
                    </span>
                  ))}
                  {selectedDates.length === 0 && <span className="text-[10px] text-[var(--text-muted)] italic font-bold">Sin fechas...</span>}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] px-1">Hora de Inicio</label>
                <input
                  className="w-full rounded-xl border border-transparent bg-[var(--bg-surface-secondary)] text-[var(--text-primary)] px-4 py-3 text-sm font-bold outline-none focus:border-[var(--accent)] shadow-sm"
                  type="time"
                  {...register("class_time")}
                />
              </div>

              <Button
                className="w-full h-14 text-base font-bold shadow-lg shadow-[var(--accent-soft)] mt-4 rounded-2xl"
                loading={feedback.isLoading}
                type="submit"
                variant="primary"
              >
                Crear Entrenamiento Now
              </Button>
            </form>
          </section>
        )}
      </div>
    </div>
  );
}
