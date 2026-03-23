import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useCallback, useState } from "react";

import { Button } from "@/components/ui/Button";
import { isApiResponseError } from "@gym/api-client";

import { useAuth } from "@/hooks/use-auth";
import { useLoginMutation, useGoogleLoginMutation } from "@/hooks/use-workouts";
import { getFormValue } from "@/lib/forms";
import { GoogleSignIn } from "@/components/ui/GoogleSignIn";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { session } = useAuth();
  const login = useLoginMutation();
  const googleLogin = useGoogleLoginMutation();

  const [googleError, setGoogleError] = useState<string | null>(null);
  const clientId = (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined) ?? "";

  const redirectTo =
    (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? "/";

  const handleGoogleSuccess = useCallback(
    (credential: string) => {
      setGoogleError(null);

      googleLogin.mutate(
        { id_token: credential },
        {
          onSuccess: () => {
            void navigate(redirectTo, { replace: true });
          },
          onError: (err: Error) => {
            if (isApiResponseError(err)) {
              setGoogleError(
                "Error al iniciar sesión con Google. Verifique su cuenta e intente nuevamente."
              );
            } else {
              setGoogleError(err.message ?? "Error al iniciar sesión con Google.");
            }
          }
        }
      );
    },
    [googleLogin, navigate, redirectTo]
  );

  const handleGoogleError = useCallback((message: string) => {
    setGoogleError(message);
  }, []);

  if (session) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12 transition-colors duration-300">
      <div className="fixed top-6 right-6 z-50">
        <ThemeToggle />
      </div>

      <div className="grid w-full max-w-6xl gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="hidden rounded-[2.5rem] p-10 lg:flex flex-col justify-center bg-[#132238] shadow-2xl transition-all duration-700 animate-in fade-in slide-in-from-left-8">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[var(--accent)]">
            atlhyt
          </p>
          <h1 className="mt-6 text-5xl font-semibold leading-tight text-white">
            Gestioná tu entrenamiento de forma inteligente
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-white/70">
            Reservá clases, administrá tus créditos y seguí tu progreso en un solo lugar.
          </p>
        </section>

        <section className="glass-panel rounded-[2.5rem] p-8 md:p-10 flex flex-col justify-center bg-[var(--bg-surface)] border border-[var(--border-base)] shadow-xl relative overflow-hidden">
          {/* Mobile/Global Brand Header */}
          <div className="mb-8 flex justify-center lg:justify-start">
            <h1 className="text-4xl font-black tracking-tighter text-[var(--text-primary)]">
              ATLH<span className="text-[var(--accent)]">YT</span>
            </h1>
          </div>

          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[var(--accent)]">
            Iniciar sesión
          </p>
          <h2 className="section-title mt-4 text-4xl font-semibold text-[var(--text-primary)]">
            Bienvenido de nuevo
          </h2>
          <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
            Iniciá sesión para acceder a tu perfil y clases.
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
              <span className="mb-2 block text-sm font-medium text-[var(--text-primary)]">
                Correo electrónico
              </span>
              <input
                className="w-full rounded-2xl border border-[var(--border-base)] bg-[var(--bg-surface-secondary)] text-[var(--text-primary)] px-4 py-3 outline-none transition focus:border-[var(--accent)]"
                name="email"
                placeholder="hoyentreno@gym.ok"
                required
                type="email"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-[var(--text-primary)]">
                Contraseña
              </span>
              <input
                className="w-full rounded-2xl border border-[var(--border-base)] bg-[var(--bg-surface-secondary)] text-[var(--text-primary)] px-4 py-3 outline-none transition focus:border-[var(--accent)]"
                minLength={8}
                name="password"
                placeholder="********"
                required
                type="password"
              />
            </label>

            {login.error ? (
              <div className="rounded-2xl border border-[var(--danger-soft)] bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger)]">
                {isApiResponseError(login.error)
                  ? "Error al iniciar sesión. Por favor, verifica tus credenciales."
                  : login.error.message}
              </div>
            ) : null}

            {googleError ? (
              <div className="rounded-2xl border border-[var(--danger-soft)] bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger)]">
                {googleError}
              </div>
            ) : null}

            <Button
              className="h-13 w-full rounded-2xl text-[15px] shadow-lg shadow-[var(--accent-soft)]"
              loading={login.isPending}
              type="submit"
              variant="primary"
            >
              {login.isPending ? "Iniciando sesión..." : "Iniciar sesión"}
            </Button>

            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[var(--border-base)]"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-[var(--bg-surface)] px-4 text-[var(--text-muted)] font-medium tracking-widest">
                  O
                </span>
              </div>
            </div>

            <GoogleSignIn
              clientId={clientId}
              onSuccess={handleGoogleSuccess}
              onError={handleGoogleError}
              disabled={googleLogin.isPending}
            />
          </form>

          <p className="mt-5 text-sm text-[var(--text-secondary)]">
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
