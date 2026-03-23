import { useState, type FormEvent } from "react";
import { Navigate } from "react-router-dom";
import type { Member } from "@gym/api-client";

import { MemberCard } from "@/components/member-card";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Field, FieldLabel } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { InlineFeedback } from "@/components/ui/InlineFeedback";
import { MotionTokens, SuccessTokens } from "@/components/ui/motion-tokens";
import { Select } from "@/components/ui/Select";
import { SkeletonMemberRow } from "@/components/ui/skeletons";
import { useAuth } from "@/hooks/use-auth";
import { useCreateMember, useMembers } from "@/hooks/use-workouts";
import { canManageOperations } from "@/lib/roles";
import { useTransientState } from "@/hooks/useTransientState";

type MemberRole = Member["role"];
type MembershipStatus = Member["membership_status"];

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
  const feedback = useTransientState({ duration: MotionTokens.feedback.errorDuration });
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
      setTimeout(() => setDirectoryHighlight(false), MotionTokens.highlight.containerReset);
      feedback.triggerSuccess("Miembro creado correctamente.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo crear el miembro.";
      feedback.triggerError(message);
    }
  }

  return (
    <div className="space-y-[var(--section-gap)]">
      <header>
        <h1 className="section-title text-[var(--font-size-4xl)] text-[var(--text-primary)]">
          Miembros
        </h1>
        <p className="mt-2 text-sm font-medium text-[var(--text-secondary)] lg:text-base">
          Gestiona tu comunidad de atletas, personal de instructores y cuentas administrativas.
        </p>
      </header>

      <div className="grid gap-[var(--section-gap)] lg:grid-cols-[1.2fr_0.8fr]">
        <Card as="section">
          <CardHeader>
            <CardTitle className="text-[var(--font-size-xl)]">Directorio</CardTitle>
            <CardDescription>
              Seguimiento de miembros en tiempo real y resumen de estado.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-8">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="members-filter-role">Rol</FieldLabel>
                <Select
                  id="members-filter-role"
                  value={filters.role}
                  onChange={(event) =>
                    setFilters((current) => ({
                      ...current,
                      role: event.target.value as "" | MemberRole
                    }))
                  }
                >
                  <option value="">Todos los roles</option>
                  <option value="member">Miembro</option>
                  <option value="instructor">Instructor</option>
                  <option value="admin">Administrador</option>
                </Select>
              </Field>

              <Field>
                <FieldLabel htmlFor="members-filter-status">Estado</FieldLabel>
                <Select
                  id="members-filter-status"
                  value={filters.membership_status}
                  onChange={(event) =>
                    setFilters((current) => ({
                      ...current,
                      membership_status: event.target.value as "" | MembershipStatus
                    }))
                  }
                >
                  <option value="">Todos los estados</option>
                  <option value="active">Activo</option>
                  <option value="inactive">Inactivo</option>
                  <option value="cancelled">Cancelado</option>
                </Select>
              </Field>
            </div>

            <div
              className={`rounded-[2rem] p-2 -m-2 transition-all duration-${MotionTokens.transition.slow} ${directoryHighlight ? `${SuccessTokens.ring.standard} ${SuccessTokens.background.tint}` : ""}`}
            >
              {membersQuery.isLoading ? (
                <div className="grid gap-4 xl:grid-cols-2">
                  <SkeletonMemberRow />
                  <SkeletonMemberRow />
                  <SkeletonMemberRow />
                  <SkeletonMemberRow />
                </div>
              ) : members.length > 0 ? (
                <div className="grid gap-5 xl:grid-cols-2">
                  {members.map((member) => (
                    <MemberCard key={member.id} member={member} />
                  ))}
                </div>
              ) : (
                <div className="rounded-[1.5rem] border border-dashed border-[var(--border-base)] bg-[var(--bg-surface-secondary)] px-5 py-10 text-center">
                  <p className="text-sm font-medium text-[var(--text-secondary)]">
                    No se encontraron miembros que coincidan con estos filtros.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card as="section" className="lg:sticky lg:top-28">
          <CardHeader>
            <CardTitle className="text-[var(--font-size-xl)]">Nuevo Perfil</CardTitle>
            <CardDescription>
              Crea una nueva cuenta para un miembro, instructor o administrador.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form className="space-y-5" onSubmit={handleSubmit}>
              <Field>
                <FieldLabel htmlFor="member-full-name">Nombre completo</FieldLabel>
                <Input
                  id="member-full-name"
                  required
                  value={formState.full_name}
                  onChange={(event) =>
                    setFormState((current) => ({ ...current, full_name: event.target.value }))
                  }
                />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="member-email">Correo electrónico</FieldLabel>
                  <Input
                    id="member-email"
                    required
                    type="email"
                    value={formState.email}
                    onChange={(event) =>
                      setFormState((current) => ({ ...current, email: event.target.value }))
                    }
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="member-password">Contraseña</FieldLabel>
                  <Input
                    id="member-password"
                    required
                    minLength={8}
                    type="password"
                    value={formState.password}
                    onChange={(event) =>
                      setFormState((current) => ({ ...current, password: event.target.value }))
                    }
                  />
                </Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="member-role">Rol</FieldLabel>
                  <Select
                    id="member-role"
                    value={formState.role}
                    onChange={(event) =>
                      setFormState((current) => ({
                        ...current,
                        role: event.target.value as MemberRole
                      }))
                    }
                  >
                    <option value="member">Miembro</option>
                    <option value="instructor">Instructor</option>
                    <option value="admin">Administrador</option>
                  </Select>
                </Field>

                <Field>
                  <FieldLabel htmlFor="member-membership-status">Estado de membresía</FieldLabel>
                  <Select
                    id="member-membership-status"
                    value={formState.membership_status}
                    onChange={(event) =>
                      setFormState((current) => ({
                        ...current,
                        membership_status: event.target.value as MembershipStatus
                      }))
                    }
                  >
                    <option value="active">Activo</option>
                    <option value="inactive">Inactivo</option>
                    <option value="cancelled">Cancelado</option>
                  </Select>
                </Field>
              </div>

              {feedback.isSuccess || feedback.isError ? (
                <InlineFeedback
                  message={feedback.message}
                  type={feedback.isSuccess ? "success" : "error"}
                />
              ) : null}

              <Button
                className="h-12 w-full"
                disabled={feedback.isLoading}
                loading={feedback.isLoading}
                success={feedback.isSuccess}
                type="submit"
                variant="primary"
              >
                {feedback.isLoading
                  ? "Creando cuenta..."
                  : feedback.isSuccess
                    ? "Creado"
                    : "Crear miembro"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
