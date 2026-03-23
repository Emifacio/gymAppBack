import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import type {
  ClassMember,
  ClassAssignmentPayload,
  Member,
  Workout,
  WorkoutUpdatePayload
} from "@gym/api-client";

import { Button } from "@/components/ui/Button";
import {
  Card,
  CardContent,
  CardDescription,
  CardEyebrow,
  CardHeader,
  CardInset,
  CardTitle
} from "@/components/ui/Card";
import { Field, FieldError, FieldHint, FieldLabel } from "@/components/ui/Field";
import { useMembers } from "@/hooks/use-workouts";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";

const assignMemberSchema = z.object({
  member_id: z.string().trim().min(1, "Selecciona un miembro para asignarlo")
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
  mutate: (
    variables: TVariables,
    options?: { onSuccess?: (data: TData) => void; onError?: (error: unknown) => void }
  ) => void;
  isPending: boolean;
  data?: TData | undefined;
  error?: unknown;
};

interface Props {
  workout: Workout;
  classMembers: ClassMember[];
  onDelete: () => void;
  assignMemberMutation: MutationState<
    { message: string },
    { classId: string; memberId: string; payload: ClassAssignmentPayload }
  >;
  updateWorkoutMutation: MutationState<
    Workout,
    { workoutId: string; payload: WorkoutUpdatePayload }
  >;
  deleteWorkoutMutation: MutationState<void, { workoutId: string }>;
}

export function AdminPanel({
  workout,
  classMembers,
  assignMemberMutation,
  updateWorkoutMutation,
  deleteWorkoutMutation,
  onDelete
}: Props) {
  const [memberSearch, setMemberSearch] = useState("");
  const {
    register: registerAssign,
    handleSubmit: handleSubmitAssign,
    setValue: setAssignValue,
    clearErrors: clearAssignErrors,
    reset: resetAssign,
    formState: { errors: assignErrors, isSubmitting: isAssigning }
  } = useForm<AssignMemberFormData>({ resolver: zodResolver(assignMemberSchema) });
  const membersQuery = useMembers({
    offset: 0,
    limit: 500,
    role: null,
    membership_status: null
  });

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
  const assignedMemberIds = useMemo(
    () => new Set(classMembers.map((member) => member.member_id)),
    [classMembers]
  );
  const availableMembers = useMemo(
    () => (membersQuery.data ?? []).filter((member) => !assignedMemberIds.has(member.id)),
    [assignedMemberIds, membersQuery.data]
  );
  const normalizedSearch = memberSearch.trim().toLocaleLowerCase();
  const matchingMembers = useMemo(() => {
    if (!normalizedSearch) {
      return availableMembers.slice(0, 8);
    }

    return availableMembers
      .filter((member) => {
        const haystack = `${member.full_name} ${member.email}`.toLocaleLowerCase();
        return haystack.includes(normalizedSearch);
      })
      .slice(0, 8);
  }, [availableMembers, normalizedSearch]);
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const selectedAvailableMember = useMemo(
    () => availableMembers.find((member) => member.id === selectedMemberId) ?? null,
    [availableMembers, selectedMemberId]
  );

  function formatMemberLabel(member: Pick<Member, "full_name" | "email">) {
    return `${member.full_name} (${member.email})`;
  }

  return (
    <Card as="section" className="xl:col-span-2">
      <div className="grid gap-6 xl:grid-cols-2">
        <CardInset>
          <CardHeader className="space-y-2">
            <CardEyebrow>Asignación manual</CardEyebrow>
            <CardTitle className="text-[var(--font-size-lg)]">Agregar miembro a la clase</CardTitle>
            <CardDescription>
              Busca un miembro por nombre y asígnalo manualmente a esta sesión.
            </CardDescription>
          </CardHeader>

          <CardContent className="mt-5">
            <form
              onSubmit={handleSubmitAssign((values) => {
                assignMemberMutation.mutate(
                  {
                    classId: workout.id,
                    memberId: values.member_id,
                    payload: { member_id: values.member_id }
                  },
                  {
                    onSuccess: () => {
                      resetAssign();
                      setSelectedMemberId("");
                      setMemberSearch("");
                    }
                  }
                );
              })}
              className="space-y-4"
            >
              <input type="hidden" {...registerAssign("member_id")} />
              <Field>
                <FieldLabel htmlFor="assign-member-search">Buscar miembro</FieldLabel>
                <Input
                  id="assign-member-search"
                  error={Boolean(assignErrors.member_id)}
                  placeholder="Escribe un nombre o email"
                  aria-invalid={assignErrors.member_id ? "true" : "false"}
                  value={memberSearch}
                  onChange={(event) => {
                    setMemberSearch(event.target.value);
                    setSelectedMemberId("");
                    setAssignValue("member_id", "", { shouldValidate: false });
                  }}
                />
                <FieldHint>
                  {membersQuery.isLoading
                    ? "Cargando miembros..."
                    : selectedAvailableMember
                      ? `Seleccionado: ${formatMemberLabel(selectedAvailableMember)}`
                      : "Selecciona un miembro de la lista para asignarlo."}
                </FieldHint>
                {assignErrors.member_id ? (
                  <FieldError>{assignErrors.member_id.message}</FieldError>
                ) : null}
              </Field>

              {selectedAvailableMember ? (
                <CardInset className="border-[var(--border-base)] bg-[var(--bg-surface-secondary)] shadow-none">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-[var(--text-primary)]">
                        {selectedAvailableMember.full_name}
                      </p>
                      <p className="text-xs text-[var(--text-secondary)]">
                        {selectedAvailableMember.email}
                      </p>
                    </div>
                    <Button
                      className="rounded-xl"
                      onClick={() => {
                        setSelectedMemberId("");
                        setMemberSearch("");
                        setAssignValue("member_id", "", { shouldValidate: false });
                      }}
                      size="sm"
                      type="button"
                      variant="ghost"
                    >
                      Cambiar
                    </Button>
                  </div>
                </CardInset>
              ) : null}

              {!selectedAvailableMember && memberSearch.trim().length > 0 ? (
                <div className="space-y-2 rounded-2xl border border-[var(--border-base)] bg-[var(--bg-surface-secondary)] p-2">
                  {matchingMembers.length > 0 ? (
                    matchingMembers.map((member) => (
                      <button
                        key={member.id}
                        className="flex w-full items-start justify-between rounded-xl px-3 py-2 text-left transition hover:bg-[var(--bg-surface)]"
                        onClick={() => {
                          setSelectedMemberId(member.id);
                          setMemberSearch(formatMemberLabel(member));
                          setAssignValue("member_id", member.id, { shouldValidate: true });
                          clearAssignErrors("member_id");
                        }}
                        type="button"
                      >
                        <span>
                          <span className="block text-sm font-semibold text-[var(--text-primary)]">
                            {member.full_name}
                          </span>
                          <span className="block text-xs text-[var(--text-secondary)]">
                            {member.email}
                          </span>
                        </span>
                      </button>
                    ))
                  ) : (
                    <p className="px-3 py-2 text-sm text-[var(--text-secondary)]">
                      No encontramos miembros con ese nombre.
                    </p>
                  )}
                </div>
              ) : null}

              {!membersQuery.isLoading && availableMembers.length === 0 ? (
                <FieldHint>No hay miembros disponibles para agregar a esta clase.</FieldHint>
              ) : null}

              <Button
                className="h-12 w-full rounded-2xl"
                disabled={
                  membersQuery.isLoading ||
                  availableMembers.length === 0 ||
                  !selectedAvailableMember
                }
                loading={isAssigning || assignMemberMutation.isPending}
                type="submit"
                variant="secondary"
              >
                {isAssigning || assignMemberMutation.isPending
                  ? "Asignando..."
                  : "Asignar miembro a la clase"}
              </Button>
              {assignMemberMutation.data && (
                <CardInset className="border-[var(--success-soft)] bg-[var(--success-soft)] shadow-none">
                  <p className="text-sm font-medium text-[var(--success)]">
                    {assignMemberMutation.data.message}
                  </p>
                </CardInset>
              )}
            </form>
          </CardContent>
        </CardInset>

        <CardInset>
          <CardHeader className="space-y-2">
            <CardEyebrow>Gestión de clase</CardEyebrow>
            <CardTitle className="text-[var(--font-size-lg)]">Editar detalles</CardTitle>
            <CardDescription>
              Ajusta la información operativa de la clase sin salir del detalle.
            </CardDescription>
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
                <Input
                  id="update-workout-name"
                  error={Boolean(updateErrors.name)}
                  {...registerUpdate("name")}
                />
                {updateErrors.name ? <FieldError>{updateErrors.name.message}</FieldError> : null}
              </Field>

              <Field>
                <FieldLabel htmlFor="update-workout-location">Ubicación</FieldLabel>
                <Input
                  id="update-workout-location"
                  error={Boolean(updateErrors.location)}
                  {...registerUpdate("location")}
                />
                {updateErrors.location ? (
                  <FieldError>{updateErrors.location.message}</FieldError>
                ) : null}
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
                {updateErrors.scheduled_at ? (
                  <FieldError>{updateErrors.scheduled_at.message}</FieldError>
                ) : null}
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
                  {updateErrors.duration_minutes ? (
                    <FieldError>{updateErrors.duration_minutes.message}</FieldError>
                  ) : null}
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
                  {updateErrors.capacity ? (
                    <FieldError>{updateErrors.capacity.message}</FieldError>
                  ) : null}
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
                <Button
                  className="rounded-2xl"
                  loading={isUpdating || updateWorkoutMutation.isPending}
                  type="submit"
                  variant="primary"
                >
                  {isUpdating || updateWorkoutMutation.isPending
                    ? "Guardando..."
                    : "Guardar cambios"}
                </Button>
                <Button
                  className="rounded-2xl"
                  disabled={deleteWorkoutMutation.isPending}
                  loading={deleteWorkoutMutation.isPending}
                  onClick={() => {
                    void onDelete();
                  }}
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
