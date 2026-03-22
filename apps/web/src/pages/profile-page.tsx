import { type FormEvent, useState, useRef } from "react";
import { Camera, Trash2, User, Mail, Phone, Rocket, ShieldCheck } from "lucide-react";

import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/hooks/use-auth";
import { useUpdateMember, useUploadAvatar } from "@/hooks/use-workouts";
import { getAvatarData } from "@/lib/avatar";
import { resetTour } from "@/features/onboarding/onboarding.store";
import { getApiErrorMessage } from "@/api/client";
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
      setMessage({ type: "error", text: getApiErrorMessage(err) });
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

  const uploadAvatar = useUploadAvatar();
  const [localPreview, setLocalPreview] = useState<string | null>(null);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 1. Validation
    if (!file.type.startsWith("image/")) {
      setAvatarMessage({ type: "error", text: "Por favor selecciona una imagen (PNG, JPG o WebP)." });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setAvatarMessage({ type: "error", text: "La imagen debe ser menor a 5MB." });
      return;
    }

    setAvatarMessage(null);

    // 2. Local Preview
    const previewUrl = URL.createObjectURL(file);
    setLocalPreview(previewUrl);

    try {
      // 3. Upload File
      const { url: uploadedUrl } = await uploadAvatar.mutateAsync(file);
      
      // 4. Update Profile with returned URL
      await updateMember.mutateAsync({
        memberId: member.id,
        payload: { profile_image_url: uploadedUrl }
      });
      
      setAvatarMessage({ type: "success", text: "Foto de perfil actualizada exitosamente." });
      setLocalPreview(null); // Clear preview once saved
    } catch (err) {
      console.error(err);
      setAvatarMessage({ type: "error", text: getApiErrorMessage(err) || "Error al subir la imagen." });
      setLocalPreview(null);
    } finally {
      URL.revokeObjectURL(previewUrl);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
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
    <div className="max-w-4xl mx-auto space-y-[var(--section-gap)] transition-colors duration-300">
      <header className="flex flex-col gap-6 sm:flex-row sm:items-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--accent)] text-white shadow-lg shadow-[var(--accent-soft)]">
          <User className="h-8 w-8" />
        </div>
        <div>
          <h1 className="section-title text-[var(--font-size-2xl)] text-[var(--text-primary)] leading-tight">Ajustes de Cuenta</h1>
          <p className="mt-1 text-sm font-medium text-[var(--text-secondary)] lg:text-base opacity-80">
            Personaliza tu identidad en la plataforma y mantén tus datos al día.
          </p>
        </div>
      </header>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Profile Card Sidebar */}
        <div className="lg:col-span-1 space-y-8">
          <div className="apple-card p-8 shadow-xl text-center flex flex-col items-center">
            <div className="relative group">
              <Avatar 
                member={localPreview ? { ...member, profile_image_url: localPreview } : member} 
                size="xl" 
                className="shadow-2xl border-4 border-[var(--bg-surface)] ring-1 ring-[var(--border-base)]" 
              />
              {(uploadAvatar.isPending || updateMember.isPending) && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-full animate-pulse">
                  <Rocket className="h-8 w-8 text-white animate-bounce" />
                </div>
              )}
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 p-2.5 bg-[var(--accent)] text-white rounded-xl shadow-lg hover:scale-110 active:scale-95 transition-transform border-4 border-[var(--bg-surface)]"
              >
                <Camera className="h-4 w-4" />
              </button>
            </div>
            
            <h2 className="mt-6 text-xl font-bold text-[var(--text-primary)] tracking-tight">{member.full_name}</h2>
            <p className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)] mt-1">{member.role || "Miembro"}</p>
            
            <div className="w-full mt-8 pt-6 border-t border-[var(--border-base)] flex flex-col gap-3">
              {avatarData.hasCustomImage && (
                <button
                  onClick={handleRemoveAvatar}
                  disabled={updateMember.isPending}
                  className="w-full py-2.5 text-xs font-bold text-[var(--danger)] bg-[var(--danger-soft)] rounded-xl hover:opacity-80 transition-all flex items-center justify-center gap-2"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Eliminar Foto
                </button>
              )}
              {avatarData.hasGoogleImage && !avatarData.hasCustomImage && (
                 <p className="text-[10px] text-[var(--text-muted)] italic">Sincronizado con Google</p>
              )}
            </div>
            
            {avatarMessage && (
              <p className={`mt-4 text-[10px] font-bold p-2 px-4 rounded-lg bg-[var(--bg-surface-secondary)] border ${
                avatarMessage.type === "success" ? "text-[var(--success)] border-[var(--success-soft)]" : "text-[var(--danger)] border-[var(--danger-soft)]"
              }`}>
                {avatarMessage.text}
              </p>
            )}
          </div>

          <div className="apple-card p-6 shadow-md border-l-4 border-l-[var(--accent)]">
            <div className="flex items-center gap-3 mb-4">
              <Rocket className="h-5 w-5 text-[var(--accent)]" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--text-primary)]">Guía Rápida</h3>
            </div>
            <p className="text-xs font-medium text-[var(--text-secondary)] leading-relaxed">
              ¿Perdido? Puedes reiniciar el tutorial interactivo para recordar cómo navegar las secciones principales.
            </p>
            <Button
              variant="secondary"
              className="w-full h-10 mt-6 text-xs font-bold"
              onClick={handleResetOnboarding}
            >
              Reiniciar Tour
            </Button>
          </div>
        </div>

        {/* Form Area */}
        <div className="lg:col-span-2 space-y-8">
          <div className="apple-card p-8 lg:p-10 shadow-xl">
            <div className="flex items-center gap-4 mb-8">
              <ShieldCheck className="h-6 w-6 text-[var(--success)]" />
              <h3 className="section-title text-[var(--font-size-xl)] text-[var(--text-primary)]">Información Pública</h3>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] px-1">
                    <User className="h-3 w-3" />
                    Nombre Completo
                  </label>
                  <input
                    className="w-full rounded-2xl border border-transparent bg-[var(--bg-surface-secondary)] text-[var(--text-primary)] px-5 py-4 text-sm font-bold outline-none transition focus:bg-[var(--bg-surface)] focus:border-[var(--accent)] shadow-sm focus:shadow-md"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] px-1">
                    <Phone className="h-3 w-3" />
                    Teléfono Movil
                  </label>
                  <input
                    className="w-full rounded-2xl border border-transparent bg-[var(--bg-surface-secondary)] text-[var(--text-primary)] px-5 py-4 text-sm font-bold outline-none transition focus:bg-[var(--bg-surface)] focus:border-[var(--accent)] shadow-sm focus:shadow-md"
                    placeholder="+54 11..."
                    value={formData.phone ?? ""}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] px-1">
                  <Mail className="h-3 w-3" />
                  Email (Principal)
                </label>
                <div className="relative group">
                  <input
                    className="w-full rounded-2xl border border-transparent bg-[var(--bg-surface-secondary)] text-[var(--text-muted)] px-5 py-4 text-sm font-bold outline-none cursor-not-allowed opacity-60"
                    value={formData.email}
                    disabled
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 bg-[var(--bg-surface)] px-3 py-1 rounded-lg text-xs font-bold text-[var(--text-muted)] border border-[var(--border-base)] shadow-sm pointer-events-none">
                    Protegido
                  </span>
                </div>
              </div>

              {message && (
                <div className={`p-5 rounded-2xl text-sm font-bold border transition-all animate-in fade-in slide-in-from-top-2 ${
                  message.type === "success" ? "bg-[var(--success-soft)] text-[var(--success)] border-[var(--success-soft)] shadow-sm" : "bg-[var(--danger-soft)] text-[var(--danger)] border-[var(--danger-soft)]"
                }`}>
                  {message.type === "success" ? "✅ " : "⚠️ "} {message.text}
                </div>
              )}

              <Button
                type="submit"
                variant="primary"
                className="w-full h-14 text-base font-bold shadow-lg shadow-[var(--accent-soft)] rounded-2xl transition-all"
                loading={updateMember.isPending}
              >
                Actualizar Perfil
              </Button>
            </form>
          </div>
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
  );
}
