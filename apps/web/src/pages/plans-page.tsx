import { Navigate } from "react-router-dom";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { InlineFeedback } from "@/components/ui/InlineFeedback";
import { MotionTokens, SuccessTokens } from "@/components/ui/motion-tokens";
import { SkeletonPlanCard } from "@/components/ui/skeletons";
import { useAuth } from "@/hooks/use-auth";
import {
  useCreatePlan,
  useDeactivatePlan,
  usePlans,
  useUpdatePlan
} from "@/hooks/use-workouts";
import { formatPlanPeriod } from "@/lib/format";
import { canManagePlans } from "@/lib/roles";
import { useTransientState } from "@/hooks/useTransientState";

function getFormValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

interface RowState {
  isSaving: boolean;
  isDeactivating: boolean;
  isSuccess: boolean;
}

export function PlansPage() {
  const { session } = useAuth();
  const plansQuery = usePlans({ limit: 100 });
  const createPlan = useCreatePlan();
  const updatePlan = useUpdatePlan();
  const deactivatePlan = useDeactivatePlan();
  
  const [rowStates, setRowStates] = useState<Record<string, RowState>>({});
  const [highlightedPlanId, setHighlightedPlanId] = useState<string | null>(null);
  const [newlyCreatedPlanId, setNewlyCreatedPlanId] = useState<string | null>(null);
  const [deactivatedPlanId, setDeactivatedPlanId] = useState<string | null>(null);
  const createFeedback = useTransientState({ duration: MotionTokens.feedback.errorDuration });

  if (!session || !canManagePlans(session.member)) {
    return <Navigate to="/" replace />;
  }

  const plans = plansQuery.data ?? [];

  const getRowState = (planId: string): RowState => {
    return rowStates[planId] ?? { isSaving: false, isDeactivating: false, isSuccess: false };
  };

  const setRowState = (planId: string, updates: Partial<RowState>) => {
    setRowStates((prev) => ({
      ...prev,
      [planId]: { ...getRowState(planId), ...updates }
    }));
  };

  const highlightRow = (planId: string) => {
    setHighlightedPlanId(planId);
    setTimeout(() => setHighlightedPlanId(null), MotionTokens.highlight.emphasizedReset);
  };

  const handleCreatePlan = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    createFeedback.triggerLoading();

    createPlan.mutate({
      name: getFormValue(formData, "name"),
      description: getFormValue(formData, "description") || null,
      credits_per_period: Number(formData.get("credits_per_period") ?? 0),
      period_type: getFormValue(formData, "period_type") as "weekly" | "monthly",
      allows_free_pass: formData.get("allows_free_pass") === "on",
      active: formData.get("active") === "on"
    }, {
      onSuccess: (data) => {
        createFeedback.triggerSuccess("Plan creado correctamente.");
        setNewlyCreatedPlanId(data.id);
        setHighlightedPlanId(data.id);
        setTimeout(() => {
          setNewlyCreatedPlanId(null);
          setHighlightedPlanId(null);
        }, MotionTokens.highlight.newItemReset);
        event.currentTarget.reset();
      },
      onError: (error) => {
        const message = error instanceof Error ? error.message : "Error al crear el plan.";
        createFeedback.triggerError(message);
      }
    });
  };

  const handleUpdatePlan = (planId: string) => {
    setRowState(planId, { isSaving: true });
    
    return (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const formData = new FormData(event.currentTarget);

      updatePlan.mutate({
        planId,
        payload: {
          name: getFormValue(formData, "name"),
          description: getFormValue(formData, "description") || null,
          credits_per_period: Number(formData.get("credits_per_period") ?? 0),
          period_type: getFormValue(formData, "period_type") as "weekly" | "monthly",
          allows_free_pass: formData.get("allows_free_pass") === "on",
          active: formData.get("active") === "on"
        }
      }, {
        onSuccess: () => {
          setRowState(planId, { isSaving: false, isSuccess: true });
          highlightRow(planId);
          setTimeout(() => setRowState(planId, { isSuccess: false }), MotionTokens.highlight.rowReset);
        },
        onError: () => {
          setRowState(planId, { isSaving: false });
        }
      });
    };
  };

  const handleDeactivatePlan = (planId: string) => {
    setRowState(planId, { isDeactivating: true });

    deactivatePlan.mutate({ planId }, {
      onSuccess: () => {
        setRowState(planId, { isDeactivating: false, isSuccess: true });
        setDeactivatedPlanId(planId);
        highlightRow(planId);
        setTimeout(() => {
          setRowState(planId, { isSuccess: false });
          setDeactivatedPlanId(null);
        }, MotionTokens.highlight.rowReset);
      },
      onError: () => {
        setRowState(planId, { isDeactivating: false });
      }
    });
  };

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-amber-700">
          Planes de membresía
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-900">Catálogo de planes</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-600">
          Crea planes semanales o mensuales reutilizables, establece límites de créditos y mantén las reglas
          de pases libres separadas del flujo diario de suscripciones de miembros.
        </p>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Crear un nuevo plan</h2>
            <p className="mt-1 text-sm text-slate-500">
              Estos planes son la fuente de verdad para las nuevas suscripciones de miembros.
            </p>
          </div>

          <form
            className="mt-6 space-y-4"
            onSubmit={handleCreatePlan}
          >
            {(createFeedback.isSuccess || createFeedback.isError) ? (
              <InlineFeedback
                message={createFeedback.message}
                type={createFeedback.isSuccess ? "success" : "error"}
              />
            ) : null}

            <input
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-900"
              name="name"
              placeholder="Nombre del plan"
              required
            />
            <textarea
              className="min-h-28 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-900"
              name="description"
              placeholder="Descripción"
            />
            <div className="grid gap-4 md:grid-cols-2">
              <input
                className="rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-900"
                min={0}
                name="credits_per_period"
                placeholder="Créditos por periodo"
                required
                type="number"
              />
              <select
                className="rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-900"
                defaultValue="weekly"
                name="period_type"
              >
                <option value="weekly">Semanal</option>
                <option value="monthly">Mensual</option>
              </select>
            </div>
            <label className="flex items-center gap-3 rounded-2xl border border-slate-300 px-4 py-3 text-sm font-medium text-slate-700">
              <input name="allows_free_pass" type="checkbox" />
              Modo de reserva de pase libre ilimitado
            </label>
            <label className="flex items-center gap-3 rounded-2xl border border-slate-300 px-4 py-3 text-sm font-medium text-slate-700">
              <input defaultChecked name="active" type="checkbox" />
              El plan está activo
            </label>
            <Button
              className="w-full"
              loading={createFeedback.isLoading}
              success={createFeedback.isSuccess}
              disabled={createFeedback.isLoading}
              type="submit"
              variant="primary"
            >
              {createFeedback.isLoading ? "Creando..." : createFeedback.isSuccess ? "Creado" : "Crear plan"}
            </Button>
          </form>
        </div>

        <div className="space-y-4">
          {plansQuery.isLoading ? (
            <>
              <SkeletonPlanCard />
              <SkeletonPlanCard />
            </>
          ) : plans.map((plan) => {
            const rowState = getRowState(plan.id);
            const isNewlyCreated = newlyCreatedPlanId === plan.id;
            return (
            <article
              key={plan.id}
              className={`rounded-3xl border bg-white/90 p-6 shadow-sm transition-all duration-${MotionTokens.transition.slow} ${
                highlightedPlanId === plan.id
                  ? isNewlyCreated
                    ? `${SuccessTokens.border.emphasized} ${SuccessTokens.shadow.emphasized} ${SuccessTokens.ring.emphasized} scale-[1.01] animate-in fade-in slide-in-from-bottom-2`
                    : `${SuccessTokens.border.standard} ${SuccessTokens.shadow.standard}`
                  : "border-slate-200"
              } ${rowState.isSuccess && !isNewlyCreated ? SuccessTokens.ring.standard : ""}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className={`text-sm font-semibold uppercase tracking-[0.25em] transition-all duration-${MotionTokens.transition.emphasized} ${
                    deactivatedPlanId === plan.id
                      ? "text-slate-400 scale-95"
                      : plan.active
                        ? "text-amber-700"
                        : "text-slate-500"
                  }`}>
                    {deactivatedPlanId === plan.id ? "Desactivando..." : plan.active ? "Plan activo" : "Plan inactivo"}
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-slate-900">{plan.name}</h2>
                  <p className="mt-2 text-sm text-slate-500">
                    {plan.allows_free_pass
                      ? "Reservas ilimitadas mientras queden lugares disponibles."
                      : `${plan.credits_per_period} créditos por ${formatPlanPeriod(plan.period_type).toLowerCase()}.`}
                  </p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-600">
                  {formatPlanPeriod(plan.period_type)}
                </span>
              </div>

              <form
                className="mt-6 grid gap-4"
                onSubmit={handleUpdatePlan(plan.id)}
              >
                <input
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-900"
                  defaultValue={plan.name}
                  name="name"
                  required
                />
                <textarea
                  className="min-h-24 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-900"
                  defaultValue={plan.description ?? ""}
                  name="description"
                />
                <div className="grid gap-4 md:grid-cols-2">
                  <input
                    className="rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-900"
                    defaultValue={plan.credits_per_period}
                    min={0}
                    name="credits_per_period"
                    type="number"
                  />
                  <select
                    className="rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-900"
                    defaultValue={plan.period_type}
                    name="period_type"
                  >
                    <option value="weekly">Semanal</option>
                    <option value="monthly">Mensual</option>
                  </select>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="flex items-center gap-3 rounded-2xl border border-slate-300 px-4 py-3 text-sm font-medium text-slate-700">
                    <input defaultChecked={plan.allows_free_pass} name="allows_free_pass" type="checkbox" />
                    Pase libre
                  </label>
                  <label className="flex items-center gap-3 rounded-2xl border border-slate-300 px-4 py-3 text-sm font-medium text-slate-700">
                    <input defaultChecked={plan.active} name="active" type="checkbox" />
                    Activo
                  </label>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button
                    loading={rowState.isSaving}
                    success={rowState.isSuccess && !rowState.isSaving}
                    disabled={rowState.isSaving}
                    type="submit"
                    variant="primary"
                  >
                    {rowState.isSaving ? "Guardando..." : rowState.isSuccess ? "Guardado" : "Guardar cambios"}
                  </Button>
                  <Button
                    className="border border-rose-200 text-rose-700 hover:bg-rose-50"
                    disabled={!plan.active || rowState.isSaving || rowState.isDeactivating}
                    loading={rowState.isDeactivating}
                    onClick={() => handleDeactivatePlan(plan.id)}
                    type="button"
                    variant="secondary"
                  >
                    {rowState.isDeactivating ? "Desactivando..." : "Desactivar"}
                  </Button>
                </div>
              </form>
            </article>
          );
          })}

          {!plans.length && !plansQuery.isLoading ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white/70 px-5 py-6 text-sm text-slate-500">
              Aún no se han creado planes.
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
