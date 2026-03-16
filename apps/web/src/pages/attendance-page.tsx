import { useMemo, useState, type FormEvent } from "react";
import { Navigate } from "react-router-dom";

import {
  useClassAttendance,
  useMarkAttendance,
  useMembers,
  useWorkouts
} from "@/hooks/use-workouts";
import { useAuth } from "@/hooks/use-auth";
import { formatDateTime } from "@/lib/format";
import { canManageOperations } from "@/lib/roles";

type AttendanceStatus = "present" | "absent" | "late";

export function AttendancePage() {
  const { session } = useAuth();
  const workoutsQuery = useWorkouts();
  const membersQuery = useMembers();
  const [selectedClassId, setSelectedClassId] = useState("");
  const attendanceQuery = useClassAttendance(selectedClassId);
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
      setErrorMessage(error instanceof Error ? error.message : "Could not mark attendance.");
    }
  }

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-amber-700">Attendance</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-900">Class check-in desk</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          Mark who showed up, review attendance by class, and keep coaches aligned with the daily
          floor reality.
        </p>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-6">
          <section className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Mark attendance</h2>
            <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-700">Class</span>
                <select
                  required
                  value={formState.class_id}
                  onChange={(event) =>
                    setFormState((current) => ({ ...current, class_id: event.target.value }))
                  }
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-900"
                >
                  <option value="">Select a class</option>
                  {(workoutsQuery.data ?? []).map((workout) => (
                    <option key={workout.id} value={workout.id}>
                      {workout.name} · {formatDateTime(workout.scheduled_at)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-700">Member</span>
                <select
                  required
                  value={formState.member_id}
                  onChange={(event) =>
                    setFormState((current) => ({ ...current, member_id: event.target.value }))
                  }
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-900"
                >
                  <option value="">Select a member</option>
                  {(membersQuery.data ?? []).map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.full_name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-700">Status</span>
                <select
                  value={formState.status}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      status: event.target.value as AttendanceStatus
                    }))
                  }
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-900"
                >
                  <option value="present">Present</option>
                  <option value="absent">Absent</option>
                  <option value="late">Late</option>
                </select>
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-700">Notes</span>
                <textarea
                  rows={3}
                  value={formState.notes}
                  onChange={(event) =>
                    setFormState((current) => ({ ...current, notes: event.target.value }))
                  }
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-900"
                />
              </label>

              {errorMessage ? (
                <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {errorMessage}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={markAttendance.isPending}
                className="w-full rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {markAttendance.isPending ? "Saving attendance..." : "Mark attendance"}
              </button>
            </form>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Review a class</h2>
            <label className="mt-4 block space-y-2">
              <span className="text-sm font-medium text-slate-700">Selected class</span>
              <select
                value={selectedClassId}
                onChange={(event) => setSelectedClassId(event.target.value)}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-900"
              >
                <option value="">Choose a class</option>
                {(workoutsQuery.data ?? []).map((workout) => (
                  <option key={workout.id} value={workout.id}>
                    {workout.name}
                  </option>
                ))}
              </select>
            </label>
          </section>
        </div>

        <section className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">
                {selectedWorkout ? selectedWorkout.name : "Class attendance"}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {selectedWorkout
                  ? `Scheduled for ${formatDateTime(selectedWorkout.scheduled_at)}`
                  : "Choose a class to inspect the current attendance sheet."}
              </p>
            </div>
            {selectedWorkout ? (
              <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-600">
                Capacity {selectedWorkout.capacity}
              </span>
            ) : null}
          </div>

          <div className="mt-6 space-y-3">
            {(attendanceQuery.data ?? []).map((record) => (
              <div key={record.id} className="rounded-2xl border border-slate-200 px-4 py-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">{record.member_id}</p>
                    <p className="text-sm text-slate-500">
                      {record.mark_source === "manual"
                        ? "Marked manually by staff"
                        : `Marked via ${record.mark_source}`}
                    </p>
                    {record.notes ? (
                      <p className="mt-1 text-sm text-slate-500">Notes: {record.notes}</p>
                    ) : null}
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-sm font-medium ${
                      record.status === "present"
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-rose-100 text-rose-800"
                    }`}
                  >
                    {record.status}
                  </span>
                </div>
              </div>
            ))}

            {attendanceQuery.isLoading ? (
              <p className="text-sm text-slate-500">Loading attendance sheet...</p>
            ) : null}

            {!selectedClassId ? (
              <p className="text-sm text-slate-500">Pick a class to see attendance records.</p>
            ) : null}

            {selectedClassId && !attendanceQuery.isLoading && (attendanceQuery.data ?? []).length === 0 ? (
              <p className="text-sm text-slate-500">No attendance records have been marked yet.</p>
            ) : null}
          </div>
        </section>
      </section>
    </div>
  );
}
