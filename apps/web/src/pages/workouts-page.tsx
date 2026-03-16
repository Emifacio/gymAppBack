import { EmptyState } from "@/components/empty-state";
import { WorkoutCard } from "@/components/workout-card";
import { useWorkouts } from "@/hooks/use-workouts";

export function WorkoutsPage() {
  const workoutsQuery = useWorkouts({ limit: 24 });
  const workouts = workoutsQuery.data ?? [];

  if (!workouts.length && workoutsQuery.isSuccess) {
    return (
      <EmptyState
        eyebrow="Nothing scheduled"
        title="Your workout catalogue is still empty"
        description="Create classes in the FastAPI backend and they’ll show up here automatically through the generated OpenAPI contract."
      />
    );
  }

  return (
    <section className="space-y-5">
      <div className="glass-panel rounded-[2rem] p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[var(--accent)]">Classes API</p>
        <h1 className="section-title mt-3 text-4xl font-semibold">Workouts list</h1>
        <p className="mt-3 max-w-3xl text-sm leading-8 text-[var(--muted)]">
          This page is intentionally named “workouts” in the UI, while the backend resource remains
          `/classes`. The shared API package bridges that language without duplicating types.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {workouts.map((workout) => (
          <WorkoutCard key={workout.id} workout={workout} />
        ))}
      </div>
    </section>
  );
}
