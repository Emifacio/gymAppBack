import { useAuth } from "@/hooks/use-auth";
import { useCancelBooking, useMemberAttendance, useMemberBookings } from "@/hooks/use-workouts";
import { formatWorkoutSchedule } from "@/lib/format";

export function BookingsPage() {
  const { session } = useAuth();
  const bookingsQuery = useMemberBookings(session!.member.id);
  const attendanceQuery = useMemberAttendance(session!.member.id);
  const cancelBooking = useCancelBooking();

  const bookings = bookingsQuery.data?.bookings ?? [];
  const waitlist = bookingsQuery.data?.waitlist ?? [];
  const attendance = attendanceQuery.data ?? [];

  return (
    <div className="space-y-6">
      <section className="glass-panel rounded-[2rem] p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[var(--accent)]">Member operations</p>
        <h1 className="section-title mt-3 text-4xl font-semibold">Your bookings and history</h1>
        <p className="mt-3 max-w-3xl text-sm leading-8 text-[var(--muted)]">
          This page exposes the backend member booking and attendance endpoints so members can finally use more
          than the initial demo flow.
        </p>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="glass-panel rounded-[2rem] p-8">
          <h2 className="section-title text-3xl font-semibold">Bookings</h2>
          <div className="mt-6 space-y-4">
            {bookings.map((booking) => (
              <div key={booking.id} className="rounded-[1.5rem] bg-white/80 p-5">
                <p className="text-lg font-semibold text-[var(--ink)]">
                  {booking.gym_class?.name ?? booking.class_id}
                </p>
                <p className="mt-2 text-sm text-[var(--muted)]">
                  {booking.gym_class?.scheduled_at
                    ? formatWorkoutSchedule(booking.gym_class.scheduled_at)
                    : formatWorkoutSchedule(booking.booked_at)}
                </p>
                <p className="mt-1 text-sm text-[var(--muted)]">Status: {booking.status}</p>
                <button
                  className="mt-4 rounded-full border border-[rgba(255,122,89,0.3)] px-4 py-2 text-sm font-semibold text-[var(--accent)]"
                  disabled={cancelBooking.isPending}
                  onClick={() => {
                    cancelBooking.mutate({
                      bookingId: booking.id,
                      memberId: session!.member.id
                    });
                  }}
                  type="button"
                >
                  Cancel booking
                </button>
              </div>
            ))}

            {!bookings.length ? (
              <div className="rounded-[1.5rem] bg-white/80 p-5 text-sm text-[var(--muted)]">
                You have no bookings yet.
              </div>
            ) : null}
          </div>
        </div>

        <div className="glass-panel rounded-[2rem] p-8">
          <h2 className="section-title text-3xl font-semibold">Waitlist</h2>
          <div className="mt-6 space-y-4">
            {waitlist.map((entry) => (
              <div key={entry.id} className="rounded-[1.5rem] bg-white/80 p-5">
                <p className="text-lg font-semibold text-[var(--ink)]">
                  {entry.gym_class?.name ?? entry.class_id}
                </p>
                <p className="mt-2 text-sm text-[var(--muted)]">
                  Position {entry.position} · Status {entry.status}
                </p>
              </div>
            ))}

            {!waitlist.length ? (
              <div className="rounded-[1.5rem] bg-white/80 p-5 text-sm text-[var(--muted)]">
                You are not on any waitlists.
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section className="glass-panel rounded-[2rem] p-8">
        <h2 className="section-title text-3xl font-semibold">Attendance history</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {attendance.map((record) => (
            <div key={record.id} className="rounded-[1.5rem] bg-white/80 p-5">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
                {record.status}
              </p>
              <p className="mt-2 text-sm text-[var(--muted)]">Class ID: {record.class_id}</p>
              <p className="mt-1 text-sm text-[var(--muted)]">Marked: {formatWorkoutSchedule(record.marked_at)}</p>
            </div>
          ))}

          {!attendance.length ? (
            <div className="rounded-[1.5rem] bg-white/80 p-5 text-sm text-[var(--muted)]">
              No attendance records yet.
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
