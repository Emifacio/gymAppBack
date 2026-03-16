import { useState } from "react";
import { Link } from "react-router-dom";

import { EmptyState } from "@/components/empty-state";
import { WorkoutCard } from "@/components/workout-card";
import { useAuth } from "@/hooks/use-auth";
import { useCreateWorkout, useWorkouts } from "@/hooks/use-workouts";
import { canManageOperations } from "@/lib/roles";

function getFormValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export function WorkoutsPage() {
  const { session } = useAuth();
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
  const canManage = canManageOperations(session?.member);
  const showEmptyState = !workouts.length && workoutsQuery.isSuccess;

  return (
    <section className="space-y-5">
      <div className="glass-panel rounded-[2rem] p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[var(--accent)]">Classes API</p>
        <h1 className="section-title mt-3 text-4xl font-semibold">Class schedule</h1>
        <p className="mt-3 max-w-3xl text-sm leading-8 text-[var(--muted)]">
          Browse live class availability, current waitlist pressure, and your personal booking status from
          the backend `/classes` endpoint.
        </p>

        <div className="mt-6 grid gap-4 rounded-[1.5rem] bg-white/70 p-4 md:grid-cols-3">
          <label className="block">
            <span className="mb-2 block text-sm font-medium">Status filter</span>
            <select
              className="w-full rounded-2xl border border-[rgba(19,34,56,0.08)] bg-white px-4 py-3"
              value={filters.status}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  status: event.target.value as "" | "scheduled" | "cancelled" | "completed"
                }))
              }
            >
              <option value="">All statuses</option>
              <option value="scheduled">Scheduled</option>
              <option value="cancelled">Cancelled</option>
              <option value="completed">Completed</option>
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium">Offset</span>
            <input
              className="w-full rounded-2xl border border-[rgba(19,34,56,0.08)] bg-white px-4 py-3"
              min={0}
              type="number"
              value={filters.offset}
              onChange={(event) =>
                setFilters((current) => ({ ...current, offset: Number(event.target.value || 0) }))
              }
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium">Limit</span>
            <input
              className="w-full rounded-2xl border border-[rgba(19,34,56,0.08)] bg-white px-4 py-3"
              min={1}
              type="number"
              value={filters.limit}
              onChange={(event) =>
                setFilters((current) => ({ ...current, limit: Number(event.target.value || 1) }))
              }
            />
          </label>
        </div>
      </div>

      {canManage ? (
        <section className="glass-panel rounded-[2rem] p-8">
          <div className="flex flex-col gap-2">
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[var(--accent)]">
              Manage classes
            </p>
            <h2 className="section-title text-3xl font-semibold">Create a workout</h2>
            <p className="text-sm leading-7 text-[var(--muted)]">
              Admins can create classes for any instructor. Instructors can leave the instructor field blank
              to create sessions for themselves.
            </p>
          </div>

          <form
            className="mt-6 grid gap-4 md:grid-cols-2"
            onSubmit={(event) => {
              event.preventDefault();
              const formData = new FormData(event.currentTarget);

              createWorkout.mutate({
                name: getFormValue(formData, "name"),
                description: getFormValue(formData, "description") || null,
                instructor_id: getFormValue(formData, "instructor_id") || null,
                scheduled_at: new Date(getFormValue(formData, "scheduled_at")).toISOString(),
                duration_minutes: Number(formData.get("duration_minutes") ?? 60),
                capacity: Number(formData.get("capacity") ?? 12),
                location: getFormValue(formData, "location"),
                status:
                  (getFormValue(formData, "status") as "scheduled" | "cancelled" | "completed") ||
                  "scheduled"
              });

              event.currentTarget.reset();
            }}
          >
            <input className="rounded-2xl border border-[rgba(19,34,56,0.08)] bg-white px-4 py-3" name="name" placeholder="Workout name" required />
            <input className="rounded-2xl border border-[rgba(19,34,56,0.08)] bg-white px-4 py-3" name="location" placeholder="Location" required />
            <input className="rounded-2xl border border-[rgba(19,34,56,0.08)] bg-white px-4 py-3" name="instructor_id" placeholder="Instructor ID (optional)" />
            <input className="rounded-2xl border border-[rgba(19,34,56,0.08)] bg-white px-4 py-3" min={15} name="duration_minutes" placeholder="Duration (minutes)" required type="number" />
            <input className="rounded-2xl border border-[rgba(19,34,56,0.08)] bg-white px-4 py-3" min={1} name="capacity" placeholder="Capacity" required type="number" />
            <input className="rounded-2xl border border-[rgba(19,34,56,0.08)] bg-white px-4 py-3 md:col-span-2" name="scheduled_at" required type="datetime-local" />
            <textarea className="min-h-28 rounded-2xl border border-[rgba(19,34,56,0.08)] bg-white px-4 py-3 md:col-span-2" name="description" placeholder="Description" />
            <select className="rounded-2xl border border-[rgba(19,34,56,0.08)] bg-white px-4 py-3 md:col-span-2" defaultValue="scheduled" name="status">
              <option value="scheduled">scheduled</option>
              <option value="cancelled">cancelled</option>
              <option value="completed">completed</option>
            </select>
            <div className="md:col-span-2">
              <button className="rounded-full bg-[var(--ink)] px-5 py-3 text-sm font-semibold text-white" disabled={createWorkout.isPending} type="submit">
                {createWorkout.isPending ? "Creating..." : "Create workout"}
              </button>
            </div>
          </form>

          {createWorkout.data ? (
            <p className="mt-4 text-sm text-[var(--highlight)]">
              Created {createWorkout.data.name}.{" "}
              <Link className="font-semibold text-[var(--ink)]" to={`/workouts/${createWorkout.data.id}`}>
                Open detail
              </Link>
            </p>
          ) : null}
        </section>
      ) : null}

      {showEmptyState ? (
        <EmptyState
          eyebrow="Nothing scheduled"
          title="Your workout catalogue is still empty"
          description={
            canManage
              ? "Create the first class with the form above and it will appear here automatically."
              : "Classes created in the backend will appear here automatically through the shared OpenAPI contract."
          }
        />
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {workouts.map((workout) => (
            <WorkoutCard key={workout.id} workout={workout} />
          ))}
        </div>
      )}
    </section>
  );
}
