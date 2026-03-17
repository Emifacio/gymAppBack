import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/hooks/use-auth";
import { useUpdateMember } from "@/hooks/use-workouts";
import type { Profile, PartialProfileUpdate } from "@/types/gym";

export function ProfilePage() {
  const { session } = useAuth();
  const updateMember = useUpdateMember();
  const member = session?.member as Profile | undefined;

  const [formData, setFormData] = useState<Pick<Profile, "full_name" | "email" | "phone">>(() => ({
    full_name: member?.full_name ?? "",
    email: member?.email ?? "",
    phone: member?.phone ?? ""
  }));

  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  if (!member) return null;

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage(null);

    if (!member) {
      setMessage({ type: "error", text: "No se encontró el miembro." });
      return;
    }

    const payload = {
      full_name: formData.full_name,
      phone: formData.phone || null
    } satisfies PartialProfileUpdate;

    try {
      await updateMember.mutateAsync({
        memberId: member.id,
        payload
      });
      setMessage({ type: "success", text: "Perfil actualizado exitosamente." });
    } catch (err) {
      console.error(err);
      setMessage({ type: "error", text: "Error al actualizar el perfil." });
    }
  };

  const handleResetOnboarding = () => {
    setMessage(null);
    const storageKey = `onboarding_completed:${member?.id}`;

    try {
      if (storageKey) {
        window.localStorage.removeItem(storageKey);
      }
      window.localStorage.removeItem("onboarding_completed");
    } catch {
      // ignore
    }

    setMessage({ type: "success", text: "Onboarding reiniciado. Vuelve al Dashboard para verlo." });
  };

  return (
    <div className="space-y-[var(--section-gap)]">
      <header>
        <h1 className="section-title text-[var(--font-size-4xl)]">Mi Perfil</h1>
        <p className="mt-2 text-sm font-medium text-[var(--ink-500)] lg:text-base">
          Administra tu información personal y de contacto.
        </p>
      </header>

      <div className="apple-card max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-[var(--ink-500)]">Nombre Completo</label>
              <input
                className="w-full rounded-xl border border-[var(--surface-outline)] bg-white px-4 py-3 text-sm font-medium outline-none focus:border-[var(--primary)]"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-[var(--ink-500)]">Correo Electrónico</label>
              <input
                className="w-full rounded-xl border border-[var(--surface-outline)] bg-[var(--ink-50)] px-4 py-3 text-sm font-medium outline-none cursor-not-allowed"
                value={formData.email}
                disabled
              />
              <p className="text-[10px] text-[var(--ink-400)] italic">El correo no puede ser modificado por seguridad.</p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-[var(--ink-500)]">Teléfono</label>
              <input
                className="w-full rounded-xl border border-[var(--surface-outline)] bg-white px-4 py-3 text-sm font-medium outline-none focus:border-[var(--primary)]"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
          </div>

          {message ? (
            <div className={`p-4 rounded-xl text-sm font-medium ${
              message.type === "success" ? "bg-green-50 text-green-700 border border-green-100" : "bg-red-50 text-red-700 border border-red-100"
            }`}>
              {message.text}
            </div>
          ) : null}

          <Button
            type="submit"
            variant="primary"
            className="w-full h-12"
            loading={updateMember.isPending}
          >
            Guardar Cambios
          </Button>
        </form>
      </div>

      <div className="apple-card max-w-2xl">
        <h2 className="section-title text-[var(--font-size-xl)]">Onboarding</h2>
        <p className="mt-2 text-sm font-medium text-[var(--ink-500)]">
          Si acabas de desplegar o necesitas probar el tour, puedes reiniciarlo aquí.
        </p>
        <div className="mt-5">
          <Button
            type="button"
            variant="secondary"
            className="w-full h-12"
            onClick={handleResetOnboarding}
            loading={updateMember.isPending}
          >
            Reiniciar tour de bienvenida
          </Button>
        </div>
      </div>
    </div>
  );
}
