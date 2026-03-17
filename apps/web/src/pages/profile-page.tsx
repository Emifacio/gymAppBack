import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/hooks/use-auth";
import { useUpdateMember } from "@/hooks/use-workouts";

export function ProfilePage() {
  const { session } = useAuth();
  const updateMember = useUpdateMember();
  const member = session?.member;

  const [formData, setFormData] = useState({
    full_name: member?.full_name || "",
    email: member?.email || "",
    phone: member?.phone || "",
  });

  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  if (!member) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    try {
      await updateMember.mutateAsync({
        member_id: member.id,
        payload: formData
      } as any);
      setMessage({ type: "success", text: "Perfil actualizado exitosamente." });
    } catch (err) {
      console.error(err);
      setMessage({ type: "error", text: "Error al actualizar el perfil." });
    }
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

          {message && (
            <div className={`p-4 rounded-xl text-sm font-medium ${
              message.type === "success" ? "bg-green-50 text-green-700 border border-green-100" : "bg-red-50 text-red-700 border border-red-100"
            }`}>
              {message.text}
            </div>
          )}

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
    </div>
  );
}
