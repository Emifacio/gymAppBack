import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { getApiErrorCode, getApiErrorMessage } from "@gym/api-client";

import { BookingEligibilityModal } from "@/components/booking-eligibility-modal";
import { EmptyState } from "@/components/empty-state";
import { useAuth } from "@/hooks/use-auth";
import {
  useAssignMemberToClass,
  useClassAttendance,
  useClassMembers,
  useCreateBooking,
  useDeleteWorkout,
  useMySubscriptionStatus,
  useUpdateWorkout,
  useWorkout
} from "@/hooks/use-workouts";
import {
  getBookingEligibilityModalContent,
  getPrecheckErrorCode
} from "@/lib/booking-eligibility";
import {
  formatCredits,
  formatDateTime,
  formatWorkoutSchedule,
  toDateTimeLocalValue
} from "@/lib/format";
import { canManageOperations } from "@/lib/roles";

function getFormValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export function WorkoutDetailPage() {
  const navigate = useNavigate();
  const { workoutId = "" } = useParams();
  const { session } = useAuth();
  const [eligibilityModal, setEligibilityModal] = useState<{
    title: string;
    description: string;
  } | null>(null);
  const workoutQuery = useWorkout(workoutId);
  const canManage = canManageOperations(session?.member);
  const classAttendanceQuery = useClassAttendance(workoutId, canManage);
  const classMembersQuery = useClassMembers(workoutId, canManage);
  const subscriptionQuery = useMySubscriptionStatus();
  const bookingMutation = useCreateBooking();
  const assignMemberMutation = useAssignMemberToClass();
  const updateWorkout = useUpdateWorkout();
  const deleteWorkout = useDeleteWorkout();

  const workout = workoutQuery.data;
  const subscription = subscriptionQuery.data;
  const isCheckingEligibility = subscriptionQuery.isPending;
  const precheckErrorCode = getPrecheckErrorCode(subscription);
  const reserveLabel =
    isCheckingEligibility
      ? "Checking eligibility..."
      : workout?.member_booking_status === "confirmed"
      ? "Already booked"
      : workout?.member_booking_status === "waitlisted"
        ? "Already on the waitlist"
        : (workout?.available_spots ?? 0) > 0
          ? "Reserve class"
          : "Join waitlist";
  const bookingErrorCode = getApiErrorCode(bookingMutation.error);
  const bookingErrorMessage =
    bookingMutation.error && !getBookingEligibilityModalContent(bookingErrorCode)
      ? getApiErrorMessage(bookingMutation.error)
      : null;

  function openEligibilityModal(errorCode: string | undefined) {
    const content = getBookingEligibilityModalContent(errorCode);

    if (content) {
      setEligibilityModal(content);
    }
  }

  if (!workout && workoutQuery.isSuccess) {
    return (
      <EmptyState
        eyebrow="Not found"
        title="This class no longer exists"
        description="The route is wired correctly, but the backend did not return a matching class for the provided id."
      />
    );
  }

  if (!workout) {
    return null;
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
      <section className="glass-panel rounded-[2.25rem] p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[var(--accent)]">Class detail</p>
        <h1 className="section-title mt-4 text-4xl font-semibold">{workout.name}</h1>
        <p className="mt-4 text-base leading-8 text-[var(--muted)]">
          {workout.description ??
            "This class is rendered from the backend schedule with live availability, waitlist, and booking status information."}
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <div className="rounded-[1.75rem] bg-white/80 p-5">
            <p className="text-sm font-semibold text-[var(--ink)]">Schedule</p>
            <p className="mt-2 text-sm text-[var(--muted)]">{formatWorkoutSchedule(workout.scheduled_at)}</p>
          </div>
          <div className="rounded-[1.75rem] bg-white/80 p-5">
            <p className="text-sm font-semibold text-[var(--ink)]">Location</p>
            <p className="mt-2 text-sm text-[var(--muted)]">{workout.location}</p>
          </div>
          <div className="rounded-[1.75rem] bg-white/80 p-5">
            <p className="text-sm font-semibold text-[var(--ink)]">Availability</p>
            <p className="mt-2 text-sm text-[var(--muted)]">
              {typeof workout.available_spots === "number"
                ? `${workout.available_spots} spot${workout.available_spots === 1 ? "" : "s"} left`
                : `${workout.capacity} total spots`}
            </p>
          </div>
          <div className="rounded-[1.75rem] bg-white/80 p-5">
            <p className="text-sm font-semibold text-[var(--ink)]">Waitlist</p>
            <p className="mt-2 text-sm text-[var(--muted)]">{workout.waitlist_size ?? 0} members waiting</p>
          </div>
          <div className="rounded-[1.75rem] bg-white/80 p-5">
            <p className="text-sm font-semibold text-[var(--ink)]">Duration</p>
            <p className="mt-2 text-sm text-[var(--muted)]">{workout.duration_minutes} minutes</p>
          </div>
          <div className="rounded-[1.75rem] bg-white/80 p-5">
            <p className="text-sm font-semibold text-[var(--ink)]">Your status</p>
            <p className="mt-2 text-sm capitalize text-[var(--muted)]">
              {workout.member_booking_status ?? "not booked"}
            </p>
          </div>
        </div>
      </section>

      <aside className="glass-panel rounded-[2.25rem] p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[var(--accent)]">Reservation flow</p>
        <h2 className="section-title mt-4 text-3xl font-semibold">Reserve your spot</h2>
        <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
          Book instantly when capacity exists, join the waitlist when a class is full, and keep your
          credits aligned with the active subscription on your account.
        </p>

        <div className="mt-6 rounded-[1.5rem] bg-white/80 p-5 text-sm text-[var(--muted)]">
          <p className="font-semibold text-[var(--ink)]">Active subscription</p>
          <p className="mt-2">
            {subscription?.active_plan
              ? subscription.plan_name ?? "Assigned plan"
              : subscription?.error_code === "PLAN_EXPIRED"
                ? "Plan expired"
                : "No subscription assigned"}
          </p>
          <p className="mt-1">
            {subscription?.active_plan
              ? subscription.allows_free_pass
                ? "Unlimited while capacity remains available"
                : formatCredits(subscription.active_credits)
              : "Booking is blocked until your plan is active."}
          </p>
          <p className="mt-1">Period end: {formatDateTime(subscription?.period_end)}</p>
        </div>

        <form
          className="mt-8 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (isCheckingEligibility) {
              return;
            }
            if (precheckErrorCode) {
              openEligibilityModal(precheckErrorCode);
              return;
            }
            bookingMutation.mutate({
              class_id: workout.id,
              member_id: session!.member.id
            }, {
              onError: (error) => {
                openEligibilityModal(getApiErrorCode(error));
              }
            });
          }}
        >
          <button
            className="w-full rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#ff6942] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={
              isCheckingEligibility ||
              bookingMutation.isPending ||
              workout.member_booking_status === "confirmed" ||
              workout.member_booking_status === "waitlisted"
            }
            type="submit"
          >
            {reserveLabel}
          </button>
          {precheckErrorCode ? (
            <p className="text-sm text-[var(--accent)]">
              Booking will stay blocked until your membership access is restored.
            </p>
          ) : null}
        </form>

        {bookingMutation.data ? (
          <div className="mt-4 rounded-2xl bg-[rgba(23,184,156,0.12)] px-4 py-3 text-sm text-[var(--highlight)]">
            {bookingMutation.data.message}
          </div>
        ) : null}

        {bookingErrorMessage ? (
          <div className="mt-4 rounded-2xl bg-[var(--accent-soft)] px-4 py-3 text-sm text-[var(--accent)]">
            {bookingErrorMessage}
          </div>
        ) : null}

        {canManage ? (
          <form
            className="mt-8 space-y-4 border-t border-[rgba(19,34,56,0.08)] pt-8"
            onSubmit={(event) => {
              event.preventDefault();
              const formData = new FormData(event.currentTarget);
              const memberId = getFormValue(formData, "member_id");

              assignMemberMutation.mutate({
                classId: workout.id,
                memberId,
                payload: { member_id: memberId }
              });
              event.currentTarget.reset();
            }}
          >
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[var(--accent)]">
              Manual assignment
            </p>
            <input
              className="w-full rounded-2xl border border-[rgba(19,34,56,0.08)] bg-white px-4 py-3"
              name="member_id"
              placeholder="Member ID"
              required
            />
            <button
              className="w-full rounded-full bg-[var(--ink)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#1f3453] disabled:cursor-not-allowed disabled:opacity-60"
              disabled={assignMemberMutation.isPending}
              type="submit"
            >
              {assignMemberMutation.isPending ? "Assigning..." : "Assign member to class"}
            </button>
            {assignMemberMutation.data ? (
              <div className="rounded-2xl bg-[rgba(23,184,156,0.12)] px-4 py-3 text-sm text-[var(--highlight)]">
                {assignMemberMutation.data.message}
              </div>
            ) : null}
          </form>
        ) : null}

        {canManage ? (
          <form
            className="mt-8 space-y-4 border-t border-[rgba(19,34,56,0.08)] pt-8"
            onSubmit={(event) => {
              event.preventDefault();
              const formData = new FormData(event.currentTarget);

              updateWorkout.mutate({
                workoutId: workout.id,
                payload: {
                  name: getFormValue(formData, "name"),
                  location: getFormValue(formData, "location"),
                  instructor_id: getFormValue(formData, "instructor_id") || null,
                  scheduled_at: new Date(getFormValue(formData, "scheduled_at")).toISOString(),
                  description: getFormValue(formData, "description") || null,
                  duration_minutes: Number(formData.get("duration_minutes") ?? workout.duration_minutes),
                  capacity: Number(formData.get("capacity") ?? workout.capacity),
                  status: getFormValue(formData, "status") as "scheduled" | "cancelled" | "completed"
                }
              });
            }}
          >
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[var(--accent)]">
              Class management
            </p>
            <input className="w-full rounded-2xl border border-[rgba(19,34,56,0.08)] bg-white px-4 py-3" defaultValue={workout.name} name="name" required />
            <input className="w-full rounded-2xl border border-[rgba(19,34,56,0.08)] bg-white px-4 py-3" defaultValue={workout.location} name="location" required />
            <input className="w-full rounded-2xl border border-[rgba(19,34,56,0.08)] bg-white px-4 py-3" defaultValue={workout.instructor_id ?? ""} name="instructor_id" placeholder="Instructor ID" />
            <input className="w-full rounded-2xl border border-[rgba(19,34,56,0.08)] bg-white px-4 py-3" defaultValue={toDateTimeLocalValue(workout.scheduled_at)} name="scheduled_at" required type="datetime-local" />
            <textarea className="min-h-28 w-full rounded-2xl border border-[rgba(19,34,56,0.08)] bg-white px-4 py-3" defaultValue={workout.description ?? ""} name="description" />
            <div className="grid gap-4 md:grid-cols-2">
              <input className="rounded-2xl border border-[rgba(19,34,56,0.08)] bg-white px-4 py-3" defaultValue={workout.duration_minutes} min={15} name="duration_minutes" type="number" />
              <input className="rounded-2xl border border-[rgba(19,34,56,0.08)] bg-white px-4 py-3" defaultValue={workout.capacity} min={1} name="capacity" type="number" />
            </div>
            <select className="w-full rounded-2xl border border-[rgba(19,34,56,0.08)] bg-white px-4 py-3" defaultValue={workout.status} name="status">
              <option value="scheduled">scheduled</option>
              <option value="cancelled">cancelled</option>
              <option value="completed">completed</option>
            </select>
            <div className="flex flex-wrap gap-3">
              <button className="rounded-full bg-[var(--ink)] px-5 py-3 text-sm font-semibold text-white" disabled={updateWorkout.isPending} type="submit">
                {updateWorkout.isPending ? "Saving..." : "Save changes"}
              </button>
              <button
                className="rounded-full border border-[rgba(255,122,89,0.3)] px-5 py-3 text-sm font-semibold text-[var(--accent)]"
                disabled={deleteWorkout.isPending}
                onClick={() => {
                  deleteWorkout.mutate(
                    { workoutId: workout.id },
                    {
                      onSuccess: () => {
                        void navigate("/workouts");
                      }
                    }
                  );
                }}
                type="button"
              >
                Delete class
              </button>
            </div>
          </form>
        ) : null}
      </aside>

      {canManage ? (
        <section className="glass-panel rounded-[2.25rem] p-8 xl:col-span-2">
          <div className="grid gap-6 xl:grid-cols-2">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[var(--accent)]">Roster</p>
              <h2 className="section-title mt-3 text-3xl font-semibold">Confirmed members</h2>
              <div className="mt-6 grid gap-4">
                {(classMembersQuery.data ?? []).map((member) => (
                  <div key={member.booking_id} className="rounded-[1.5rem] bg-white/80 p-5">
                    <p className="text-sm font-semibold text-[var(--ink)]">{member.full_name}</p>
                    <p className="mt-2 text-sm text-[var(--muted)]">{member.email}</p>
                    <p className="mt-1 text-sm text-[var(--muted)]">
                      {member.booking_type} booking
                      {member.credits_consumed ? ` · ${member.credits_consumed} credit used` : ""}
                    </p>
                  </div>
                ))}
                {!classMembersQuery.data?.length ? (
                  <div className="rounded-[1.5rem] bg-white/80 p-5 text-sm text-[var(--muted)]">
                    No members are confirmed for this class yet.
                  </div>
                ) : null}
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[var(--accent)]">Attendance</p>
              <h2 className="section-title mt-3 text-3xl font-semibold">Class attendance snapshot</h2>
              <div className="mt-6 grid gap-4">
                {(classAttendanceQuery.data ?? []).map((record) => (
                  <div key={record.id} className="rounded-[1.5rem] bg-white/80 p-5">
                    <p className="text-sm font-semibold text-[var(--ink)]">{record.member_id}</p>
                    <p className="mt-2 text-sm text-[var(--muted)]">
                      Status: {record.status} · Marked {formatWorkoutSchedule(record.marked_at)}
                    </p>
                  </div>
                ))}
                {!classAttendanceQuery.data?.length ? (
                  <div className="rounded-[1.5rem] bg-white/80 p-5 text-sm text-[var(--muted)]">
                    No attendance has been marked for this class yet.
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <BookingEligibilityModal
        description={eligibilityModal?.description ?? ""}
        onClose={() => setEligibilityModal(null)}
        open={eligibilityModal !== null}
        title={eligibilityModal?.title ?? ""}
      />
    </div>
  );
}
