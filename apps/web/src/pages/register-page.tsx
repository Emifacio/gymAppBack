import { Link, Navigate, useNavigate } from "react-router-dom";

import { isApiResponseError } from "@gym/api-client";

import { useAuth } from "@/hooks/use-auth";
import { useRegisterMutation } from "@/hooks/use-workouts";
import { getFormValue } from "@/lib/forms";

export function RegisterPage() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const register = useRegisterMutation();

  if (session) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <section className="glass-panel w-full max-w-2xl rounded-[2.5rem] p-8 md:p-10">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[var(--accent)]">Register</p>
        <h1 className="section-title mt-4 text-4xl font-semibold">Create a new member account</h1>
        <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
          The first registered user becomes admin on the backend, so this screen is useful for bootstrapping
          local environments too.
        </p>

        <form
          className="mt-8 grid gap-5 md:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();

            const formData = new FormData(event.currentTarget);
            register.mutate(
              {
                email: getFormValue(formData, "email"),
                full_name: getFormValue(formData, "full_name"),
                password: getFormValue(formData, "password"),
                phone: getFormValue(formData, "phone") || null
              },
              {
                onSuccess: () => {
                  void navigate("/", { replace: true });
                }
              }
            );
          }}
        >
          <label className="block">
            <span className="mb-2 block text-sm font-medium">Full name</span>
            <input
              className="w-full rounded-2xl border border-[rgba(19,34,56,0.08)] bg-white px-4 py-3 outline-none transition focus:border-[var(--accent)]"
              minLength={2}
              name="full_name"
              required
              type="text"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium">Email</span>
            <input
              className="w-full rounded-2xl border border-[rgba(19,34,56,0.08)] bg-white px-4 py-3 outline-none transition focus:border-[var(--accent)]"
              name="email"
              required
              type="email"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium">Phone</span>
            <input
              className="w-full rounded-2xl border border-[rgba(19,34,56,0.08)] bg-white px-4 py-3 outline-none transition focus:border-[var(--accent)]"
              name="phone"
              type="tel"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium">Password</span>
            <input
              className="w-full rounded-2xl border border-[rgba(19,34,56,0.08)] bg-white px-4 py-3 outline-none transition focus:border-[var(--accent)]"
              minLength={8}
              name="password"
              required
              type="password"
            />
          </label>

          {register.error ? (
            <div className="rounded-2xl border border-[rgba(255,122,89,0.2)] bg-[var(--accent-soft)] px-4 py-3 text-sm text-[var(--accent)] md:col-span-2">
              {isApiResponseError(register.error)
                ? "Registration failed. Check the backend validation rules or whether the email already exists."
                : register.error.message}
            </div>
          ) : null}

          <div className="md:col-span-2">
            <button
              className="w-full rounded-full bg-[var(--ink)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#1f3453] disabled:cursor-not-allowed disabled:opacity-60"
              disabled={register.isPending}
              type="submit"
            >
              {register.isPending ? "Creating account..." : "Create account"}
            </button>
          </div>
        </form>

        <p className="mt-5 text-sm text-[var(--muted)]">
          Already have an account?{" "}
          <Link className="font-semibold text-[var(--accent)]" to="/login">
            Back to sign in
          </Link>
        </p>
      </section>
    </div>
  );
}
