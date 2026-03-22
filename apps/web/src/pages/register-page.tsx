import { Link, Navigate, useNavigate } from "react-router-dom";
import { useCallback, useMemo, useState } from "react";

import { isApiResponseError } from "@gym/api-client";

import { Button } from "@/components/ui/Button";
import { GoogleSignIn } from "@/components/ui/GoogleSignIn";
import { useAuth } from "@/hooks/use-auth";
import { useGoogleLoginMutation, useRegisterMutation } from "@/hooks/use-workouts";
import { getFormValue } from "@/lib/forms";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

export function RegisterPage() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const register = useRegisterMutation();
  const googleLogin = useGoogleLoginMutation();

  const [email, setEmail] = useState("");
  const [googleError, setGoogleError] = useState<string | null>(null);
  const clientId = (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined) ?? "";

  const emailError = useMemo(() => {
    if (email === "") {
      return null;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) ? null : "El formato del correo electrónico no es válido";
  }, [email]);

  const handleGoogleSuccess = useCallback(
    (credential: string) => {
      setGoogleError(null);

      googleLogin.mutate(
        { id_token: credential },
        {
          onSuccess: () => {
            void navigate("/", { replace: true });
          },
          onError: (err: Error) => {
            if (isApiResponseError(err)) {
              setGoogleError("Error al registrarse con Google. Verifique su cuenta e intente nuevamente.");
            } else {
              setGoogleError(err.message ?? "Error al registrarse con Google.");
            }
          },
        }
      );
    },
    [googleLogin, navigate]
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

      <section className="glass-panel w-full max-w-2xl rounded-[2.5rem] p-8 md:p-10 bg-[var(--bg-surface)] border border-[var(--border-base)] shadow-xl">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[var(--accent)]">Registro</p>
        <h1 className="section-title mt-4 text-4xl font-semibold text-[var(--text-primary)]">Crear una nueva cuenta</h1>
        <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
          Inscripcción rápida para comenzar a entrenar.
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
            <span className="mb-2 block text-sm font-medium text-[var(--text-primary)]">Nombre completo</span>
            <input
              className="w-full rounded-2xl border border-[var(--border-base)] bg-[var(--bg-surface-secondary)] text-[var(--text-primary)] px-4 py-3 outline-none transition focus:border-[var(--accent)]"
              minLength={2}
              name="full_name"
              required
              type="text"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-[var(--text-primary)]">Correo electrónico</span>
            <input
              className={`w-full rounded-2xl border bg-[var(--bg-surface-secondary)] text-[var(--text-primary)] px-4 py-3 outline-none transition focus:border-[var(--accent)] ${
                emailError ? "border-[var(--danger)]" : "border-[var(--border-base)]"
              }`}
              name="email"
              onChange={(e) => setEmail(e.target.value)}
              placeholder="hoyentreno@gym.ok"
              required
              type="email"
              value={email}
            />
            {emailError ? (
              <span className="mt-1 block text-xs font-medium text-[var(--danger)] animate-in fade-in slide-in-from-top-1">
                {emailError}
              </span>
            ) : email && !emailError ? (
              <span className="mt-1 block text-xs font-medium text-[var(--success)] animate-in fade-in slide-in-from-top-1">
                Formato válido
              </span>
            ) : null}
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-[var(--text-primary)]">Teléfono</span>
            <input
              className="w-full rounded-2xl border border-[var(--border-base)] bg-[var(--bg-surface-secondary)] text-[var(--text-primary)] px-4 py-3 outline-none transition focus:border-[var(--accent)]"
              name="phone"
              type="tel"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-[var(--text-primary)]">Contraseña</span>
            <input
              className="w-full rounded-2xl border border-[var(--border-base)] bg-[var(--bg-surface-secondary)] text-[var(--text-primary)] px-4 py-3 outline-none transition focus:border-[var(--accent)]"
              minLength={8}
              name="password"
              required
              type="password"
            />
          </label>

          {register.error ? (
            <div className="rounded-2xl border border-[var(--danger-soft)] bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger)] md:col-span-2">
              {isApiResponseError(register.error)
                ? "Error al registrarse. Verifica las reglas de validación del backend o si el correo ya existe."
                : register.error.message}
            </div>
          ) : null}

          {googleError ? (
            <div className="rounded-2xl border border-[var(--danger-soft)] bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger)] md:col-span-2">
              {googleError}
            </div>
          ) : null}

          <div className="md:col-span-2">
            <Button className="w-full" disabled={register.isPending || !!emailError} loading={register.isPending} type="submit" variant="primary">
              {register.isPending ? "Creando cuenta..." : "Crear cuenta"}
            </Button>
          </div>

          <div className="relative my-2 md:col-span-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[var(--border-base)]"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-[var(--bg-surface)] px-4 text-[var(--text-muted)] font-medium tracking-widest">O</span>
            </div>
          </div>

          <div className="md:col-span-2">
            <GoogleSignIn
              clientId={clientId}
              onSuccess={handleGoogleSuccess}
              onError={handleGoogleError}
              disabled={googleLogin.isPending}
            />
          </div>
        </form>

        <p className="mt-5 text-sm text-[var(--text-secondary)]">
          ¿Ya tienes una cuenta?{" "}
          <Link className="font-semibold text-[var(--accent)]" to="/login">
            Volver al inicio de sesión
          </Link>
        </p>
      </section>
    </div>
  );
}
