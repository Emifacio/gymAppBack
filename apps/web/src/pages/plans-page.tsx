import { Navigate } from "react-router-dom";

import { useAuth } from "@/hooks/use-auth";
import {
  useCreatePlan,
  useDeactivatePlan,
  usePlans,
  useUpdatePlan
} from "@/hooks/use-workouts";
import { formatPlanPeriod } from "@/lib/format";
import { canManagePlans } from "@/lib/roles";

function getFormValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export function PlansPage() {
  const { session } = useAuth();
  const plansQuery = usePlans({ limit: 100 });
  const createPlan = useCreatePlan();
  const updatePlan = useUpdatePlan();
  const deactivatePlan = useDeactivatePlan();

  if (!session || !canManagePlans(session.member)) {
    return <Navigate to="/" replace />;
  }

  const plans = plansQuery.data ?? [];

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-amber-700">
          Membership plans
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-900">Plan catalogue</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-600">
          Create reusable weekly or monthly plans, set credit limits, and keep free-pass rules
          separate from the day-to-day member subscription workflow.
        </p>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Create a new plan</h2>
            <p className="mt-1 text-sm text-slate-500">
              These plans are the source of truth for new member subscriptions.
            </p>
          </div>

          <form
            className="mt-6 space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              const formData = new FormData(event.currentTarget);

              createPlan.mutate({
                name: getFormValue(formData, "name"),
                description: getFormValue(formData, "description") || null,
                credits_per_period: Number(formData.get("credits_per_period") ?? 0),
                period_type: getFormValue(formData, "period_type") as "weekly" | "monthly",
                allows_free_pass: formData.get("allows_free_pass") === "on",
                active: formData.get("active") === "on"
              });

              event.currentTarget.reset();
            }}
          >
            <input
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-900"
              name="name"
              placeholder="Plan name"
              required
            />
            <textarea
              className="min-h-28 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-900"
              name="description"
              placeholder="Description"
            />
            <div className="grid gap-4 md:grid-cols-2">
              <input
                className="rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-900"
                min={0}
                name="credits_per_period"
                placeholder="Credits per period"
                required
                type="number"
              />
              <select
                className="rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-900"
                defaultValue="weekly"
                name="period_type"
              >
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            <label className="flex items-center gap-3 rounded-2xl border border-slate-300 px-4 py-3 text-sm font-medium text-slate-700">
              <input name="allows_free_pass" type="checkbox" />
              Unlimited free-pass booking mode
            </label>
            <label className="flex items-center gap-3 rounded-2xl border border-slate-300 px-4 py-3 text-sm font-medium text-slate-700">
              <input defaultChecked name="active" type="checkbox" />
              Plan is active
            </label>
            <button
              className="w-full rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              disabled={createPlan.isPending}
              type="submit"
            >
              {createPlan.isPending ? "Creating plan..." : "Create plan"}
            </button>
          </form>
        </div>

        <div className="space-y-4">
          {plans.map((plan) => (
            <article key={plan.id} className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.25em] text-amber-700">
                    {plan.active ? "Active plan" : "Inactive plan"}
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-slate-900">{plan.name}</h2>
                  <p className="mt-2 text-sm text-slate-500">
                    {plan.allows_free_pass
                      ? "Unlimited bookings while spots remain available."
                      : `${plan.credits_per_period} credits per ${formatPlanPeriod(plan.period_type).toLowerCase()}.`}
                  </p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-600">
                  {formatPlanPeriod(plan.period_type)}
                </span>
              </div>

              <form
                className="mt-6 grid gap-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  const formData = new FormData(event.currentTarget);

                  updatePlan.mutate({
                    planId: plan.id,
                    payload: {
                      name: getFormValue(formData, "name"),
                      description: getFormValue(formData, "description") || null,
                      credits_per_period: Number(formData.get("credits_per_period") ?? 0),
                      period_type: getFormValue(formData, "period_type") as "weekly" | "monthly",
                      allows_free_pass: formData.get("allows_free_pass") === "on",
                      active: formData.get("active") === "on"
                    }
                  });
                }}
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
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="flex items-center gap-3 rounded-2xl border border-slate-300 px-4 py-3 text-sm font-medium text-slate-700">
                    <input defaultChecked={plan.allows_free_pass} name="allows_free_pass" type="checkbox" />
                    Free pass
                  </label>
                  <label className="flex items-center gap-3 rounded-2xl border border-slate-300 px-4 py-3 text-sm font-medium text-slate-700">
                    <input defaultChecked={plan.active} name="active" type="checkbox" />
                    Active
                  </label>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button
                    className="rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                    disabled={updatePlan.isPending}
                    type="submit"
                  >
                    {updatePlan.isPending ? "Saving..." : "Save changes"}
                  </button>
                  <button
                    className="rounded-full border border-rose-200 px-5 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={deactivatePlan.isPending || !plan.active}
                    onClick={() => {
                      deactivatePlan.mutate({ planId: plan.id });
                    }}
                    type="button"
                  >
                    Deactivate
                  </button>
                </div>
              </form>
            </article>
          ))}

          {!plans.length && !plansQuery.isLoading ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white/70 px-5 py-6 text-sm text-slate-500">
              No plans created yet.
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
