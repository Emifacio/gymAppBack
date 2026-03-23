import { useEffect, useState } from "react";
import { Ticket, Clock, History, Ban, CheckCircle2, AlertCircle } from "lucide-react";

import { useAuth } from "@/hooks/use-auth";
import {
  useCancelBooking,
  useMemberAttendance,
  useMemberBookings,
  useMySubscriptionStatus
} from "@/hooks/use-workouts";
import { formatCredits, formatDateTime, formatWorkoutSchedule } from "@/lib/format";
import { CancellationModal } from "@/components/cancellation-modal";
import { Button } from "@/components/ui/Button";

export function BookingsPage() {
  const { session } = useAuth();
  const bookingsQuery = useMemberBookings(session!.member.id);
  const attendanceQuery = useMemberAttendance(session!.member.id);
  const subscriptionQuery = useMySubscriptionStatus();
  const cancelBooking = useCancelBooking();

  const [cancelModal, setCancelModal] = useState<{
    open: boolean;
    bookingId: string;
    isLate: boolean;
  }>({
    open: false,
    bookingId: "",
    isLate: false
  });
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(timer);
  }, [toast]);

  const bookings = bookingsQuery.data?.bookings ?? [];
  const waitlist = bookingsQuery.data?.waitlist ?? [];
  const attendance = attendanceQuery.data ?? [];
  const subscription = subscriptionQuery.data;

  const isBookingLateCancelable = (scheduledAt: string | undefined | null) => {
    if (!scheduledAt) return false;
    const classDate = new Date(scheduledAt);
    const now = new Date();
    const hoursDiff = (classDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    return hoursDiff < 24;
  };

  const isBookingPast = (scheduledAt: string | undefined | null) => {
    if (!scheduledAt) return false;
    const classDate = new Date(scheduledAt);
    return classDate <= new Date();
  };

  const handleCancelClick = (bookingId: string, scheduledAt: string | undefined | null) => {
    const isLateCancellation = isBookingLateCancelable(scheduledAt);
    const isPastBooking = isBookingPast(scheduledAt);

    if (isPastBooking) return;

    setCancelModal({
      open: true,
      bookingId,
      isLate: isLateCancellation
    });
  };

  const confirmCancellation = () => {
    if (cancelModal.isLate) {
      setCancelModal({ ...cancelModal, open: false });
      setToast({
        type: "error",
        message:
          "Las clases dentro de las últimas 24 h no se pueden cancelar por política de créditos."
      });
      return;
    }

    setToast(null);

    cancelBooking.mutate(
      {
        bookingId: cancelModal.bookingId,
        memberId: session!.member.id
      },
      {
        onError: (error: unknown) => {
          const message = error instanceof Error ? error.message : String(error);
          setToast({ type: "error", message: message || "Error al procesar la cancelación." });
        },
        onSuccess: () => {
          setCancelModal({ ...cancelModal, open: false });
          setToast({ type: "success", message: "Reserva liberada. Crédito restaurado si aplica." });
        }
      }
    );
  };

  return (
    <div className="space-y-[var(--section-gap)] transition-colors duration-300">
      <header className="apple-card p-8 shadow-xl border border-[var(--border-base)]">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--accent)] text-white shadow-lg shadow-[var(--accent-soft)] mb-6">
          <Ticket className="h-8 w-8" />
        </div>
        <p className="text-sm font-bold uppercase tracking-[0.3em] text-[var(--accent)] opacity-80">
          Mis Actividades
        </p>
        <h1 className="mt-3 text-4xl font-bold text-[var(--text-primary)] tracking-tight">
          Reservas y Asistencia
        </h1>
        <p className="mt-3 max-w-2xl text-sm md:text-base leading-relaxed text-[var(--text-secondary)]">
          Administra tus cupos confirmados y revisa tu histórico de entrenamiento. Recuerda cancelar
          con al menos 24 h para recuperar tus créditos.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-2xl bg-[var(--bg-surface-secondary)] p-5 border border-[var(--border-base)]/50 shadow-sm flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-[var(--bg-surface)] flex items-center justify-center text-[var(--accent)] shadow-sm">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
                Plan Actual
              </p>
              <p className="text-sm font-bold text-[var(--text-primary)]">
                {subscription?.plan_name ?? "Sin Suscripción"}
              </p>
            </div>
          </div>
          <div className="rounded-2xl bg-[var(--bg-surface-secondary)] p-5 border border-[var(--border-base)]/50 shadow-sm flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-[var(--bg-surface)] flex items-center justify-center text-[var(--accent)] shadow-sm">
              <Ticket className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
                Balance
              </p>
              <p className="text-sm font-bold text-[var(--text-primary)]">
                {subscription?.allows_free_pass
                  ? "Pase Libre"
                  : formatCredits(subscription?.active_credits ?? 0)}
              </p>
            </div>
          </div>
          <div className="rounded-2xl bg-[var(--bg-surface-secondary)] p-5 border border-[var(--border-base)]/50 shadow-sm flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-[var(--bg-surface)] flex items-center justify-center text-[var(--accent)] shadow-sm">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
                Vence el
              </p>
              <p className="text-sm font-bold text-[var(--text-primary)]">
                {formatDateTime(subscription?.period_end)}
              </p>
            </div>
          </div>
        </div>
      </header>

      {toast && (
        <div
          className={`rounded-2xl p-5 text-sm font-bold border shadow-lg transition-all animate-in zoom-in-95 slide-in-from-top-4 flex items-center gap-3 ${
            toast.type === "success"
              ? "bg-[var(--success-soft)] text-[var(--success)] border-[var(--success-soft)]"
              : "bg-[var(--danger-soft)] text-[var(--danger)] border-[var(--danger-soft)]"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="h-5 w-5" />
          ) : (
            <AlertCircle className="h-5 w-5" />
          )}
          {toast.message}
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-2">
        <section className="apple-card p-8 shadow-xl" id="tour-cancel-booking">
          <div className="flex items-center gap-3 mb-8">
            <CheckCircle2 className="h-6 w-6 text-[var(--success)]" />
            <h2 className="section-title text-[var(--font-size-xl)] text-[var(--text-primary)]">
              Confirmadas
            </h2>
          </div>

          <div className="space-y-4">
            {bookings.map((booking) => (
              <div
                key={booking.id}
                className="group rounded-2xl bg-[var(--bg-surface-secondary)]/40 p-6 border border-transparent hover:border-[var(--border-base)] hover:bg-[var(--bg-surface-secondary)] transition-all shadow-sm"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-lg font-bold text-[var(--text-primary)] leading-tight group-hover:text-[var(--accent)] transition-colors">
                      {booking.gym_class?.name ?? "Clase sin nombre"}
                    </p>
                    <p className="text-sm font-medium text-[var(--text-secondary)] flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 opacity-60" />
                      {formatWorkoutSchedule(booking.gym_class?.scheduled_at ?? booking.booked_at)}
                    </p>
                  </div>
                  <div className="rounded-xl bg-[var(--accent-soft)] px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--accent)] border border-[var(--accent-soft)]">
                    Confirmado
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
                    {booking.booking_type} ·{" "}
                    {booking.credits_consumed ? `${booking.credits_consumed} CR` : "S/C"}
                  </p>

                  {!isBookingPast(booking.gym_class?.scheduled_at) && (
                    <Button
                      variant="secondary"
                      size="sm"
                      className="rounded-xl font-bold h-9 px-4 border-[var(--border-base)] hover:bg-[var(--danger-soft)] hover:text-[var(--danger)] hover:border-transparent transition-all"
                      disabled={
                        cancelBooking.isPending ||
                        isBookingLateCancelable(booking.gym_class?.scheduled_at)
                      }
                      onClick={() => handleCancelClick(booking.id, booking.gym_class?.scheduled_at)}
                    >
                      {isBookingLateCancelable(booking.gym_class?.scheduled_at)
                        ? "Restringido < 24h"
                        : "Cancelar cupo"}
                    </Button>
                  )}
                  {isBookingPast(booking.gym_class?.scheduled_at) && (
                    <span className="text-[10px] font-bold uppercase text-[var(--text-muted)] opacity-60">
                      Finalizado
                    </span>
                  )}
                </div>
              </div>
            ))}

            {!bookings.length && !bookingsQuery.isLoading && (
              <div className="py-12 text-center opacity-50 grayscale">
                <Ban className="h-10 w-10 mx-auto text-[var(--text-muted)] mb-3" />
                <p className="text-sm font-bold">Sin reservas activas</p>
              </div>
            )}

            {bookingsQuery.isLoading && (
              <div className="animate-pulse space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-32 rounded-2xl bg-[var(--bg-surface-secondary)]" />
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="apple-card p-8 shadow-xl">
          <div className="flex items-center gap-3 mb-8">
            <Clock className="h-6 w-6 text-[var(--warning)]" />
            <h2 className="section-title text-[var(--font-size-xl)] text-[var(--text-primary)]">
              Lista de Espera
            </h2>
          </div>

          <div className="space-y-4">
            {waitlist.map((entry) => (
              <div
                key={entry.id}
                className="group rounded-2xl bg-[var(--bg-surface-secondary)]/40 p-6 border border-transparent hover:border-[var(--border-base)] hover:bg-[var(--bg-surface-secondary)] transition-all shadow-sm"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-lg font-bold text-[var(--text-primary)] leading-tight group-hover:text-[var(--accent)] transition-colors">
                      {entry.gym_class?.name ?? "Clase sin nombre"}
                    </p>
                    <p className="text-sm font-medium text-[var(--text-secondary)]">
                      Posición en cola:{" "}
                      <span className="text-[var(--warning)] font-black">#{entry.position}</span>
                    </p>
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-between">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
                    Deseo entrar · {formatWorkoutSchedule(entry.gym_class?.scheduled_at)}
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 font-bold text-[var(--danger)] hover:bg-[var(--danger-soft)] rounded-xl"
                    disabled={cancelBooking.isPending}
                    onClick={() => handleCancelClick(entry.id, entry.gym_class?.scheduled_at)}
                  >
                    Salir de cola
                  </Button>
                </div>
              </div>
            ))}

            {!waitlist.length && !bookingsQuery.isLoading && (
              <div className="py-12 text-center opacity-50 grayscale">
                <Clock className="h-10 w-10 mx-auto text-[var(--text-muted)] mb-3" />
                <p className="text-sm font-bold">No estás en espera</p>
              </div>
            )}
          </div>
        </section>
      </div>

      <section className="apple-card p-8 shadow-xl">
        <div className="flex items-center gap-3 mb-8">
          <History className="h-6 w-6 text-[var(--accent)]" />
          <h2 className="section-title text-[var(--font-size-xl)] text-[var(--text-primary)]">
            Historial de Clases
          </h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {attendance.map((record) => (
            <div
              key={record.id}
              className="rounded-2xl bg-[var(--bg-surface-secondary)]/50 p-5 border border-[var(--border-base)] hover:shadow-md transition-shadow"
            >
              <div
                className={`mb-3 inline-flex px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-tighter ${
                  record.status === "present"
                    ? "bg-[var(--success-soft)] text-[var(--success)]"
                    : "bg-[var(--danger-soft)] text-[var(--danger)]"
                }`}
              >
                {record.status === "present" ? "Asistido" : "Falta"}
              </div>
              <p className="text-sm font-bold text-[var(--text-primary)] truncate">
                Entrenamiento ID: {record.class_id}
              </p>
              <p className="mt-1 text-xs font-medium text-[var(--text-secondary)]">
                {formatWorkoutSchedule(record.marked_at)}
              </p>
            </div>
          ))}

          {!attendance.length && !attendanceQuery.isLoading && (
            <div className="col-span-full py-20 text-center opacity-40">
              <History className="h-12 w-12 mx-auto mb-4" />
              <p className="font-bold">Aún no hay registros de asistencia en tu historial.</p>
            </div>
          )}
        </div>
      </section>

      <CancellationModal
        open={cancelModal.open}
        onClose={() => setCancelModal({ ...cancelModal, open: false })}
        onConfirm={confirmCancellation}
        isLate={cancelModal.isLate}
        loading={cancelBooking.isPending}
      />
    </div>
  );
}
