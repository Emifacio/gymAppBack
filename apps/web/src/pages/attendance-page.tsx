import { useMemo, useState, type FormEvent } from "react";
import { Navigate } from "react-router-dom";
import { ClipboardCheck, UserCheck, CalendarDays } from "lucide-react";

import { SkeletonMemberRow } from "@/components/ui/skeletons";
import {
  useClassAttendance,
  useMarkAttendance,
  useMembers,
  useWorkouts
} from "@/hooks/use-workouts";
import { useAuth } from "@/hooks/use-auth";
import { formatDateTime } from "@/lib/format";
import { canManageOperations } from "@/lib/roles";
import { Button } from "@/components/ui/Button";

type AttendanceStatus = "present" | "absent" | "late";

export function AttendancePage() {
  const { session } = useAuth();
  const workoutsQuery = useWorkouts();
  const membersQuery = useMembers();
  const [selectedClassId, setSelectedClassId] = useState("");
  const attendanceQuery = useClassAttendance(selectedClassId, Boolean(selectedClassId));
  const markAttendance = useMarkAttendance();
  const [formState, setFormState] = useState({
    class_id: "",
    member_id: "",
    status: "present" as AttendanceStatus,
    notes: ""
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const selectedWorkout = useMemo(
    () => (workoutsQuery.data ?? []).find((workout) => workout.id === selectedClassId),
    [selectedClassId, workoutsQuery.data]
  );
  const memberNamesById = useMemo(
    () =>
      Object.fromEntries((membersQuery.data ?? []).map((member) => [member.id, member.full_name])),
    [membersQuery.data]
  );

  if (!session || !canManageOperations(session.member)) {
    return <Navigate to="/dashboard" replace />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

    try {
      await markAttendance.mutateAsync({
        class_id: formState.class_id,
        member_id: formState.member_id,
        status: formState.status,
        notes: formState.notes || null
      });
      setSelectedClassId(formState.class_id);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "No se pudo marcar la asistencia.");
    }
  }

  return (
    <div className="space-y-[var(--section-gap)] transition-colors duration-300">
      <header className="apple-card p-8 shadow-xl border border-[var(--border-base)]">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--accent)] text-white shadow-lg shadow-[var(--accent-soft)] mb-6">
          <ClipboardCheck className="h-8 w-8" />
        </div>
        <p className="text-sm font-bold uppercase tracking-[0.3em] text-[var(--accent)] opacity-80">
          Gestión de Sala
        </p>
        <h1 className="mt-3 text-4xl font-bold text-[var(--text-primary)] tracking-tight">
          Registro de Asistencia
        </h1>
        <p className="mt-3 max-w-2xl text-sm md:text-base leading-relaxed text-[var(--text-secondary)]">
          Control de acceso en tiempo real. Selecciona una clase para visualizar quién ha llegado o
          marca nuevas asistencias manualmente.
        </p>
      </header>

      <div className="grid gap-8 xl:grid-cols-[0.85fr_1.15fr]">
        <div className="space-y-8">
          <section className="apple-card p-8 shadow-lg">
            <div className="flex items-center gap-3 mb-8">
              <UserCheck className="h-6 w-6 text-[var(--accent)]" />
              <h2 className="text-2xl font-bold text-[var(--text-primary)]">Marcar Manual</h2>
            </div>

            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] px-1">
                  Clase de Entrenamiento
                </label>
                <select
                  required
                  value={formState.class_id}
                  onChange={(event) =>
                    setFormState((current) => ({ ...current, class_id: event.target.value }))
                  }
                  className="w-full rounded-2xl border border-transparent bg-[var(--bg-surface-secondary)] text-[var(--text-primary)] px-5 py-4 text-sm font-bold outline-none transition focus:bg-[var(--bg-surface)] focus:border-[var(--accent)] shadow-sm appearance-none"
                >
                  <option value="">Selecciona sesión...</option>
                  {(workoutsQuery.data ?? []).map((workout) => (
                    <option key={workout.id} value={workout.id}>
                      {workout.name} · {formatDateTime(workout.scheduled_at)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] px-1">
                  Miembro
                </label>
                <select
                  required
                  value={formState.member_id}
                  onChange={(event) =>
                    setFormState((current) => ({ ...current, member_id: event.target.value }))
                  }
                  className="w-full rounded-2xl border border-transparent bg-[var(--bg-surface-secondary)] text-[var(--text-primary)] px-5 py-4 text-sm font-bold outline-none transition focus:bg-[var(--bg-surface)] focus:border-[var(--accent)] shadow-sm appearance-none"
                >
                  <option value="">Buscar miembro...</option>
                  {(membersQuery.data ?? []).map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.full_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] px-1">
                  Estado de Entrada
                </label>
                <select
                  value={formState.status}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      status: event.target.value as AttendanceStatus
                    }))
                  }
                  className="w-full rounded-2xl border border-transparent bg-[var(--bg-surface-secondary)] text-[var(--text-primary)] px-5 py-4 text-sm font-bold outline-none transition focus:bg-[var(--bg-surface)] focus:border-[var(--accent)] shadow-sm appearance-none"
                >
                  <option value="present">Presente ✅</option>
                  <option value="absent">Ausente ❌</option>
                  <option value="late">Tarde ⏳</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] px-1">
                  Observaciones
                </label>
                <textarea
                  rows={2}
                  value={formState.notes}
                  onChange={(event) =>
                    setFormState((current) => ({ ...current, notes: event.target.value }))
                  }
                  placeholder="Opcional: motivo de tardanza, etc."
                  className="w-full rounded-2xl border border-transparent bg-[var(--bg-surface-secondary)] text-[var(--text-primary)] px-5 py-4 text-sm font-medium outline-none transition focus:bg-[var(--bg-surface)] focus:border-[var(--accent)] shadow-sm"
                />
              </div>

              {errorMessage ? (
                <div className="rounded-2xl bg-[var(--danger-soft)] p-4 text-sm font-bold text-[var(--danger)] border border-[var(--danger-soft)] animate-in fade-in zoom-in-95">
                  ⚠️ {errorMessage}
                </div>
              ) : null}

              <Button
                type="submit"
                disabled={markAttendance.isPending}
                loading={markAttendance.isPending}
                variant="primary"
                className="w-full h-14 text-base font-bold shadow-lg shadow-[var(--accent-soft)] rounded-2xl"
              >
                Registrar Asistencia
              </Button>
            </form>
          </section>

          <section className="apple-card p-8 shadow-md">
            <div className="flex items-center gap-3 mb-6">
              <CalendarDays className="h-6 w-6 text-[var(--accent)]" />
              <h2 className="text-xl font-bold text-[var(--text-primary)]">Filtro de Clase</h2>
            </div>
            <select
              value={selectedClassId}
              onChange={(event) => setSelectedClassId(event.target.value)}
              className="w-full rounded-2xl border border-transparent bg-[var(--bg-surface-secondary)] text-[var(--text-primary)] px-5 py-4 text-sm font-bold outline-none transition focus:bg-[var(--bg-surface)] focus:border-[var(--accent)] shadow-sm appearance-none"
            >
              <option value="">Selecciona para ver lista...</option>
              {(workoutsQuery.data ?? []).map((workout) => (
                <option key={workout.id} value={workout.id}>
                  {workout.name} · {formatDateTime(workout.scheduled_at)}
                </option>
              ))}
            </select>
          </section>
        </div>

        <section className="apple-card p-8 shadow-xl flex flex-col">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between pb-8 border-b border-[var(--border-base)] mb-8">
            <div className="space-y-1">
              <h2 className="text-3xl font-bold text-[var(--text-primary)] tracking-tight">
                {selectedWorkout ? selectedWorkout.name : "Hoja de Ruta"}
              </h2>
              <p className="text-sm font-medium text-[var(--text-secondary)] opacity-80">
                {selectedWorkout
                  ? `${formatDateTime(selectedWorkout.scheduled_at)}`
                  : "Selecciona una sesión de la izquierda para ver el listado completo."}
              </p>
            </div>
            {selectedWorkout ? (
              <div className="h-fit rounded-2xl bg-[var(--bg-surface-secondary)] px-5 py-3 text-sm font-bold text-[var(--text-primary)] border border-[var(--border-base)] shadow-sm">
                Capacidad: {selectedWorkout.capacity}
              </div>
            ) : null}
          </div>

          <div className="flex-1 space-y-4">
            {(attendanceQuery.data ?? []).map((record) => (
              <div
                key={record.id}
                className="rounded-2xl bg-[var(--bg-surface-secondary)]/40 p-5 hover:bg-[var(--bg-surface-secondary)] transition-colors border border-transparent hover:border-[var(--border-base)] group shadow-sm"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <p className="font-bold text-[var(--text-primary)] text-lg group-hover:text-[var(--accent)] transition-colors">
                      {memberNamesById[record.member_id] ?? record.member_id}
                    </p>
                    <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-tight">
                      {record.mark_source === "manual"
                        ? "Registro Manual"
                        : `Vía ${record.mark_source}`}
                    </p>
                    {record.notes ? (
                      <p className="mt-2 text-sm font-medium text-[var(--text-secondary)] bg-[var(--bg-surface)] p-3 rounded-xl border border-[var(--border-base)] shadow-inner">
                        <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] block mb-1">
                          Nota del Administrador
                        </span>
                        {record.notes}
                      </p>
                    ) : null}
                  </div>
                  <div
                    className={`shrink-0 rounded-2xl px-4 py-2 text-xs font-bold uppercase tracking-wider shadow-sm ${
                      record.status === "present"
                        ? "bg-[var(--success-soft)] text-[var(--success)] border border-[var(--success-soft)]"
                        : record.status === "absent"
                          ? "bg-[var(--danger-soft)] text-[var(--danger)] border border-[var(--danger-soft)]"
                          : "bg-[var(--warning-soft)] text-[var(--warning)] border border-[var(--warning-soft)]"
                    }`}
                  >
                    {record.status === "present"
                      ? "Presente"
                      : record.status === "absent"
                        ? "Ausente"
                        : "Tarde"}
                  </div>
                </div>
              </div>
            ))}

            {attendanceQuery.isLoading && (
              <div className="space-y-4">
                <SkeletonMemberRow />
                <SkeletonMemberRow />
                <SkeletonMemberRow />
              </div>
            )}

            {!selectedClassId && !attendanceQuery.isLoading && (
              <div className="flex flex-col items-center justify-center py-32 text-center space-y-4 opacity-50 grayscale">
                <CalendarDays className="h-16 w-16 text-[var(--text-muted)]" />
                <p className="max-w-xs text-sm font-bold">
                  Listado vacío. Selecciona una clase para auditar la asistencia.
                </p>
              </div>
            )}

            {selectedClassId &&
              !attendanceQuery.isLoading &&
              (attendanceQuery.data ?? []).length === 0 && (
                <div className="flex flex-col items-center justify-center py-32 text-center space-y-2">
                  <p className="font-bold text-[var(--text-primary)]">Sin registros</p>
                  <p className="text-sm text-[var(--text-muted)]">
                    Aún no se ha marcado asistencia para esta clase.
                  </p>
                </div>
              )}
          </div>
        </section>
      </div>
    </div>
  );
}
