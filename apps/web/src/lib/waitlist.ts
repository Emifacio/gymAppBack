import type { WaitlistEntry, Workout } from "@gym/api-client";

const INACTIVE_WAITLIST_CLASS_STATUSES = new Set<Workout["status"]>(["cancelled", "completed"]);

function getClassEndTime(gymClass: Pick<Workout, "scheduled_at" | "duration_minutes"> | null) {
  if (!gymClass?.scheduled_at) {
    return null;
  }

  const scheduledAt = new Date(gymClass.scheduled_at);
  if (Number.isNaN(scheduledAt.getTime())) {
    return null;
  }

  const durationMinutes =
    typeof gymClass.duration_minutes === "number" && gymClass.duration_minutes > 0
      ? gymClass.duration_minutes
      : 60;

  return new Date(scheduledAt.getTime() + durationMinutes * 60 * 1000);
}

export function isActionableWaitlistEntry(entry: WaitlistEntry, referenceTime: Date = new Date()) {
  if (entry.status !== "waiting") {
    return false;
  }

  const gymClass = entry.gym_class;
  if (!gymClass) {
    return false;
  }

  if (INACTIVE_WAITLIST_CLASS_STATUSES.has(gymClass.status)) {
    return false;
  }

  const classEndTime = getClassEndTime(gymClass);
  if (!classEndTime) {
    return false;
  }

  return classEndTime.getTime() > referenceTime.getTime();
}

export function filterActionableWaitlistEntries(
  entries: WaitlistEntry[],
  referenceTime: Date = new Date()
) {
  return entries.filter((entry) => isActionableWaitlistEntry(entry, referenceTime));
}
