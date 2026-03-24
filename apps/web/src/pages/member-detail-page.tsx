import { useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  GraduationCap,
  History,
  Mail,
  Phone,
  ShieldCheck,
  UserRound
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Member } from "@gym/api-client";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { buttonClassName } from "@/components/ui/button-utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardEyebrow,
  CardHeader,
  CardInset,
  CardTitle
} from "@/components/ui/Card";
import { Field, FieldError, FieldHint, FieldLabel } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { InlineFeedback } from "@/components/ui/InlineFeedback";
import { Select } from "@/components/ui/Select";
import { SkeletonListRow } from "@/components/ui/skeletons";
import { Textarea } from "@/components/ui/Textarea";
import { useAuth } from "@/hooks/use-auth";
import {
  useAssignSubscription,
  useCancelSubscription,
  useMember,
  useMemberAttendance,
  useMemberBookings,
  useMemberSubscription,
  usePlans,
  useUpdateMember
} from "@/hooks/use-workouts";
import { formatCredits, formatDateTime } from "@/lib/format";
import { canManageOperations, isAdmin } from "@/lib/roles";

type MemberRole = Member["role"];
type MembershipStatus = Member["membership_status"];
type BadgeTone = "accent" | "neutral" | "success" | "warning" | "danger";

const roleConfig: Record<
  MemberRole,
  { label: string; icon: LucideIcon; tone: "accent" | "neutral" | "warning" }
> = {
  admin: {
    label: "Administrador",
    icon: ShieldCheck,
    tone: "accent"
  },
  instructor: {
    label: "Instructor",
    icon: GraduationCap,
    tone: "warning"
  },
  member: {
    label: "Miembro",
    icon: UserRound,
    tone: "neutral"
  }
};

const membershipStatusConfig: Record<
  MembershipStatus,
  { label: string; tone: "success" | "warning" | "danger" }
> = {
  active: {
    label: "Membresia activa",
    tone: "success"
  },
  cancelled: {
    label: "Membresia cancelada",
    tone: "danger"
  },
  inactive: {
    label: "Membresia inactiva",
    tone: "warning"
  },
  suspended: {
    label: "Membresia suspendida",
    tone: "danger"
  }
};

function getInitials(fullName: string) {
  const tokens = fullName
    .split(" ")
    .map((token) => token.trim())
    .filter(Boolean)
    .slice(0, 2);

  if (tokens.length === 0) {
    return "GM";
  }

  return tokens.map((token) => token[0]?.toUpperCase() ?? "").join("");
}

function getAccountTone(isActive: boolean): BadgeTone {
  return isActive ? "success" : "neutral";
}

function getBookingTone(status: string): BadgeTone {
  switch (status) {
    case "confirmed":
    case "booked":
      return "success";
    case "waitlisted":
    case "pending":
      return "warning";
    case "cancelled":
    case "no_show":
      return "danger";
    default:
      return "neutral";
  }
}

function getAttendanceTone(status: string): BadgeTone {
  return status === "present" ? "success" : "danger";
}

function toSentenceCase(value: string) {
  if (!value) {
    return value;
  }

  return value
    .split("_")
    .join(" ")
    .replace(/^\w/, (match) => match.toUpperCase());
}

const DISPLAY_DATE_PLACEHOLDER = "dd/mm/yyyy";
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const DISPLAY_DATE_PATTERN = /^\d{2}\/\d{2}\/\d{4}$/;

function formatIsoDateToDisplay(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  const isoDate = value.slice(0, 10);
  if (!ISO_DATE_PATTERN.test(isoDate)) {
    return "";
  }

  const [year, month, day] = isoDate.split("-");
  return `${day}/${month}/${year}`;
}

function formatDisplayDateInput(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 8);

  if (digits.length <= 2) {
    return digits;
  }

  if (digits.length <= 4) {
    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  }

  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

