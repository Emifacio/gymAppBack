import { type FormEvent, useState, useRef } from "react";
import { Camera, Trash2 } from "lucide-react";

import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/hooks/use-auth";
import { useUpdateMember } from "@/hooks/use-workouts";
import { getAvatarData } from "@/lib/avatar";
import { resetTour } from "@/features/onboarding/onboarding.store";
import type { Profile, PartialProfileUpdate } from "@/types/gym";

export function ProfilePage() {
  const { session } = useAuth();
  const updateMember = useUpdateMember();
  const member = session?.member as Profile | undefined;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const avatarData = getAvatarData(member);

  const [formData, setFormData] = useState<Pick<Profile, "full_name" | "email" | "phone">>(() => ({
    full_name: member?.full_name ?? "",
    email: member?.email ?? "",
    phone: member?.phone ?? ""
  }));

  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [avatarMessage, setAvatarMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

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

    try {
      resetTour(member?.id);
    } catch {
      // ignore localStorage failures
    }

    setMessage({ type: "success", text: "Onboarding reiniciado. Vuelve al Dashboard para verlo." });
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setAvatarMessage({ type: "error", text: "Por favor selecciona una imagen." });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setAvatarMessage({ type: "error", text: "La imagen debe ser menor a 5MB." });
      return;
    }

    setAvatarMessage(null);

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        
        await updateMember.mutateAsync({
          memberId: member.id,
          payload: { profile_image_url: base64 }
        });
        
        setAvatarMessage({ type: "success", text: "Foto de perfil actualizada." });
      };
      reader.onerror = () => {
        setAvatarMessage({ type: "error", text: "Error al procesar la imagen." });
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error(err);
      setAvatarMessage({ type: "error", text: "Error al subir la imagen." });
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemoveAvatar = async () => {
    setAvatarMessage(null);

    try {
      await updateMember.mutateAsync({
        memberId: member.id,
        payload: { profile_image_url: null }
      });
      setAvatarMessage({ type: "success", text: "Foto de perfil eliminada." });
    } catch (err) {
      console.error(err);
      setAvatarMessage({ type: "error", text: "Error al eliminar la foto." });
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
        <h2 className="section-title text-[var(--font-size-xl)]">Foto de Perfil</h2>
        <div className="mt-4 flex items-center gap-6">
          <Avatar member={member} size="xl" />
          <div className="space-y-2">
            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={updateMember.isPending}
              >
                <Camera className="h-4 w-4 mr-1" />
                Subir foto
              </Button>
              {avatarData.hasCustomImage && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleRemoveAvatar}
                  disabled={updateMember.isPending}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Eliminar
                </Button>
              )}
            </div>
            {avatarMessage ? (
              <p className={`text-xs ${avatarMessage.type === "success" ? "text-green-600" : "text-red-600"}`}>
                {avatarMessage.text}
              </p>
            ) : (
              <p className="text-xs text-[var(--ink-400)]">
                {avatarData.hasGoogleImage
                  ? avatarData.hasCustomImage
                    ? "Usando foto personalizada. Google foto disponible como respaldo."
                    : "Usando foto de Google."
                  : "Sin foto. Subí una imagen JPG o PNG (máx. 5MB)."}
              </p>
            )}
          </div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleAvatarUpload}
        />
      </div>

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
                value={formData.phone ?? ""}
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
