import { Navigate } from "react-router-dom";
import { useCallback, useState } from "react";

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

  const getRowState = (planId: string): RowState => {
    return rowStates[planId] ?? { isSaving: false, isDeactivating: false, isSuccess: false };
  };

  const setRowState = (planId: string, updates: Partial<RowState>) => {
    setRowStates((prev) => ({
      ...prev,
      [planId]: { ...(prev[planId] ?? { isSaving: false, isDeactivating: false, isSuccess: false }), ...updates }
    }));
  };

  const highlightRow = useCallback((planId: string) => {
    setHighlightedPlanId(planId);
    setTimeout(() => setHighlightedPlanId(null), MotionTokens.highlight.emphasizedReset);
  }, []);

  const handleCreatePlan = useCallback((event: React.FormEvent<HTMLFormElement>) => {
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
  }, [createPlan, createFeedback]);

  const handleUpdatePlan = useCallback((planId: string) => {
    return (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setRowState(planId, { isSaving: true });
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
  }, [updatePlan, highlightRow]);

  const handleDeactivatePlan = useCallback((planId: string) => {
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
  }, [deactivatePlan, highlightRow]);

  if (!session || !canManagePlans(session.member)) {
    return <Navigate to="/" replace />;
  }

  const plans = plansQuery.data ?? [];

  return (
    <div className="space-y-[var(--section-gap)] transition-colors duration-300">
      <header className="apple-card shadow-xl p-8 border border-[var(--border-base)]">
        <p className="text-sm font-bold uppercase tracking-[0.3em] text-[var(--accent)] opacity-80">
          Operaciones de Gestión
        </p>
        <h1 className="mt-3 text-4xl font-bold text-[var(--text-primary)] tracking-tight">Catálogo de Planes</h1>
        <p className="mt-3 max-w-3xl text-sm md:text-base leading-relaxed text-[var(--text-secondary)]">
          Define las reglas de membresía, límites de créditos y pases libres. Estos planes se aplican a las nuevas suscripciones de miembros.
        </p>
      </header>

      <section className="grid gap-8 xl:grid-cols-[1fr_1.2fr]">
        <div className="apple-card shadow-lg p-8 h-fit sticky top-28">
          <div>
            <h2 className="text-2xl font-bold text-[var(--text-primary)]">Nuevo Plan</h2>
            <p className="mt-1 text-sm text-[var(--text-muted)] font-medium">
              Añade una nueva oferta al catálogo de membresías.
            </p>
          </div>

          <form
            className="mt-8 space-y-5"
            onSubmit={handleCreatePlan}
          >
            {(createFeedback.isSuccess || createFeedback.isError) ? (
              <InlineFeedback
                message={createFeedback.message}
                type={createFeedback.isSuccess ? "success" : "error"}
              />
            ) : null}

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] px-1">Nombre</label>
              <input
                className="w-full rounded-2xl border border-transparent bg-[var(--bg-surface-secondary)] text-[var(--text-primary)] px-5 py-4 text-sm font-medium outline-none transition-all focus:bg-[var(--bg-surface)] focus:border-[var(--accent)] shadow-sm focus:shadow-md"
                name="name"
                placeholder="Ej: Plan Pro Mensual"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] px-1">Descripción</label>
              <textarea
                className="min-h-32 w-full rounded-2xl border border-transparent bg-[var(--bg-surface-secondary)] text-[var(--text-primary)] px-5 py-4 text-sm font-medium outline-none transition-all focus:bg-[var(--bg-surface)] focus:border-[var(--accent)] shadow-sm focus:shadow-md"
                name="description"
                placeholder="¿Qué incluye este plan?"
              />
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] px-1">Créditos</label>
                <input
                  className="w-full rounded-2xl border border-transparent bg-[var(--bg-surface-secondary)] text-[var(--text-primary)] px-5 py-4 text-sm font-medium outline-none transition focus:bg-[var(--bg-surface)] focus:border-[var(--accent)] shadow-sm"
                  min={0}
                  name="credits_per_period"
                  placeholder="0"
                  required
                  type="number"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] px-1">Periodo</label>
                <select
                  className="w-full rounded-2xl border border-transparent bg-[var(--bg-surface-secondary)] text-[var(--text-primary)] px-5 py-4 text-sm font-medium outline-none transition focus:bg-[var(--bg-surface)] focus:border-[var(--accent)] shadow-sm appearance-none"
                  defaultValue="weekly"
                  name="period_type"
                >
                  <option value="weekly">Semanal</option>
                  <option value="monthly">Mensual</option>
                </select>
              </div>
            </div>

            <div className="grid gap-4 pt-2">
              <label className="flex items-center gap-3 rounded-2xl bg-[var(--bg-surface-secondary)] p-4 text-sm font-bold text-[var(--text-primary)] cursor-pointer hover:bg-[var(--accent-soft)] transition-colors group border border-transparent hover:border-[var(--accent-soft)]">
                <input name="allows_free_pass" type="checkbox" className="h-5 w-5 rounded-lg accent-[var(--accent)]" />
                <span>Pase libre ilimitado</span>
              </label>
              <label className="flex items-center gap-3 rounded-2xl bg-[var(--bg-surface-secondary)] p-4 text-sm font-bold text-[var(--text-primary)] cursor-pointer hover:bg-[var(--accent-soft)] transition-colors group border border-transparent hover:border-[var(--accent-soft)]">
                <input defaultChecked name="active" type="checkbox" className="h-5 w-5 rounded-lg accent-[var(--accent)]" />
                <span>Plan activo por defecto</span>
              </label>
            </div>

            <Button
              className="w-full h-14 text-base font-bold shadow-lg shadow-[var(--accent-soft)] rounded-2xl"
              loading={createFeedback.isLoading}
              success={createFeedback.isSuccess}
              disabled={createFeedback.isLoading}
              type="submit"
              variant="primary"
            >
              {createFeedback.isLoading ? "Procesando..." : createFeedback.isSuccess ? "Plan Creado" : "Crear Plan Ahora"}
            </Button>
          </form>
        </div>

        <div className="space-y-6">
          {plansQuery.isLoading ? (
            <>
              <SkeletonPlanCard />
              <SkeletonPlanCard />
              <SkeletonPlanCard />
            </>
          ) : plans.map((plan) => {
            const rowState = getRowState(plan.id);
            const isNewlyCreated = newlyCreatedPlanId === plan.id;
            const cardHighlightClass = highlightedPlanId === plan.id
              ? isNewlyCreated
                ? `${SuccessTokens.ring.emphasized} scale-[1.02] shadow-2xl`
                : `${SuccessTokens.ring.standard} shadow-xl`
              : "shadow-md hover:shadow-xl";

            return (
            <article
              key={plan.id}
              className={`apple-card p-8 transition-all duration-500 ${cardHighlightClass} ${!plan.active ? "opacity-75 grayscale-[0.5]" : ""}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full ${plan.active ? "bg-[var(--success)] animate-pulse" : "bg-[var(--text-muted)]"}`} />
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">
                      {plan.active ? "Activo para ventas" : "Archivo / Inactivo"}
                    </span>
                  </div>
                  <h2 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">{plan.name}</h2>
                  <p className="max-w-md text-sm font-medium text-[var(--text-secondary)] leading-relaxed">
                    {plan.allows_free_pass
                      ? "Pase libre ilimitado para todas las sesiones disponibles."
                      : `${plan.credits_per_period} créditos disponibles por cada periodo ${formatPlanPeriod(plan.period_type).toLowerCase()}.`}
                  </p>
                </div>
                <div className="rounded-2xl bg-[var(--accent-soft)] px-4 py-2 text-xs font-bold text-[var(--accent)] border border-[var(--accent-soft)]">
                  {formatPlanPeriod(plan.period_type)}
                </div>
              </div>

              <form
                className="mt-10 space-y-6"
                onSubmit={handleUpdatePlan(plan.id)}
              >
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] px-1">Actualizar Nombre</label>
                    <input
                      className="w-full rounded-2xl border border-transparent bg-[var(--bg-surface-secondary)] text-[var(--text-primary)] px-5 py-3.5 text-sm font-bold outline-none transition focus:bg-[var(--bg-surface)] focus:border-[var(--accent)]"
                      defaultValue={plan.name}
                      name="name"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] px-1">Periodo</label>
                    <select
                      className="w-full rounded-2xl border border-transparent bg-[var(--bg-surface-secondary)] text-[var(--text-primary)] px-5 py-3.5 text-sm font-bold outline-none transition focus:bg-[var(--bg-surface)] focus:border-[var(--accent)]"
                      defaultValue={plan.period_type}
                      name="period_type"
                    >
                      <option value="weekly">Semanal</option>
                      <option value="monthly">Mensual</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] px-1">Créditos de Base</label>
                  <input
                    className="w-full rounded-2xl border border-transparent bg-[var(--bg-surface-secondary)] text-[var(--text-primary)] px-5 py-3.5 text-sm font-bold outline-none transition focus:bg-[var(--bg-surface)] focus:border-[var(--accent)]"
                    defaultValue={plan.credits_per_period}
                    min={0}
                    name="credits_per_period"
                    type="number"
                  />
                </div>

                <div className="flex flex-wrap gap-4 pt-4">
                  <Button
                    loading={rowState.isSaving}
                    success={rowState.isSuccess && !rowState.isSaving}
                    disabled={rowState.isSaving}
                    type="submit"
                    variant="primary"
                    className="flex-1 h-12 font-bold shadow-md"
                  >
                    Guardar Cambios
                  </Button>
                  <Button
                    className="h-12 px-6 font-bold border border-[var(--border-base)] hover:bg-[var(--danger-soft)] hover:text-[var(--danger)] hover:border-transparent transition-all"
                    disabled={!plan.active || rowState.isSaving || rowState.isDeactivating}
                    loading={rowState.isDeactivating}
                    onClick={() => handleDeactivatePlan(plan.id)}
                    type="button"
                    variant="secondary"
                  >
                    {rowState.isDeactivating ? "..." : "Desactivar"}
                  </Button>
                </div>
              </form>
            </article>
          );
          })}

          {!plans.length && !plansQuery.isLoading ? (
            <div className="apple-card border-dashed border-2 flex flex-col items-center justify-center py-20 text-center space-y-4 opacity-70">
              <div className="h-16 w-16 rounded-full bg-[var(--bg-surface-secondary)] flex items-center justify-center">
                <CreditCard className="h-8 w-8 text-[var(--text-muted)]" />
              </div>
              <div>
                <p className="font-bold text-[var(--text-primary)]">No hay planes todavía</p>
                <p className="text-sm text-[var(--text-muted)] max-w-xs mt-1">Empieza creando el primer plan de membresía para tu gimnasio.</p>
              </div>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function CreditCard(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="20" height="14" x="2" y="5" rx="2" />
      <line x1="2" x2="22" y1="10" y2="10" />
    </svg>
  );
}
