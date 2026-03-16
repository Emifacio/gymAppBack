import { useMemo, useState, type FormEvent } from "react";
import { Navigate } from "react-router-dom";

import { useConnectStrava, useMemberActivities, useSyncActivities } from "@/hooks/use-workouts";
import { useAuth } from "@/hooks/use-auth";
import { formatDateTime, formatDistanceMeters } from "@/lib/format";

export function IntegrationsPage() {
  const { session } = useAuth();
  const memberId = session?.member.id ?? "";
  const activitiesQuery = useMemberActivities(memberId);
  const connectStrava = useConnectStrava();
  const syncActivities = useSyncActivities();
  const [connectState, setConnectState] = useState({
    access_token: "",
    refresh_token: "",
    token_expires_at: "",
    external_account_id: ""
  });
  const [syncMemberId, setSyncMemberId] = useState(memberId);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const totalDistance = useMemo(
    () =>
      (activitiesQuery.data ?? []).reduce(
        (sum, activity) =>
          sum + (typeof activity.distance_meters === "number" ? activity.distance_meters : 0),
        0
      ),
    [activitiesQuery.data]
  );

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  async function handleConnect(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

    try {
      await connectStrava.mutateAsync({
        access_token: connectState.access_token,
        refresh_token: connectState.refresh_token || null,
        token_expires_at: connectState.token_expires_at
          ? new Date(connectState.token_expires_at).toISOString()
          : null,
        external_account_id: connectState.external_account_id || null
      });
      setConnectState({
        access_token: "",
        refresh_token: "",
        token_expires_at: "",
        external_account_id: ""
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not connect Strava.");
    }
  }

  async function handleSync(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setSyncMessage(null);

    try {
      const result = await syncActivities.mutateAsync(
        syncMemberId ? { memberId: syncMemberId } : {}
      );
      setSyncMessage(`Sync queued with task ${result.task_id}. Current status: ${result.status}.`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not sync activities.");
    }
  }

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-amber-700">Integrations</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-900">Performance sync</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          Connect Strava, sync endurance activity, and bring outdoor training into the gym member
          profile.
        </p>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-6">
          <section className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Connect Strava</h2>
            <p className="mt-1 text-sm text-slate-500">
              This form exposes all optional fields accepted by the current `StravaConnectRequest`.
            </p>

            <form className="mt-6 space-y-4" onSubmit={handleConnect}>
              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-700">Access token</span>
                <input
                  required
                  value={connectState.access_token}
                  onChange={(event) =>
                    setConnectState((current) => ({
                      ...current,
                      access_token: event.target.value
                    }))
                  }
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-900"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-700">Refresh token</span>
                <input
                  value={connectState.refresh_token}
                  onChange={(event) =>
                    setConnectState((current) => ({
                      ...current,
                      refresh_token: event.target.value
                    }))
                  }
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-900"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-700">Token expires at</span>
                <input
                  type="datetime-local"
                  value={connectState.token_expires_at}
                  onChange={(event) =>
                    setConnectState((current) => ({
                      ...current,
                      token_expires_at: event.target.value
                    }))
                  }
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-900"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-700">External account ID</span>
                <input
                  value={connectState.external_account_id}
                  onChange={(event) =>
                    setConnectState((current) => ({
                      ...current,
                      external_account_id: event.target.value
                    }))
                  }
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-900"
                />
              </label>

              <button
                type="submit"
                disabled={connectStrava.isPending}
                className="w-full rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {connectStrava.isPending ? "Connecting..." : "Connect Strava"}
              </button>
            </form>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Sync activities</h2>
            <p className="mt-1 text-sm text-slate-500">
              The sync screen also exposes the optional `member_id` override accepted by the backend.
            </p>

            <form className="mt-6 space-y-4" onSubmit={handleSync}>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                Provider: Strava
              </div>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-700">Member ID override</span>
                <input
                  value={syncMemberId}
                  onChange={(event) => setSyncMemberId(event.target.value)}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-900"
                />
              </label>

              <button
                type="submit"
                disabled={syncActivities.isPending}
                className="w-full rounded-full bg-amber-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:bg-amber-200"
              >
                {syncActivities.isPending ? "Syncing..." : "Run sync"}
              </button>
            </form>

            {syncMessage ? (
              <p className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {syncMessage}
              </p>
            ) : null}

            {errorMessage ? (
              <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {errorMessage}
              </p>
            ) : null}
          </section>
        </div>

        <section className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Activity timeline</h2>
              <p className="mt-1 text-sm text-slate-500">
                {activitiesQuery.data?.length ?? 0} activities synced · {formatDistanceMeters(totalDistance)}
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            {(activitiesQuery.data ?? []).map((activity) => (
              <div key={activity.id} className="rounded-2xl border border-slate-200 px-4 py-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">{activity.name}</p>
                    <p className="text-sm text-slate-500">
                      {formatDateTime(activity.started_at)} · {formatDistanceMeters(activity.distance_meters)}
                    </p>
                  </div>
                  <span className="rounded-full bg-sky-100 px-3 py-1 text-sm font-medium text-sky-800">
                    {activity.provider}
                  </span>
                </div>
              </div>
            ))}

            {activitiesQuery.isLoading ? (
              <p className="text-sm text-slate-500">Loading activities...</p>
            ) : null}

            {!activitiesQuery.isLoading && (activitiesQuery.data ?? []).length === 0 ? (
              <p className="text-sm text-slate-500">
                No synced activities yet. Connect Strava and run a sync to populate this view.
              </p>
            ) : null}
          </div>
        </section>
      </section>
    </div>
  );
}
