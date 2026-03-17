import { Link, Navigate, useNavigate } from "react-router-dom";

import { isApiResponseError } from "@gym/api-client";

import { Button } from "@/components/ui/Button";
import { GoogleButton } from "@/components/ui/GoogleButton";
import { useAuth } from "@/hooks/use-auth";
import { useRegisterMutation } from "@/hooks/use-workouts";
import { getFormValue } from "@/lib/forms";
import { useState, useEffect } from "react";

export function RegisterPage() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const register = useRegisterMutation();
  
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);

  useEffect(() => {
    if (email === "") {
      setEmailError(null);
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setEmailError("El formato del correo electrónico no es válido");
    } else {
      setEmailError(null);
    }
  }, [email]);

  if (session) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <section className="glass-panel w-full max-w-2xl rounded-[2.5rem] p-8 md:p-10">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[var(--accent)]">Registro</p>
        <h1 className="section-title mt-4 text-4xl font-semibold">Crear una nueva cuenta de miembro</h1>
        <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
          El primer usuario registrado se convierte en administrador en el backend, por lo que esta pantalla también es útil para
          configurar entornos locales.
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
            <span className="mb-2 block text-sm font-medium">Nombre completo</span>
            <input
              className="w-full rounded-2xl border border-[rgba(19,34,56,0.08)] bg-white px-4 py-3 outline-none transition focus:border-[var(--accent)]"
              minLength={2}
              name="full_name"
              required
              type="text"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium">Correo electrónico</span>
            <input
              className={`w-full rounded-2xl border bg-white px-4 py-3 outline-none transition focus:border-[var(--accent)] ${
                emailError ? "border-red-400" : "border-[rgba(19,34,56,0.08)]"
              }`}
              name="email"
              onChange={(e) => setEmail(e.target.value)}
              required
              type="email"
              value={email}
            />
            {emailError ? (
              <span className="mt-1 block text-xs font-medium text-red-500 animate-in fade-in slide-in-from-top-1">
                {emailError}
              </span>
            ) : email && !emailError ? (
              <span className="mt-1 block text-xs font-medium text-green-500 animate-in fade-in slide-in-from-top-1">
                Formato válido
              </span>
            ) : null}
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium">Teléfono</span>
            <input
              className="w-full rounded-2xl border border-[rgba(19,34,56,0.08)] bg-white px-4 py-3 outline-none transition focus:border-[var(--accent)]"
              name="phone"
              type="tel"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium">Contraseña</span>
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
                ? "Error al registrarse. Verifica las reglas de validación del backend o si el correo ya existe."
                : register.error.message}
            </div>
          ) : null}

          <div className="md:col-span-2">
            <Button className="w-full" disabled={register.isPending || !!emailError} loading={register.isPending} type="submit" variant="primary">
              {register.isPending ? "Creando cuenta..." : "Crear cuenta"}
            </Button>
          </div>

          <div className="relative my-2 md:col-span-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[rgba(19,34,56,0.08)]"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-[#f8fafd] px-4 text-[var(--muted)] font-medium tracking-widest">O</span>
            </div>
          </div>

          <div className="md:col-span-2">
            <GoogleButton onClick={() => alert("Próximamente: Integración con Google")} />
          </div>
        </form>

        <p className="mt-5 text-sm text-[var(--muted)]">
          ¿Ya tienes una cuenta?{" "}
          <Link className="font-semibold text-[var(--accent)]" to="/login">
            Volver al inicio de sesión
          </Link>
        </p>
      </section>
    </div>
  );
}
