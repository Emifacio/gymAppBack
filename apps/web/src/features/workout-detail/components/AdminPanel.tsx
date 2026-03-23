import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardEyebrow, CardHeader, CardInset, CardTitle } from "@/components/ui/Card";
import { Field, FieldError, FieldLabel } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
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
    <Card as="section" className="xl:col-span-2">
      <div className="grid gap-6 xl:grid-cols-2">
        <CardInset>
          <CardHeader className="space-y-2">
            <CardEyebrow>Asignación manual</CardEyebrow>
            <CardTitle className="text-[var(--font-size-lg)]">Agregar miembro a la clase</CardTitle>
          </CardHeader>

          <CardContent className="mt-5">
          <form
            onSubmit={handleSubmitAssign((values) => {
              assignMemberMutation.mutate({ classId: workout.id, memberId: values.member_id, payload: { member_id: values.member_id } });
              resetAssign();
            })}
            className="space-y-4"
          >
            <Field>
              <FieldLabel htmlFor="assign-member-id">ID del miembro</FieldLabel>
              <Input
                id="assign-member-id"
                error={Boolean(assignErrors.member_id)}
                aria-invalid={assignErrors.member_id ? "true" : "false"}
                {...registerAssign("member_id")}
              />
              {assignErrors.member_id ? <FieldError>{assignErrors.member_id.message}</FieldError> : null}
            </Field>

            <Button className="h-12 w-full rounded-2xl" loading={isAssigning || assignMemberMutation.isPending} type="submit" variant="secondary">
              {isAssigning || assignMemberMutation.isPending ? "Asignando..." : "Asignar miembro a la clase"}
            </Button>
            {assignMemberMutation.data && (
              <CardInset className="border-[var(--success-soft)] bg-[var(--success-soft)] shadow-none">
                <p className="text-sm font-medium text-[var(--success)]">{assignMemberMutation.data.message}</p>
              </CardInset>
            )}
          </form>
          </CardContent>
        </CardInset>

        <CardInset>
          <CardHeader className="space-y-2">
            <CardEyebrow>Gestión de clase</CardEyebrow>
            <CardTitle className="text-[var(--font-size-lg)]">Editar detalles</CardTitle>
          </CardHeader>

          <CardContent className="mt-5">
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
            className="space-y-4"
          >
            <Field>
              <FieldLabel htmlFor="update-workout-name">Nombre</FieldLabel>
              <Input id="update-workout-name" error={Boolean(updateErrors.name)} {...registerUpdate("name")} />
              {updateErrors.name ? <FieldError>{updateErrors.name.message}</FieldError> : null}
            </Field>

            <Field>
              <FieldLabel htmlFor="update-workout-location">Ubicación</FieldLabel>
              <Input id="update-workout-location" error={Boolean(updateErrors.location)} {...registerUpdate("location")} />
              {updateErrors.location ? <FieldError>{updateErrors.location.message}</FieldError> : null}
            </Field>

            <Field>
              <FieldLabel htmlFor="update-workout-instructor">ID del instructor</FieldLabel>
              <Input id="update-workout-instructor" {...registerUpdate("instructor_id")} />
            </Field>

            <Field>
              <FieldLabel htmlFor="update-workout-scheduled-at">Fecha y hora</FieldLabel>
              <Input
                id="update-workout-scheduled-at"
                type="datetime-local"
                error={Boolean(updateErrors.scheduled_at)}
                {...registerUpdate("scheduled_at")}
              />
              {updateErrors.scheduled_at ? <FieldError>{updateErrors.scheduled_at.message}</FieldError> : null}
            </Field>

            <Field>
              <FieldLabel htmlFor="update-workout-description">Descripción</FieldLabel>
              <Textarea id="update-workout-description" {...registerUpdate("description")} />
            </Field>

            <div className="grid gap-4 md:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="update-workout-duration">Duración (min)</FieldLabel>
                <Input
                  id="update-workout-duration"
                  type="number"
                  min={15}
                  error={Boolean(updateErrors.duration_minutes)}
                  {...registerUpdate("duration_minutes", { valueAsNumber: true })}
                />
                {updateErrors.duration_minutes ? <FieldError>{updateErrors.duration_minutes.message}</FieldError> : null}
              </Field>
              <Field>
                <FieldLabel htmlFor="update-workout-capacity">Capacidad</FieldLabel>
                <Input
                  id="update-workout-capacity"
                  type="number"
                  min={1}
                  error={Boolean(updateErrors.capacity)}
                  {...registerUpdate("capacity", { valueAsNumber: true })}
                />
                {updateErrors.capacity ? <FieldError>{updateErrors.capacity.message}</FieldError> : null}
              </Field>
            </div>

            <Field>
              <FieldLabel htmlFor="update-workout-status">Estado</FieldLabel>
              <Select id="update-workout-status" {...registerUpdate("status")}>
                <option value="scheduled">programado</option>
                <option value="cancelled">cancelado</option>
                <option value="completed">completado</option>
              </Select>
            </Field>

            <div className="flex flex-wrap gap-3">
              <Button className="rounded-2xl" loading={isUpdating || updateWorkoutMutation.isPending} type="submit" variant="primary">
                {isUpdating || updateWorkoutMutation.isPending ? "Guardando..." : "Guardar cambios"}
              </Button>
              <Button
                className="rounded-2xl"
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
          </CardContent>
        </CardInset>
      </div>
    </Card>
  );
}
