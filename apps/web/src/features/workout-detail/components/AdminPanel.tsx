import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/Button";
import type { Workout, ClassAssignmentPayload, WorkoutUpdatePayload } from "@gym/api-client";

const assignMemberSchema = z.object({
  member_id: z.string().trim().min(1, "ID del miembro obligatorio")
});

type AssignMemberFormData = z.infer<typeof assignMemberSchema>;

const updateWorkoutSchema = z.object({
  name: z.string().trim().min(1, "Nombre obligatorio"),
  location: z.string().trim().min(1, "Ubicación obligatoria"),
  instructor_id: z.string().optional().or(z.literal("")),
  scheduled_at: z.string().min(1, "Fecha/hora obligatoria"),
  description: z.string().optional(),
  duration_minutes: z.number().int().min(15, "La duración mínima es 15 minutos"),
  capacity: z.number().int().min(1, "Capacidad mínima es 1"),
  status: z.enum(["scheduled", "cancelled", "completed"])
});

type UpdateWorkoutFormData = z.infer<typeof updateWorkoutSchema>;

type MutationState<TData = unknown, TVariables = unknown> = {
  mutate: (variables: TVariables, options?: { onSuccess?: (data: TData) => void; onError?: (error: unknown) => void }) => void;
  isPending: boolean;
  data?: TData | undefined;
  error?: unknown;
};

interface Props {
  workout: Workout;
  onDelete: () => void;
  assignMemberMutation: MutationState<{ message: string }, { classId: string; memberId: string; payload: ClassAssignmentPayload }>;
  updateWorkoutMutation: MutationState<Workout, { workoutId: string; payload: WorkoutUpdatePayload }>;
  deleteWorkoutMutation: MutationState<void, { workoutId: string }>;
}

