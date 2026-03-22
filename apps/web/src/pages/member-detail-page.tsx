import { Link, Navigate, useParams } from "react-router-dom";
import type { Member } from "@gym/api-client";

import { Button } from "@/components/ui/Button";
import { buttonClassName } from "@/components/ui/button-utils";
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
import { useAuth } from "@/hooks/use-auth";
import { formatCredits, formatDateTime } from "@/lib/format";
import { SkeletonListRow } from "@/components/ui/skeletons";
import { canManageOperations, isAdmin } from "@/lib/roles";

type MemberRole = Member["role"];
type MembershipStatus = Member["membership_status"];

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
  const subscription = subscriptionQuery.data;
  const canView =
    session &&
    (canManageOperations(session.member) || session.member.id === memberId);

  if (!canView) {
    return <Navigate to="/dashboard" replace />;
  }

  if (!member && memberQuery.isSuccess) {
    return <Navigate to="/members" replace />;
  }

  if (!member) {
    return null;
  }

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link className={buttonClassName({ size: "sm", variant: "ghost" })} to="/members">
              Volver a miembros
            </Link>
            <h1 className="mt-3 text-3xl font-semibold text-slate-900">{member.full_name}</h1>
            <p className="mt-2 text-sm text-slate-600">{member.email}</p>
          </div>
          <div className="flex flex-wrap gap-3 text-sm">
            <span className="rounded-full bg-amber-100 px-3 py-1 font-medium capitalize text-amber-800">
              {member.role}
            </span>
            <span className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-600">
              {member.membership_status}
            </span>
            <span className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-600">
              {member.is_active ? "cuenta activa" : "cuenta inactiva"}
            </span>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">Detalles del perfil</h2>
          <p className="mt-1 text-sm text-slate-500">
            Todos los campos de actualización opcionales del esquema del backend son editables aquí.
          </p>

          <form
            className="mt-6 space-y-4"
            key={member.id}
            onSubmit={(event) => {
              event.preventDefault();
              const formData = new FormData(event.currentTarget);
              const fullName = formData.get("full_name");
              const phone = formData.get("phone");
              const birthDate = formData.get("birth_date");
              const emergencyContact = formData.get("emergency_contact");
              const notes = formData.get("notes");
              const role = formData.get("role");
              const membershipStatus = formData.get("membership_status");
              const password = formData.get("password");
              const membershipPlanId = formData.get("membership_plan_id");
              const instructorBio = formData.get("instructor_bio");
              const instructorSpecialties = formData.get("instructor_specialties");
              const isActive = formData.get("is_active");

              updateMember.mutate({
                memberId: member.id,
                payload: {
                  full_name: typeof fullName === "string" ? fullName : member.full_name,
                  phone: typeof phone === "string" && phone ? phone : null,
                  birth_date: typeof birthDate === "string" && birthDate ? birthDate : null,
                  emergency_contact:
                    typeof emergencyContact === "string" && emergencyContact
                      ? emergencyContact
                      : null,
                  notes: typeof notes === "string" && notes ? notes : null,
                  membership_status:
                    typeof membershipStatus === "string"
                      ? (membershipStatus as MembershipStatus)
                      : member.membership_status,
                  role: typeof role === "string" ? (role as MemberRole) : member.role,
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
            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700">Nombre completo</span>
              <input
                defaultValue={member.full_name}
                name="full_name"
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-900"
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-700">Teléfono</span>
                <input
                  defaultValue={member.phone ?? ""}
                  name="phone"
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-900"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-700">Fecha de nacimiento</span>
                <input
                  defaultValue={member.birth_date ?? ""}
                  name="birth_date"
                  type="date"
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-900"
                />
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-700">Rol</span>
                <select
                  defaultValue={member.role}
                  name="role"
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-900"
                >
                  <option value="member">Miembro</option>
                  <option value="instructor">Instructor</option>
                  <option value="admin">Administrador</option>
                </select>
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-700">Estado de membresía</span>
                <select
                  defaultValue={member.membership_status}
                  name="membership_status"
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-900"
                >
                  <option value="active">Activo</option>
                  <option value="inactive">Inactivo</option>
                  <option value="cancelled">Cancelado</option>
                </select>
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-700">ID del plan de membresía</span>
                <input
                  defaultValue={member.membership_plan?.id ?? ""}
                  name="membership_plan_id"
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-900"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-700">Restablecer contraseña</span>
                <input
                  minLength={8}
                  name="password"
                  type="password"
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-900"
                />
              </label>
            </div>

            <label className="flex items-center gap-3 rounded-2xl border border-slate-300 px-4 py-3 text-sm font-medium text-slate-700">
              <input defaultChecked={member.is_active} name="is_active" type="checkbox" />
              La cuenta está activa
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700">Contacto de emergencia</span>
              <input
                defaultValue={member.emergency_contact ?? ""}
                name="emergency_contact"
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-900"
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700">Notas médicas</span>
              <textarea
                rows={4}
                defaultValue={member.notes ?? ""}
                name="notes"
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-900"
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700">Biografía del instructor</span>
              <textarea
                rows={3}
                defaultValue={member.instructor_profile?.bio ?? ""}
                name="instructor_bio"
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-900"
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700">Especialidades del instructor</span>
              <input
                defaultValue={member.instructor_profile?.specialties ?? ""}
                name="instructor_specialties"
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-900"
              />
            </label>

            {updateMember.error ? (
              <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {updateMember.error.message}
              </p>
            ) : null}

            <Button className="w-full" disabled={updateMember.isPending} loading={updateMember.isPending} type="submit" variant="primary">
              {updateMember.isPending ? "Saving changes..." : "Save profile"}
            </Button>
          </form>
        </div>

        <div className="space-y-6">
          <section className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Suscripción</h2>
            <div className="mt-4 space-y-3">
              <div className="rounded-2xl border border-slate-200 px-4 py-4">
                <p className="font-semibold text-slate-900">{subscription?.plan.name ?? "Sin suscripción activa"}</p>
                <p className="mt-2 text-sm text-slate-500">
                  {subscription?.plan.allows_free_pass
                    ? "Unlimited booking while spots remain available."
                    : formatCredits(subscription?.active_credits)}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Period ends {formatDateTime(subscription?.period_end)}
                </p>
              </div>

              {isAdmin(session?.member) ? (
                <form
                  className="space-y-3 rounded-2xl border border-slate-200 px-4 py-4"
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
                  <label className="block space-y-2">
                    <span className="text-sm font-medium text-slate-700">Asignar plan</span>
                    <select
                      className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-900"
                      defaultValue={subscription?.plan_id ?? ""}
                      name="plan_id"
                    >
                      <option value="">Selecciona un plan</option>
                      {(plansQuery.data ?? []).map((plan) => (
                        <option key={plan.id} value={plan.id}>
                          {plan.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="flex flex-wrap gap-3">
                    <Button disabled={assignSubscription.isPending} loading={assignSubscription.isPending} type="submit" variant="primary">
                      {assignSubscription.isPending ? "Asignando..." : "Asignar suscripción"}
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
                      Cancelar suscripción
                    </Button>
                  </div>
                </form>
              ) : null}
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Historial de reservas</h2>
            <div className="mt-4 space-y-3">
              {bookings.map((booking) => (
                <div key={booking.id} className="rounded-2xl border border-slate-200 px-4 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">
                        {booking.gym_class?.name ?? `Class ${booking.class_id}`}
                      </p>
                      <p className="text-sm text-slate-500">
                        Reservado el {formatDateTime(booking.booked_at)}
                      </p>
                      <p className="text-sm text-slate-500">
                        {booking.booking_type}
                        {booking.credits_consumed ? ` · ${booking.credits_consumed} ${booking.credits_consumed === 1 ? 'crédito usado' : 'créditos usados'}` : ""}
                      </p>
                    </div>
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-medium text-emerald-800">
                      {booking.status}
                    </span>
                  </div>
                </div>
              ))}
              {bookingsQuery.isLoading ? (
                <>
                  <SkeletonListRow />
                  <SkeletonListRow />
                  <SkeletonListRow />
                </>
              ) : null}
              {!bookingsQuery.isLoading && bookings.length === 0 ? (
                <p className="text-sm text-slate-500">No bookings yet.</p>
              ) : null}
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Registro de asistencia</h2>
            <div className="mt-4 space-y-3">
              {(attendanceQuery.data ?? []).map((record) => (
                <div key={record.id} className="rounded-2xl border border-slate-200 px-4 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">{record.class_id}</p>
                       <p className="text-sm text-slate-500">Marcado el {formatDateTime(record.marked_at)}</p>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-sm font-medium ${
                        record.status === "present"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-rose-100 text-rose-800"
                      }`}
                    >
                       {record.status === "present" ? "presente" : "ausente"}
                    </span>
                  </div>
                </div>
              ))}
               {attendanceQuery.isLoading ? (
                 <>
                   <SkeletonListRow />
                   <SkeletonListRow />
                   <SkeletonListRow />
                 </>
               ) : null}
               {!attendanceQuery.isLoading && (attendanceQuery.data ?? []).length === 0 ? (
                 <p className="text-sm text-slate-500">Sin registros de asistencia aún.</p>
               ) : null}
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}