function isLeapYear(year: number) {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function getDaysInMonth(month: number, year: number) {
  if (month === 2) {
    return isLeapYear(year) ? 29 : 28;
  }

  if ([4, 6, 9, 11].includes(month)) {
    return 30;
  }

  return 31;
}

function isValidDisplayDate(value: string) {
  if (!DISPLAY_DATE_PATTERN.test(value)) {
    return false;
  }

  const [dayString, monthString, yearString] = value.split("/");
  const day = Number(dayString);
  const month = Number(monthString);
  const year = Number(yearString);

  if (!Number.isInteger(day) || !Number.isInteger(month) || !Number.isInteger(year)) {
    return false;
  }

  if (month < 1 || month > 12 || day < 1 || year < 1000 || year > 9999) {
    return false;
  }

  return day <= getDaysInMonth(month, year);
}

function parseDisplayDateToIso(value: string) {
  if (!isValidDisplayDate(value)) {
    return null;
  }

  const [day, month, year] = value.split("/");
  return `${year}-${month}-${day}`;
}

export function MemberDetailPage() {
  const { memberId = "" } = useParams();
  const { session } = useAuth();
  const memberQuery = useMember(memberId);
  const bookingsQuery = useMemberBookings(memberId);
  const attendanceQuery = useMemberAttendance(memberId);
  const subscriptionQuery = useMemberSubscription(memberId);
  const plansQuery = usePlans({ active: true, limit: 100 });
  const updateMember = useUpdateMember();
  const assignSubscription = useAssignSubscription();
  const cancelSubscription = useCancelSubscription();

  const member = memberQuery.data;
  const bookings = bookingsQuery.data?.bookings ?? [];
  const attendance = attendanceQuery.data ?? [];
  const subscription = subscriptionQuery.data;
  const canView =
    session && (canManageOperations(session.member) || session.member.id === memberId);
  const [birthDateError, setBirthDateError] = useState<string | null>(null);

  if (!canView) {
    return <Navigate to="/dashboard" replace />;
  }

  if (!member && memberQuery.isSuccess) {
    return <Navigate to="/members" replace />;
  }

  if (!member) {
    return null;
  }

  const role = roleConfig[member.role];
  const RoleIcon = role.icon;
  const membershipStatus = membershipStatusConfig[member.membership_status];
  const currentPlanOptions = plansQuery.data ?? [];
  const planOptions =
    member.membership_plan &&
    !currentPlanOptions.some((plan) => plan.id === member.membership_plan?.id)
      ? [member.membership_plan, ...currentPlanOptions]
      : currentPlanOptions;

  return (
    <div className="space-y-[var(--section-gap)]">
      <Card as="section" className="overflow-hidden">
        <CardContent className="mt-0 space-y-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-5">
              <Link className={buttonClassName({ size: "sm", variant: "ghost" })} to="/members">
                <ArrowLeft className="h-4 w-4" />
                Volver a miembros
              </Link>

              <div className="flex items-start gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[1.5rem] border border-[var(--border-base)] bg-[var(--bg-surface-secondary)] text-lg font-black uppercase tracking-[0.24em] text-[var(--accent)] shadow-inner">
                  {getInitials(member.full_name)}
                </div>
                <div className="space-y-2">
                  <CardEyebrow>Perfil del miembro</CardEyebrow>
                  <h1 className="section-title text-[var(--font-size-4xl)] leading-tight text-[var(--text-primary)]">
                    {member.full_name}
                  </h1>
                  <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--text-secondary)]">
                    <span className="inline-flex items-center gap-2">
                      <Mail className="h-4 w-4 text-[var(--text-muted)]" />
                      {member.email}
                    </span>
                    {member.phone ? (
                      <span className="inline-flex items-center gap-2">
                        <Phone className="h-4 w-4 text-[var(--text-muted)]" />
                        {member.phone}
                      </span>
                    ) : null}
                    {member.birth_date ? (
                      <span className="inline-flex items-center gap-2">
                        <CalendarDays className="h-4 w-4 text-[var(--text-muted)]" />
                        {formatIsoDateToDisplay(member.birth_date)}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge tone={role.tone}>
                <RoleIcon className="h-3.5 w-3.5" />
                {role.label}
              </Badge>
              <Badge tone={membershipStatus.tone}>{membershipStatus.label}</Badge>
              <Badge dot tone={getAccountTone(member.is_active)}>
                {member.is_active ? "Cuenta activa" : "Cuenta inactiva"}
              </Badge>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            <CardInset>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">
                Plan actual
              </p>
              <p className="mt-2 text-lg font-bold text-[var(--text-primary)]">
                {subscription?.plan.name ?? member.membership_plan?.name ?? "Sin plan asignado"}
              </p>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                {subscription?.plan.allows_free_pass
                  ? "Pase libre disponible mientras haya cupos."
                  : formatCredits(subscription?.active_credits)}
              </p>
            </CardInset>

            <CardInset>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">
                Estado operativo
              </p>
              <p className="mt-2 text-lg font-bold text-[var(--text-primary)]">
                {member.is_active ? "Activa y lista" : "Requiere reactivacion"}
              </p>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                Gestiona acceso, rol y credenciales desde el formulario de perfil.
              </p>
            </CardInset>

            <CardInset>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">
                Proximo corte
              </p>
              <p className="mt-2 text-lg font-bold text-[var(--text-primary)]">
                {subscription?.period_end
                  ? formatDateTime(subscription.period_end)
                  : "Sin fecha activa"}
              </p>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                {bookings.length > 0
                  ? `${bookings.length} reserva${bookings.length === 1 ? "" : "s"} registrada${bookings.length === 1 ? "" : "s"}.`
                  : "Aun no hay reservas registradas."}
              </p>
            </CardInset>
          </div>
        </CardContent>
      </Card>

      <section className="grid gap-[var(--section-gap)] xl:grid-cols-[0.95fr_1.05fr]">
        <Card as="section">
          <CardHeader>
            <CardTitle>Detalles del perfil</CardTitle>
            <CardDescription>
              Todos los campos de actualizacion opcionales del esquema del backend siguen
              disponibles aqui.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form
              className="space-y-5"
              key={member.id}
              onSubmit={(event) => {
                event.preventDefault();
                const formData = new FormData(event.currentTarget);
                const fullName = formData.get("full_name");
                const phone = formData.get("phone");
                const birthDate = formData.get("birth_date");
                const emergencyContact = formData.get("emergency_contact");
                const notes = formData.get("notes");
                const roleValue = formData.get("role");
                const membershipStatusValue = formData.get("membership_status");
                const password = formData.get("password");
                const membershipPlanId = formData.get("membership_plan_id");
                const instructorBio = formData.get("instructor_bio");
                const instructorSpecialties = formData.get("instructor_specialties");
                const isActive = formData.get("is_active");
                const parsedBirthDate =
                  typeof birthDate === "string" && birthDate
                    ? parseDisplayDateToIso(birthDate)
                    : null;

                if (typeof birthDate === "string" && birthDate && !parsedBirthDate) {
                  setBirthDateError(
                    `Ingresa una fecha valida con formato ${DISPLAY_DATE_PLACEHOLDER}.`
                  );
                  return;
                }

                setBirthDateError(null);

                updateMember.mutate({
                  memberId: member.id,
                  payload: {
                    full_name: typeof fullName === "string" ? fullName : member.full_name,
                    phone: typeof phone === "string" && phone ? phone : null,
                    birth_date: parsedBirthDate,
                    emergency_contact:
                      typeof emergencyContact === "string" && emergencyContact
                        ? emergencyContact
                        : null,
                    notes: typeof notes === "string" && notes ? notes : null,
                    membership_status:
                      typeof membershipStatusValue === "string"
                        ? (membershipStatusValue as MembershipStatus)
                        : member.membership_status,
                    role: typeof roleValue === "string" ? (roleValue as MemberRole) : member.role,
                    password: typeof password === "string" && password ? password : null,
                    membership_plan_id:
                      typeof membershipPlanId === "string" && membershipPlanId
                        ? membershipPlanId
                        : null,
                    is_active: isActive === "on",
                    instructor_bio:
                      typeof instructorBio === "string" && instructorBio ? instructorBio : null,
                    instructor_specialties:
                      typeof instructorSpecialties === "string" && instructorSpecialties
                        ? instructorSpecialties
                        : null
                  }
                });
              }}
            >
              <Field>
                <FieldLabel htmlFor="member-detail-full-name">Nombre completo</FieldLabel>
                <Input
                  defaultValue={member.full_name}
                  id="member-detail-full-name"
                  name="full_name"
                />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="member-detail-phone">Telefono</FieldLabel>
                  <Input defaultValue={member.phone ?? ""} id="member-detail-phone" name="phone" />
                </Field>

                <Field>
                  <FieldLabel htmlFor="member-detail-birth-date">Fecha de nacimiento</FieldLabel>
                  <Input
                    defaultValue={formatIsoDateToDisplay(member.birth_date)}
                    id="member-detail-birth-date"
                    inputMode="numeric"
                    maxLength={10}
                    name="birth_date"
                    placeholder={DISPLAY_DATE_PLACEHOLDER}
                    type="text"
                    onBlur={(event) => {
                      const { value } = event.target;

                      if (!value) {
                        setBirthDateError(null);
                        return;
                      }

                      if (!isValidDisplayDate(value)) {
                        setBirthDateError(
                          `Ingresa una fecha valida con formato ${DISPLAY_DATE_PLACEHOLDER}.`
                        );
                        return;
                      }

                      setBirthDateError(null);
                    }}
                    onChange={(event) => {
                      event.target.value = formatDisplayDateInput(event.target.value);
                      if (birthDateError) {
                        setBirthDateError(null);
                      }
                    }}
                  />
                  <FieldHint>Usa el formato {DISPLAY_DATE_PLACEHOLDER}.</FieldHint>
                  {birthDateError ? <FieldError>{birthDateError}</FieldError> : null}
                </Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="member-detail-role">Rol</FieldLabel>
                  <Select defaultValue={member.role} id="member-detail-role" name="role">
                    <option value="member">Miembro</option>
                    <option value="instructor">Instructor</option>
                    <option value="admin">Administrador</option>
                  </Select>
                </Field>

                <Field>
                  <FieldLabel htmlFor="member-detail-membership-status">
                    Estado de membresia
                  </FieldLabel>
                  <Select
                    defaultValue={member.membership_status}
                    id="member-detail-membership-status"
                    name="membership_status"
                  >
                    <option value="active">Activo</option>
                    <option value="inactive">Inactivo</option>
                    <option value="cancelled">Cancelado</option>
                    <option value="suspended">Suspendido</option>
                  </Select>
                </Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="member-detail-membership-plan-id">
                    Plan de membresia
                  </FieldLabel>
                  <Select
                    defaultValue={member.membership_plan?.id ?? ""}
                    id="member-detail-membership-plan-id"
                    name="membership_plan_id"
                  >
                    <option value="">Sin plan asignado</option>
                    {planOptions.map((plan) => (
                      <option key={plan.id} value={plan.id}>
                        {plan.name}
                      </option>
                    ))}
                  </Select>
                  <FieldHint>
                    Mantiene la misma actualizacion del plan, ahora con selector compartido.
                  </FieldHint>
                </Field>

                <Field>
                  <FieldLabel htmlFor="member-detail-password">Restablecer contraseña</FieldLabel>
                  <Input
                    id="member-detail-password"
                    minLength={8}
                    name="password"
                    type="password"
                  />
                  <FieldHint>Dejalo vacio si no quieres cambiarla.</FieldHint>
                </Field>
              </div>

              <CardInset className="space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-bold text-[var(--text-primary)]">Estado de cuenta</p>
                    <p className="mt-1 text-sm text-[var(--text-secondary)]">
                      Controla si la cuenta puede seguir operando dentro de la plataforma.
                    </p>
                  </div>
                  <Badge dot tone={getAccountTone(member.is_active)}>
                    {member.is_active ? "Activa" : "Inactiva"}
                  </Badge>
                </div>
                <label className="flex items-center gap-3 rounded-2xl border border-[var(--border-base)] bg-[var(--bg-surface)] px-4 py-3 text-sm font-medium text-[var(--text-secondary)]">
                  <input
                    className="h-4 w-4 rounded border-[var(--border-base)] accent-[var(--accent)]"
                    defaultChecked={member.is_active}
                    name="is_active"
                    type="checkbox"
                  />
                  La cuenta esta activa
                </label>
              </CardInset>

              <Field>
                <FieldLabel htmlFor="member-detail-emergency-contact">
                  Contacto de emergencia
                </FieldLabel>
                <Input
                  defaultValue={member.emergency_contact ?? ""}
                  id="member-detail-emergency-contact"
                  name="emergency_contact"
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="member-detail-notes">Notas medicas</FieldLabel>
                <Textarea
                  defaultValue={member.notes ?? ""}
                  id="member-detail-notes"
                  name="notes"
                  rows={4}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="member-detail-instructor-bio">
                  Biografia del instructor
                </FieldLabel>
                <Textarea
                  defaultValue={member.instructor_profile?.bio ?? ""}
                  id="member-detail-instructor-bio"
                  name="instructor_bio"
                  rows={3}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="member-detail-instructor-specialties">
                  Especialidades del instructor
                </FieldLabel>
                <Input
                  defaultValue={member.instructor_profile?.specialties ?? ""}
                  id="member-detail-instructor-specialties"
                  name="instructor_specialties"
                />
              </Field>

              {updateMember.error ? (
                <InlineFeedback message={updateMember.error.message} type="error" />
              ) : null}

              <Button
                className="h-12 w-full"
                disabled={updateMember.isPending}
                loading={updateMember.isPending}
                type="submit"
                variant="primary"
              >
                {updateMember.isPending ? "Guardando cambios..." : "Guardar perfil"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card as="section">
            <CardHeader>
              <div className="flex items-center gap-3">
                <CreditCard className="h-5 w-5 text-[var(--accent)]" />
                <div>
                  <CardTitle>Suscripcion</CardTitle>
                  <CardDescription>
                    Asignacion y cancelacion sin tocar la logica actual de negocio.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <CardInset className="space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-bold text-[var(--text-primary)]">
                      {subscription?.plan.name ?? "Sin suscripcion activa"}
                    </p>
                    <p className="mt-2 text-sm text-[var(--text-secondary)]">
                      {subscription?.plan.allows_free_pass
                        ? "Pase libre mientras haya cupos disponibles."
                        : formatCredits(subscription?.active_credits)}
                    </p>
                    <p className="mt-1 text-sm text-[var(--text-secondary)]">
                      Vence el {formatDateTime(subscription?.period_end)}
                    </p>
                  </div>
                  <Badge tone={subscription ? membershipStatus.tone : "neutral"}>
                    {subscription ? "Suscripcion activa" : "Sin suscripcion"}
                  </Badge>
                </div>
              </CardInset>

              {isAdmin(session?.member) ? (
                <CardInset>
                  <form
                    className="space-y-4"
                    onSubmit={(event) => {
                      event.preventDefault();
                      const formData = new FormData(event.currentTarget);
                      const planId = formData.get("plan_id");
                      if (typeof planId !== "string" || !planId) {
                        return;
                      }
                      assignSubscription.mutate({
                        memberId,
                        payload: { plan_id: planId }
                      });
                    }}
                  >
                    <Field>
                      <FieldLabel htmlFor="member-detail-plan-id">Asignar plan</FieldLabel>
                      <Select
                        defaultValue={subscription?.plan_id ?? ""}
                        id="member-detail-plan-id"
                        name="plan_id"
                      >
                        <option value="">Selecciona un plan</option>
                        {(plansQuery.data ?? []).map((plan) => (
                          <option key={plan.id} value={plan.id}>
                            {plan.name}
                          </option>
                        ))}
                      </Select>
                    </Field>

                    {assignSubscription.error ? (
                      <InlineFeedback message={assignSubscription.error.message} type="error" />
                    ) : null}

                    {cancelSubscription.error ? (
                      <InlineFeedback message={cancelSubscription.error.message} type="error" />
                    ) : null}

                    <div className="flex flex-wrap gap-3">
                      <Button
                        disabled={assignSubscription.isPending}
                        loading={assignSubscription.isPending}
                        type="submit"
                        variant="primary"
                      >
                        {assignSubscription.isPending ? "Asignando..." : "Asignar suscripcion"}
                      </Button>
                      <Button
                        disabled={cancelSubscription.isPending || !subscription}
                        loading={cancelSubscription.isPending}
                        onClick={() => {
                          cancelSubscription.mutate({ memberId });
                        }}
                        type="button"
                        variant="danger"
                      >
                        Cancelar suscripcion
                      </Button>
                    </div>
                  </form>
                </CardInset>
              ) : null}
            </CardContent>
          </Card>

          <Card as="section">
            <CardHeader>
              <div className="flex items-center gap-3">
                <History className="h-5 w-5 text-[var(--accent)]" />
                <div>
                  <CardTitle>Historial de reservas</CardTitle>
                  <CardDescription>
                    Registro cronologico de clases reservadas y consumo asociado.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-3">
              {bookings.map((booking) => (
                <CardInset key={booking.id} className="flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <p className="font-bold text-[var(--text-primary)]">
                      {booking.gym_class?.name ?? `Class ${booking.class_id}`}
                    </p>
                    <p className="text-sm text-[var(--text-secondary)]">
                      Reservado el {formatDateTime(booking.booked_at)}
                    </p>
                    <p className="text-sm text-[var(--text-secondary)]">
                      {booking.booking_type}
                      {booking.credits_consumed
                        ? ` · ${booking.credits_consumed} ${booking.credits_consumed === 1 ? "credito usado" : "creditos usados"}`
                        : ""}
                    </p>
                  </div>
                  <Badge tone={getBookingTone(booking.status)}>
                    {toSentenceCase(booking.status)}
                  </Badge>
                </CardInset>
              ))}

              {bookingsQuery.isLoading ? (
                <>
                  <SkeletonListRow />
                  <SkeletonListRow />
                  <SkeletonListRow />
                </>
              ) : null}

              {!bookingsQuery.isLoading && bookings.length === 0 ? (
                <CardInset className="text-center">
                  <p className="text-sm font-medium text-[var(--text-secondary)]">
                    No hay reservas registradas todavia.
                  </p>
                </CardInset>
              ) : null}
            </CardContent>
          </Card>

          <Card as="section">
            <CardHeader>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-[var(--accent)]" />
                <div>
                  <CardTitle>Registro de asistencia</CardTitle>
                  <CardDescription>
                    Historial de presencia marcado por clase, manteniendo la lectura actual.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-3">
              {attendance.map((record) => (
                <CardInset key={record.id} className="flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <p className="font-bold text-[var(--text-primary)]">{record.class_id}</p>
                    <p className="text-sm text-[var(--text-secondary)]">
                      Marcado el {formatDateTime(record.marked_at)}
                    </p>
                  </div>
                  <Badge tone={getAttendanceTone(record.status)}>
                    {record.status === "present" ? "Presente" : "Ausente"}
                  </Badge>
                </CardInset>
              ))}

              {attendanceQuery.isLoading ? (
                <>
                  <SkeletonListRow />
                  <SkeletonListRow />
                  <SkeletonListRow />
                </>
              ) : null}

              {!attendanceQuery.isLoading && attendance.length === 0 ? (
                <CardInset className="text-center">
                  <p className="text-sm font-medium text-[var(--text-secondary)]">
                    Sin registros de asistencia aun.
                  </p>
                </CardInset>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
