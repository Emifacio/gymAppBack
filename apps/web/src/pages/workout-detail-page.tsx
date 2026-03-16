import { useNavigate, useParams } from "react-router-dom";

import { EmptyState } from "@/components/empty-state";
import { useAuth } from "@/hooks/use-auth";
import {
  useClassAttendance,
  useCreateBooking,
  useDeleteWorkout,
  useUpdateWorkout,
  useWorkout
} from "@/hooks/use-workouts";
import { formatWorkoutSchedule, toDateTimeLocalValue } from "@/lib/format";
import { canManageOperations } from "@/lib/roles";

function getFormValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export function WorkoutDetailPage() {
  const navigate = useNavigate();
  const { workoutId = "" } = useParams();
  const { session } = useAuth();
  const workoutQuery = useWorkout(workoutId);
  const classAttendanceQuery = useClassAttendance(workoutId);
  const bookingMutation = useCreateBooking();
  const updateWorkout = useUpdateWorkout();
  const deleteWorkout = useDeleteWorkout();
  const canManage = canManageOperations(session?.member);

  const workout = workoutQuery.data;

  if (!workout && workoutQuery.isSuccess) {
    return (
      <EmptyState
        eyebrow="Not found"
        title="This workout no longer exists"
        description="The route is wired correctly, but the backend did not return a matching class for the provided id."
      />
    );
  }

  if (!workout) {
    return null;
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
      <section className="glass-panel rounded-[2.25rem] p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[var(--accent)]">Workout detail</p>
        <h1 className="section-title mt-4 text-4xl font-semibold">{workout.name}</h1>
        <p className="mt-4 text-base leading-8 text-[var(--muted)]">
          {workout.description ??
            "This workout is coming from the backend classes resource and is rendered through the shared OpenAPI client."}
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <div className="rounded-[1.75rem] bg-white/80 p-5">
            <p className="text-sm font-semibold text-[var(--ink)]">Schedule</p>
            <p className="mt-2 text-sm text-[var(--muted)]">{formatWorkoutSchedule(workout.scheduled_at)}</p>
          </div>
          <div className="rounded-[1.75rem] bg-white/80 p-5">
            <p className="text-sm font-semibold text-[var(--ink)]">Location</p>
            <p className="mt-2 text-sm text-[var(--muted)]">{workout.location}</p>
          </div>
          <div className="rounded-[1.75rem] bg-white/80 p-5">
            <p className="text-sm font-semibold text-[var(--ink)]">Duration</p>
            <p className="mt-2 text-sm text-[var(--muted)]">{workout.duration_minutes} minutes</p>
          </div>
          <div className="rounded-[1.75rem] bg-white/80 p-5">
            <p className="text-sm font-semibold text-[var(--ink)]">Capacity</p>
            <p className="mt-2 text-sm text-[var(--muted)]">{workout.capacity} athletes</p>
          </div>
          <div className="rounded-[1.75rem] bg-white/80 p-5">
            <p className="text-sm font-semibold text-[var(--ink)]">Instructor ID</p>
            <p className="mt-2 text-sm text-[var(--muted)]">{workout.instructor_id ?? "Unassigned"}</p>
          </div>
          <div className="rounded-[1.75rem] bg-white/80 p-5">
            <p className="text-sm font-semibold text-[var(--ink)]">Status</p>
            <p className="mt-2 text-sm text-[var(--muted)]">{workout.status}</p>
          </div>
        </div>
      </section>

      <aside className="glass-panel rounded-[2.25rem] p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[var(--accent)]">Booking action</p>
        <h2 className="section-title mt-4 text-3xl font-semibold">Reserve your spot</h2>
        <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
          This action uses the shared `useCreateBooking` hook, which invalidates both the workouts list and
          member bookings after success.
        </p>

        <form
          className="mt-8 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            const memberId = getFormValue(formData, "member_id");

            bookingMutation.mutate({
              class_id: workout.id,
              member_id: memberId || session!.member.id
            });
          }}
        >
          {canManage ? (
            <input
              className="w-full rounded-2xl border border-[rgba(19,34,56,0.08)] bg-white px-4 py-3"
              defaultValue={session?.member.id}
              name="member_id"
              placeholder="Member ID override"
            />
          ) : null}
          <button
            className="w-full rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#ff6942] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={bookingMutation.isPending}
            type="submit"
          >
            {bookingMutation.isPending ? "Booking..." : "Book workout"}
          </button>
        </form>

        {bookingMutation.data ? (
          <div className="mt-4 rounded-2xl bg-[rgba(23,184,156,0.12)] px-4 py-3 text-sm text-[var(--highlight)]">
            {bookingMutation.data.message}
          </div>
        ) : null}

        {bookingMutation.error ? (
          <div className="mt-4 rounded-2xl bg-[var(--accent-soft)] px-4 py-3 text-sm text-[var(--accent)]">
            {bookingMutation.error.message}
          </div>
        ) : null}

        {canManage ? (
          <form
            className="mt-8 space-y-4 border-t border-[rgba(19,34,56,0.08)] pt-8"
            onSubmit={(event) => {
              event.preventDefault();
              const formData = new FormData(event.currentTarget);

              updateWorkout.mutate({
                workoutId: workout.id,
                payload: {
                  name: getFormValue(formData, "name"),
                  location: getFormValue(formData, "location"),
                  instructor_id: getFormValue(formData, "instructor_id") || null,
                  scheduled_at: new Date(getFormValue(formData, "scheduled_at")).toISOString(),
                  description: getFormValue(formData, "description") || null,
                  duration_minutes: Number(formData.get("duration_minutes") ?? workout.duration_minutes),
                  capacity: Number(formData.get("capacity") ?? workout.capacity),
                  status: getFormValue(formData, "status") as "scheduled" | "cancelled" | "completed"
                }
              });
            }}
          >
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[var(--accent)]">
              Management
            </p>
            <input className="w-full rounded-2xl border border-[rgba(19,34,56,0.08)] bg-white px-4 py-3" defaultValue={workout.name} name="name" required />
            <input className="w-full rounded-2xl border border-[rgba(19,34,56,0.08)] bg-white px-4 py-3" defaultValue={workout.location} name="location" required />
            <input className="w-full rounded-2xl border border-[rgba(19,34,56,0.08)] bg-white px-4 py-3" defaultValue={workout.instructor_id ?? ""} name="instructor_id" placeholder="Instructor ID" />
            <input className="w-full rounded-2xl border border-[rgba(19,34,56,0.08)] bg-white px-4 py-3" defaultValue={toDateTimeLocalValue(workout.scheduled_at)} name="scheduled_at" required type="datetime-local" />
            <textarea className="min-h-28 w-full rounded-2xl border border-[rgba(19,34,56,0.08)] bg-white px-4 py-3" defaultValue={workout.description ?? ""} name="description" />
            <div className="grid gap-4 md:grid-cols-2">
              <input className="rounded-2xl border border-[rgba(19,34,56,0.08)] bg-white px-4 py-3" defaultValue={workout.duration_minutes} min={15} name="duration_minutes" type="number" />
              <input className="rounded-2xl border border-[rgba(19,34,56,0.08)] bg-white px-4 py-3" defaultValue={workout.capacity} min={1} name="capacity" type="number" />
            </div>
            <select className="w-full rounded-2xl border border-[rgba(19,34,56,0.08)] bg-white px-4 py-3" defaultValue={workout.status} name="status">
              <option value="scheduled">scheduled</option>
              <option value="cancelled">cancelled</option>
              <option value="completed">completed</option>
            </select>
            <div className="flex flex-wrap gap-3">
              <button className="rounded-full bg-[var(--ink)] px-5 py-3 text-sm font-semibold text-white" disabled={updateWorkout.isPending} type="submit">
                {updateWorkout.isPending ? "Saving..." : "Save changes"}
              </button>
              <button
                className="rounded-full border border-[rgba(255,122,89,0.3)] px-5 py-3 text-sm font-semibold text-[var(--accent)]"
                disabled={deleteWorkout.isPending}
                onClick={() => {
                  deleteWorkout.mutate(
                    { workoutId: workout.id },
                    {
                      onSuccess: () => {
                        void navigate("/workouts");
                      }
                    }
                  );
                }}
                type="button"
              >
                Delete workout
              </button>
            </div>
          </form>
        ) : null}
      </aside>

      {canManage ? (
        <section className="glass-panel rounded-[2.25rem] p-8 xl:col-span-2">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[var(--accent)]">Attendance</p>
          <h2 className="section-title mt-3 text-3xl font-semibold">Class attendance snapshot</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {(classAttendanceQuery.data ?? []).map((record) => (
              <div key={record.id} className="rounded-[1.5rem] bg-white/80 p-5">
                <p className="text-sm font-semibold text-[var(--ink)]">{record.member_id}</p>
                <p className="mt-2 text-sm text-[var(--muted)]">
                  Status: {record.status} · Marked {formatWorkoutSchedule(record.marked_at)}
                </p>
              </div>
            ))}
            {!classAttendanceQuery.data?.length ? (
              <div className="rounded-[1.5rem] bg-white/80 p-5 text-sm text-[var(--muted)]">
                No attendance has been marked for this class yet.
              </div>
            ) : null}
          </div>
        </section>
      ) : null}
    </div>
  );
}
