import { useHealth } from "@/hooks/use-workouts";

export function SystemStatusPage() {
  const healthQuery = useHealth();
  const payload = healthQuery.data ?? {};
  const entries = Object.entries(payload);

  return (
    <div className="space-y-6">
      <section className="glass-panel rounded-[2rem] p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[var(--accent)]">
          System health
        </p>
        <h1 className="section-title mt-3 text-4xl font-semibold">Backend status</h1>
        <p className="mt-3 max-w-3xl text-sm leading-8 text-[var(--muted)]">
          This page exposes the FastAPI `/health` endpoint directly in the web app so the full
          generated contract is reachable from the frontend.
        </p>
      </section>

      <section className="glass-panel rounded-[2rem] p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="section-title text-3xl font-semibold">Health snapshot</h2>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Useful for support, staging validation, and deployment checks.
            </p>
          </div>
          <button
            className="rounded-full bg-[var(--ink)] px-5 py-3 text-sm font-semibold text-white"
            onClick={() => {
              void healthQuery.refetch();
            }}
            type="button"
          >
            Refresh status
          </button>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {entries.map(([key, value]) => (
            <div key={key} className="rounded-[1.5rem] bg-white/80 p-5">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
                {key}
              </p>
              <p className="mt-2 text-lg font-semibold text-[var(--ink)]">{String(value)}</p>
            </div>
          ))}

          {!healthQuery.isLoading && entries.length === 0 ? (
            <div className="rounded-[1.5rem] bg-white/80 p-5 text-sm text-[var(--muted)]">
              The health endpoint returned an empty payload.
            </div>
          ) : null}

          {healthQuery.isLoading ? (
            <div className="rounded-[1.5rem] bg-white/80 p-5 text-sm text-[var(--muted)]">
              Checking backend status...
            </div>
          ) : null}

          {healthQuery.error ? (
            <div className="rounded-[1.5rem] bg-[var(--accent-soft)] p-5 text-sm text-[var(--accent)]">
              {healthQuery.error.message}
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