export function AdminPanel({
  workout,
  assignMemberMutation,
  updateWorkoutMutation,
  deleteWorkoutMutation,
  onDelete
}: Props) {
  const {
    register: registerAssign,
    handleSubmit: handleSubmitAssign,
    reset: resetAssign,
    formState: { errors: assignErrors, isSubmitting: isAssigning }
  } = useForm<AssignMemberFormData>({ resolver: zodResolver(assignMemberSchema) });

  const {
    register: registerUpdate,
    handleSubmit: handleSubmitUpdate,
    formState: { errors: updateErrors, isSubmitting: isUpdating }
  } = useForm<UpdateWorkoutFormData>({
    resolver: zodResolver(updateWorkoutSchema),
    defaultValues: {
      name: workout.name,
      location: workout.location,
      instructor_id: workout.instructor_id ?? "",
      scheduled_at: workout.scheduled_at.slice(0, 16),
      description: workout.description ?? "",
      duration_minutes: workout.duration_minutes,
      capacity: workout.capacity,
      status: workout.status
    }
  });

  return (
    <section className="mt-8 glass-panel rounded-[2.25rem] p-8 xl:col-span-2 border-t border-[rgba(19,34,56,0.08)]">
      <div className="grid gap-6 xl:grid-cols-2">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[var(--accent)]">Asignación manual</p>
          <form
            onSubmit={handleSubmitAssign((values) => {
              assignMemberMutation.mutate({ classId: workout.id, memberId: values.member_id, payload: { member_id: values.member_id } });
              resetAssign();
            })}
            className="mt-4 space-y-3"
          >
            <label className="block text-sm font-medium text-[var(--ink)]">ID del miembro</label>
            <input
              className="w-full rounded-2xl border border-[rgba(19,34,56,0.08)] bg-white px-4 py-3"
              {...registerAssign("member_id")}
              aria-invalid={assignErrors.member_id ? "true" : "false"}
            />
            {assignErrors.member_id && <p className="text-xs text-red-500">{assignErrors.member_id.message}</p>}
            <Button className="w-full" loading={isAssigning || assignMemberMutation.isPending} type="submit" variant="secondary">
              {isAssigning || assignMemberMutation.isPending ? "Asignando..." : "Asignar miembro a la clase"}
            </Button>
            {assignMemberMutation.data && (
              <div className="rounded-2xl bg-[rgba(23,184,156,0.12)] px-4 py-3 text-sm text-[var(--highlight)]">
                {assignMemberMutation.data.message}
              </div>
            )}
          </form>
        </div>

        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[var(--accent)]">Gestión de clase</p>
          <form
            onSubmit={handleSubmitUpdate((values) => {
              updateWorkoutMutation.mutate({
                workoutId: workout.id,
                payload: {
                  name: values.name,
                  location: values.location,
                  instructor_id: values.instructor_id || null,
                  scheduled_at: new Date(values.scheduled_at).toISOString(),
                  description: values.description || null,
                  duration_minutes: values.duration_minutes,
                  capacity: values.capacity,
                  status: values.status
                }
              });
            })}
            className="mt-4 space-y-3"
          >
            <label className="block text-sm font-medium text-[var(--ink)]">Nombre</label>
            <input className="w-full rounded-2xl border border-[rgba(19,34,56,0.08)] bg-white px-4 py-3" {...registerUpdate("name")} />
            {updateErrors.name && <p className="text-xs text-red-500">{updateErrors.name.message}</p>}

            <label className="block text-sm font-medium text-[var(--ink)]">Ubicación</label>
            <input className="w-full rounded-2xl border border-[rgba(19,34,56,0.08)] bg-white px-4 py-3" {...registerUpdate("location")} />
            {updateErrors.location && <p className="text-xs text-red-500">{updateErrors.location.message}</p>}

            <label className="block text-sm font-medium text-[var(--ink)]">ID del instructor</label>
            <input className="w-full rounded-2xl border border-[rgba(19,34,56,0.08)] bg-white px-4 py-3" {...registerUpdate("instructor_id")} />

            <label className="block text-sm font-medium text-[var(--ink)]">Fecha y hora</label>
            <input type="datetime-local" className="w-full rounded-2xl border border-[rgba(19,34,56,0.08)] bg-white px-4 py-3" {...registerUpdate("scheduled_at")} />
            {updateErrors.scheduled_at && <p className="text-xs text-red-500">{updateErrors.scheduled_at.message}</p>}

            <label className="block text-sm font-medium text-[var(--ink)]">Descripción</label>
            <textarea className="w-full min-h-[96px] rounded-2xl border border-[rgba(19,34,56,0.08)] bg-white px-4 py-3" {...registerUpdate("description")} />

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-[var(--ink)]">Duración (min)</label>
                <input type="number" min={15} className="w-full rounded-2xl border border-[rgba(19,34,56,0.08)] bg-white px-4 py-3" {...registerUpdate("duration_minutes", { valueAsNumber: true })} />
                {updateErrors.duration_minutes && <p className="text-xs text-red-500">{updateErrors.duration_minutes.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--ink)]">Capacidad</label>
                <input type="number" min={1} className="w-full rounded-2xl border border-[rgba(19,34,56,0.08)] bg-white px-4 py-3" {...registerUpdate("capacity", { valueAsNumber: true })} />
                {updateErrors.capacity && <p className="text-xs text-red-500">{updateErrors.capacity.message}</p>}
              </div>
            </div>

            <label className="block text-sm font-medium text-[var(--ink)]">Estado</label>
            <select className="w-full rounded-2xl border border-[rgba(19,34,56,0.08)] bg-white px-4 py-3" {...registerUpdate("status")}>
              <option value="scheduled">programado</option>
              <option value="cancelled">cancelado</option>
              <option value="completed">completado</option>
            </select>

            <div className="flex flex-wrap gap-3">
              <Button loading={isUpdating || updateWorkoutMutation.isPending} type="submit" variant="primary">
                {isUpdating || updateWorkoutMutation.isPending ? "Guardando..." : "Guardar cambios"}
              </Button>
              <Button
                disabled={deleteWorkoutMutation.isPending}
                loading={deleteWorkoutMutation.isPending}
                onClick={() => { void onDelete(); }}
                type="button"
                variant="danger"
              >
                {deleteWorkoutMutation.isPending ? "Eliminando..." : "Eliminar clase"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}
