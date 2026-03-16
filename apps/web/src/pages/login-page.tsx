import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";

import { isApiResponseError } from "@gym/api-client";

import { useAuth } from "@/hooks/use-auth";
import { useLoginMutation } from "@/hooks/use-workouts";
import { getFormValue } from "@/lib/forms";

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { session } = useAuth();
  const login = useLoginMutation();

  if (session) {
    return <Navigate to="/" replace />;
  }

  const redirectTo = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? "/";

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="grid w-full max-w-6xl gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="glass-panel hidden rounded-[2.5rem] p-10 lg:block">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[var(--accent)]">
            Plataforma de Gimnasio
          </p>
          <h1 className="section-title mt-6 text-5xl font-semibold leading-tight">
            Arquitectura frontend contract-first, finalmente traducida en producto.
          </h1>
          <p className="mt-6 max-w-xl text-base leading-8 text-[var(--muted)]">
            React web, Expo mobile, un cliente generado, una única fuente de verdad. Inicia sesión para inspeccionar los datos del
            backend en vivo a través de la interfaz compartida y tipada.
          </p>
          <div className="mt-10 grid gap-4 md:grid-cols-2">
            <div className="rounded-[1.75rem] bg-white/80 p-5">
              <p className="text-sm font-semibold text-[var(--ink)]">Hooks de Consulta Compartidos</p>
              <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
                El mismo hook `useWorkouts` alimenta tanto la web como el móvil.
              </p>
            </div>
            <div className="rounded-[1.75rem] bg-white/80 p-5">
              <p className="text-sm font-semibold text-[var(--ink)]">Autenticación lista para actualizar</p>
              <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
                El almacenamiento de la sesión difiere por plataforma, pero el contrato de autenticación sigue siendo compartido.
              </p>
            </div>
          </div>
        </section>

        <section className="glass-panel rounded-[2.5rem] p-8 md:p-10">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[var(--accent)]">Iniciar sesión</p>
          <h2 className="section-title mt-4 text-4xl font-semibold">Bienvenido de nuevo</h2>
          <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
            Usa una cuenta de backend de la autenticación de FastAPI. El token se almacenará en localStorage en la web.
          </p>

          <form
            className="mt-8 space-y-5"
            onSubmit={(event) => {
              event.preventDefault();

              const formData = new FormData(event.currentTarget);
              const email = getFormValue(formData, "email");
              const password = getFormValue(formData, "password");

              login.mutate(
                { email, password },
                {
                  onSuccess: () => {
                    void navigate(redirectTo, { replace: true });
                  }
                }
              );
            }}
          >
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-[var(--ink)]">Correo electrónico</span>
              <input
                className="w-full rounded-2xl border border-[rgba(19,34,56,0.08)] bg-white px-4 py-3 outline-none transition focus:border-[var(--accent)]"
                name="email"
                placeholder="coach@gymplatform.dev"
                required
                type="email"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-[var(--ink)]">Contraseña</span>
              <input
                className="w-full rounded-2xl border border-[rgba(19,34,56,0.08)] bg-white px-4 py-3 outline-none transition focus:border-[var(--accent)]"
                minLength={8}
                name="password"
                placeholder="********"
                required
                type="password"
              />
            </label>

            {login.error ? (
              <div className="rounded-2xl border border-[rgba(255,122,89,0.2)] bg-[var(--accent-soft)] px-4 py-3 text-sm text-[var(--accent)]">
                {isApiResponseError(login.error)
                  ? "Error al iniciar sesión. Verifica tus credenciales contra el backend de FastAPI."
                  : login.error.message}
              </div>
            ) : null}

            <button
              className="w-full rounded-full bg-[var(--ink)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#1f3453] disabled:cursor-not-allowed disabled:opacity-60"
              disabled={login.isPending}
              type="submit"
            >
              {login.isPending ? "Iniciando sesión..." : "Iniciar sesión"}
            </button>
          </form>

          <p className="mt-5 text-sm text-[var(--muted)]">
            ¿Necesitas una cuenta?{" "}
            <Link className="font-semibold text-[var(--accent)]" to="/register">
              Crea una
            </Link>
          </p>
        </section>
      </div>
    </div>
  );
}
