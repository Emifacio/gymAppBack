import { useState } from "react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/empty-state";
import { WorkoutCard } from "@/components/workout-card";
import { StatCard } from "@/components/stat-card";
import { useAuth } from "@/hooks/use-auth";
import { useCreateWorkout, useMySubscriptionStatus, useWorkouts } from "@/hooks/use-workouts";
import { formatCredits, formatDateTime } from "@/lib/format";
import { canManageOperations } from "@/lib/roles";

function getFormValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export function WorkoutsPage() {
  const { session } = useAuth();
  const subscriptionQuery = useMySubscriptionStatus();
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
  const subscription = subscriptionQuery.data;
  const canManage = canManageOperations(session?.member);
  const showEmptyState = !workouts.length && workoutsQuery.isSuccess;

  return (
    <div className="space-y-10">
      <header>
        <h1 className="section-title text-4xl font-extrabold text-[var(--ink-900)] tracking-tight">Schedule</h1>
        <p className="mt-2 text-base font-medium text-[var(--ink-500)]">
          Explore upcoming classes, manage your bookings, and track your training journey.
        </p>
      </header>

      <section className="grid gap-6 md:grid-cols-3">
        <StatCard
          detail={
            subscription?.active_plan
              ? subscription.plan_name ?? "Assigned"
              : "No active plan"
          }
          label="Active plan"
          value={subscription?.active_plan ? "Assigned" : "None"}
        />
        <StatCard
          detail={
            subscription?.active_plan
              ? subscription.allows_free_pass
                ? "Unlimited capacity"
                : `${formatCredits(subscription.active_credits)} remaining`
              : "Booking locked"
          }
          label="Credits"
          value={subscription?.active_plan ? String(subscription.active_credits) : "0"}
        />
        <StatCard
          detail={formatDateTime(subscription?.period_end)}
          label="Renewal"
          value="Period end"
        />
      </section>

      <section className="apple-card p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-xl font-bold text-[var(--ink-900)]">Refine Schedule</h2>
            <p className="mt-1 text-sm font-medium text-[var(--ink-500)]">Filter by class status and availability.</p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--ink-500)]">Status</span>
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
              <option value="">All statuses</option>
              <option value="scheduled">Scheduled</option>
              <option value="cancelled">Cancelled</option>
              <option value="completed">Completed</option>
            </select>
          </div>
          {/* Pagination inputs omitted for cleaner UI, can be added back if needed */}
        </div>
      </section>

      {canManage && (
        <section className="apple-card p-8 bg-[var(--bg-main)]/50">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-[var(--ink-900)]">Create Workout</h2>
            <p className="mt-1 text-sm font-medium text-[var(--ink-500)]">Schedule a new training session for the community.</p>
          </div>

          <form
            className="grid gap-6 md:grid-cols-2"
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
            <input className="rounded-xl border border-[var(--surface-outline)] bg-white px-4 py-3 text-sm font-medium" name="name" placeholder="Workout name" required />
            <input className="rounded-xl border border-[var(--surface-outline)] bg-white px-4 py-3 text-sm font-medium" name="location" placeholder="Location" required />
            <input className="rounded-xl border border-[var(--surface-outline)] bg-white px-4 py-3 text-sm font-medium" name="instructor_id" placeholder="Instructor ID (optional)" />
            <input className="rounded-xl border border-[var(--surface-outline)] bg-white px-4 py-3 text-sm font-medium" min={15} name="duration_minutes" placeholder="Duration (minutes)" required type="number" />
            <input className="rounded-xl border border-[var(--surface-outline)] bg-white px-4 py-3 text-sm font-medium" min={1} name="capacity" placeholder="Capacity" required type="number" />
            <input className="rounded-xl border border-[var(--surface-outline)] bg-white px-4 py-3 text-sm font-medium" name="scheduled_at" required type="datetime-local" />
            <textarea className="rounded-xl border border-[var(--surface-outline)] bg-white px-4 py-3 text-sm font-medium md:col-span-2" name="description" placeholder="Description" />
            
            <div className="md:col-span-2">
              <Button className="w-full h-12" loading={createWorkout.isPending} type="submit" variant="primary">
                {createWorkout.isPending ? "Scheduling..." : "Create workout"}
              </Button>
            </div>
          </form>
        </section>
      )}

      {showEmptyState ? (
        <EmptyState
          eyebrow="Availability"
          title="No classes scheduled"
          description="Check back later or contact administrators for the upcoming training block."
        />
      ) : (
        <div className="grid gap-6">
          {workouts.map((workout) => (
            <WorkoutCard key={workout.id} workout={workout} />
          ))}
        </div>
      )}
    </div>
  );
}
