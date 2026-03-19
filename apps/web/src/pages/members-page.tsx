import { useState, type FormEvent } from "react";
import { Link, Navigate } from "react-router-dom";

import { Button } from "@/components/ui/Button";
import { InlineFeedback } from "@/components/ui/InlineFeedback";
import { SkeletonMemberRow } from "@/components/ui/skeletons";
import { useAuth } from "@/hooks/use-auth";
import { useCreateMember, useMembers } from "@/hooks/use-workouts";
import { canManageOperations } from "@/lib/roles";
import { useTransientState } from "@/hooks/useTransientState";

type MemberRole = "member" | "instructor" | "admin";
type MembershipStatus = "active" | "inactive" | "cancelled";

export function MembersPage() {
  const { session } = useAuth();
  const [filters, setFilters] = useState({
    role: "" as "" | MemberRole,
    membership_status: "" as "" | MembershipStatus,
    offset: 0,
    limit: 24
  });
  const membersQuery = useMembers({
    role: filters.role || null,
    membership_status: filters.membership_status || null,
    offset: filters.offset,
    limit: filters.limit
  });
  const createMember = useCreateMember();
  const feedback = useTransientState({ duration: 3000 });
  const [directoryHighlight, setDirectoryHighlight] = useState(false);
  const [formState, setFormState] = useState({
    email: "",
    password: "",
    full_name: "",
    phone: "",
    birth_date: "",
    emergency_contact: "",
    notes: "",
    role: "member" as MemberRole,
    membership_status: "active" as MembershipStatus,
    is_active: true,
    membership_plan_id: "",
    instructor_bio: "",
    instructor_specialties: ""
  });

  if (!session || !canManageOperations(session.member)) {
    return <Navigate to="/dashboard" replace />;
  }

  const members = membersQuery.data ?? [];

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    feedback.triggerLoading();

    try {
      await createMember.mutateAsync({
        email: formState.email,
        password: formState.password,
        full_name: formState.full_name,
        phone: formState.phone || null,
        birth_date: formState.birth_date || null,
        emergency_contact: formState.emergency_contact || null,
        notes: formState.notes || null,
        role: formState.role,
        membership_status: formState.membership_status,
        is_active: formState.is_active,
        membership_plan_id: formState.membership_plan_id || null,
        instructor_bio: formState.instructor_bio || null,
        instructor_specialties: formState.instructor_specialties || null
      });

      setFormState({
        email: "",
        password: "",
        full_name: "",
        phone: "",
        birth_date: "",
        emergency_contact: "",
        notes: "",
        role: "member",
        membership_status: "active",
        is_active: true,
        membership_plan_id: "",
        instructor_bio: "",
        instructor_specialties: ""
      });

      setDirectoryHighlight(true);
      setTimeout(() => setDirectoryHighlight(false), 800);
      feedback.triggerSuccess("Miembro creado correctamente.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo crear el miembro.";
      feedback.triggerError(message);
    }
  }

  return (
    <div className="space-y-[var(--section-gap)]">
      <header>
        <h1 className="section-title text-[var(--font-size-4xl)]">Miembros</h1>
        <p className="mt-2 text-sm font-medium text-[var(--ink-500)] lg:text-base">
          Gestiona tu comunidad de atletas, personal de instructores y cuentas administrativas.
        </p>
      </header>

      <div className="grid gap-[var(--section-gap)] lg:grid-cols-[1.2fr_0.8fr]">
        <section className="apple-card">
          <div>
            <h2 className="section-title text-[var(--font-size-xl)] text-[var(--ink-900)]">Directorio</h2>
            <p className="mt-1 text-sm font-medium text-[var(--ink-500)]">
              Seguimiento de miembros en tiempo real y resumen de estado.
            </p>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--ink-500)]">Role</span>
              <select
                value={filters.role}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    role: event.target.value as "" | MemberRole
                  }))
                }
                className="w-full rounded-xl border border-[var(--surface-outline)] bg-[var(--bg-main)] px-4 py-3 text-sm font-medium outline-none transition focus:border-[var(--primary)]"
              >
                <option value="">Todos los roles</option>
                <option value="member">Miembro</option>
                <option value="instructor">Instructor</option>
                <option value="admin">Administrador</option>
              </select>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--ink-500)]">Estado</span>
              <select
                value={filters.membership_status}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    membership_status: event.target.value as "" | MembershipStatus
                  }))
                }
                className="w-full rounded-xl border border-[var(--surface-outline)] bg-[var(--bg-main)] px-4 py-3 text-sm font-medium outline-none transition focus:border-[var(--primary)]"
              >
                <option value="">Todos los estados</option>
                <option value="active">Activo</option>
                <option value="inactive">Inactivo</option>
                <option value="cancelled">Cancelado</option>
              </select>
            </div>
          </div>

          <div className={`mt-8 space-y-3 rounded-2xl p-2 -m-2 transition-all duration-500 ${directoryHighlight ? "ring-2 ring-emerald-400/50 bg-emerald-50/30" : ""}`}>
            {membersQuery.isLoading ? (
              <>
                <SkeletonMemberRow />
                <SkeletonMemberRow />
                <SkeletonMemberRow />
                <SkeletonMemberRow />
              </>
            ) : members.length > 0 ? (
              members.map((member) => (
                <Link
                  key={member.id}
                  to={`/members/${member.id}`}
                  className="flex items-center justify-between p-4 rounded-xl border border-[var(--surface-outline)] hover:bg-[var(--ink-100)] transition-colors group"
                >
                  <div>
                    <p className="text-base font-bold text-[var(--ink-900)]">{member.full_name}</p>
                    <p className="text-sm font-medium text-[var(--ink-500)]">{member.email}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="rounded-lg bg-[var(--bg-main)] px-3 py-1 text-xs font-bold uppercase tracking-wider text-[var(--ink-700)]">
                      {member.role}
                    </span>
                    <span className="h-2 w-2 rounded-full bg-green-500" />
                  </div>
                </Link>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-[var(--ink-300)] px-4 py-10 text-center text-sm font-medium text-[var(--ink-500)]">
                No se encontraron miembros que coincidan con estos filtros.
              </div>
            )}
          </div>
        </section>

        <section className="apple-card p-8">
          <div>
            <h2 className="text-xl font-bold text-[var(--ink-900)]">Nuevo Perfil</h2>
            <p className="mt-1 text-sm font-medium text-[var(--ink-500)]">
              Crea una nueva cuenta para un miembro, instructor o administrador.
            </p>
          </div>

          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--ink-500)]">Nombre completo</span>
              <input
                required
                value={formState.full_name}
                onChange={(event) =>
                  setFormState((current) => ({ ...current, full_name: event.target.value }))
                }
                className="w-full rounded-xl border border-[var(--surface-outline)] bg-[var(--bg-main)] px-4 py-3 text-sm font-medium outline-none transition focus:border-[var(--primary)]"
              />
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--ink-500)]">Correo electrónico</span>
                <input
                  required
                  type="email"
                  value={formState.email}
                  onChange={(event) =>
                    setFormState((current) => ({ ...current, email: event.target.value }))
                  }
                  className="w-full rounded-xl border border-[var(--surface-outline)] bg-[var(--bg-main)] px-4 py-3 text-sm font-medium outline-none transition focus:border-[var(--primary)]"
                />
              </div>

              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--ink-500)]">Contraseña</span>
                <input
                  required
                  minLength={8}
                  type="password"
                  value={formState.password}
                  onChange={(event) =>
                    setFormState((current) => ({ ...current, password: event.target.value }))
                  }
                  className="w-full rounded-xl border border-[var(--surface-outline)] bg-[var(--bg-main)] px-4 py-3 text-sm font-medium outline-none transition focus:border-[var(--primary)]"
                />
              </div>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--ink-500)]">Rol</span>
                <select
                  value={formState.role}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      role: event.target.value as MemberRole
                    }))
                  }
                  className="w-full rounded-xl border border-[var(--surface-outline)] bg-[var(--bg-main)] px-4 py-3 text-sm font-medium outline-none transition focus:border-[var(--primary)]"
                >
                  <option value="member">Miembro</option>
                  <option value="instructor">Instructor</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>

              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--ink-500)]">Estado de membresía</span>
                <select
                  value={formState.membership_status}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      membership_status: event.target.value as MembershipStatus
                    }))
                  }
                  className="w-full rounded-xl border border-[var(--surface-outline)] bg-[var(--bg-main)] px-4 py-3 text-sm font-medium outline-none transition focus:border-[var(--primary)]"
                >
                  <option value="active">Activo</option>
                  <option value="inactive">Inactivo</option>
                  <option value="cancelled">Cancelado</option>
                </select>
              </div>
            </div>

            {(feedback.isSuccess || feedback.isError) ? (
              <InlineFeedback
                message={feedback.message}
                type={feedback.isSuccess ? "success" : "error"}
              />
            ) : null}

            <Button
              className="w-full h-12"
              disabled={feedback.isLoading}
              loading={feedback.isLoading}
              success={feedback.isSuccess}
              type="submit"
              variant="primary"
            >
              {feedback.isLoading ? "Creando cuenta..." : feedback.isSuccess ? "Creado" : "Crear miembro"}
            </Button>
          </form>
        </section>
      </div>
    </div>
  );
}
