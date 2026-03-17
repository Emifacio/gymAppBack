import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Navigate, useSearchParams } from "react-router-dom";

import { useStravaAuthorize, useStravaCallback, useMemberActivities, useSyncActivities } from "@/hooks/use-workouts";
import { useAuth } from "@/hooks/use-auth";
import { formatDateTime, formatDistanceMeters } from "@/lib/format";

export function IntegrationsPage() {
  const { session } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const memberId = session?.member.id ?? "";
  
  const activitiesQuery = useMemberActivities(memberId);
  const stravaAuthorize = useStravaAuthorize();
  const stravaCallback = useStravaCallback();
  const syncActivities = useSyncActivities();

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  // Handle OAuth Callback
  useEffect(() => {
    const code = searchParams.get("code");
    if (code) {
      setIsConnecting(true);
      setSearchParams({}, { replace: true });
      stravaCallback.mutate({ code }, {
        onSuccess: () => {
          setIsConnecting(false);
        },
        onError: (error: Error) => {
          setIsConnecting(false);
          setErrorMessage(error.message || "Error al completar la conexión con Strava.");
        }
      });
    }
  }, [searchParams, stravaCallback, setSearchParams]);

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

  function handleConnect() {
    if (stravaAuthorize.data?.url) {
      window.location.href = stravaAuthorize.data.url;
    } else {
      setErrorMessage("No se pudo obtener la URL de autorización de Strava.");
    }
  }

  async function handleSync(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setSyncMessage(null);

    try {
      const result = await syncActivities.mutateAsync({ memberId });
      setSyncMessage(`Sincronización en cola con la tarea ${result.task_id}. Estado actual: ${result.status}.`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "No se pudieron sincronizar las actividades.");
    }
  }

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-amber-700">Integraciones</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-900">Sincronización de rendimiento</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          Conecta Strava, sincroniza tu actividad de resistencia y trae tus entrenamientos al aire libre al
          perfil de miembro del gimnasio.
        </p>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-6">
          <section className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Strava</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {isConnecting ? "Completando conexión..." : "Vincula tu cuenta para compartir y sincronizar actividades."}
                </p>
              </div>
              <img src="/strava-logo.png" alt="Strava" className="h-8 opacity-80" />
            </div>

            <div className="mt-6">
              <button
                onClick={handleConnect}
                disabled={stravaAuthorize.isLoading || isConnecting}
                className="flex w-full items-center justify-center gap-3 rounded-full bg-[#FC4C02] px-5 py-4 text-sm font-bold text-white transition hover:bg-[#E34402] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {stravaAuthorize.isLoading || isConnecting ? (
                  "Procesando..."
                ) : (
                  <>
                    <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
                      <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
                    </svg>
                  Connect with Strava
                  </>
                )}
              </button>
            </div>
            
            {errorMessage && (
              <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {errorMessage}
              </p>
            )}
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Sincronización forzada</h2>
            <p className="mt-1 text-sm text-slate-500">
              ¿No ves tus últimas actividades? Ejecuta una sincronización manual para actualizar tu cronología.
            </p>

            <form className="mt-6 space-y-4" onSubmit={handleSync}>
              <button
                type="submit"
                disabled={syncActivities.isPending}
                className="w-full rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-50"
              >
                {syncActivities.isPending ? "Sincronizando..." : "Sincronizar ahora"}
              </button>
            </form>

            {syncMessage ? (
              <p className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {syncMessage}
              </p>
            ) : null}
          </section>
        </div>

        <section className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Cronología de actividad</h2>
              <p className="mt-1 text-sm text-slate-500">
                {activitiesQuery.data?.length ?? 0} actividades sincronizadas · {formatDistanceMeters(totalDistance)}
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
              <p className="text-sm text-slate-500">Cargando actividades...</p>
            ) : null}

            {!activitiesQuery.isLoading && (activitiesQuery.data ?? []).length === 0 ? (
              <p className="text-sm text-slate-500">
                Aún no hay actividades sincronizadas. Conecta Strava y ejecuta una sincronización para poblar esta vista.
              </p>
            ) : null}
          </div>
        </section>
      </section>
    </div>
  );
}
