function toValidDate(value: string | Date | null | undefined) {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDateValue(date: Date) {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();

  return `${day}/${month}/${year}`;
}

function formatTimeValue(date: Date) {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${hours}:${minutes}`;
}

export function formatWorkoutSchedule(value: string | null | undefined) {
  const date = toValidDate(value);
  if (!date) return "N/A";

  return `${formatDateValue(date)} ${formatTimeValue(date)}`;
}

export function formatDateTime(value: string | null | undefined) {
  const date = toValidDate(value);
  if (!date) {
    return "N/A";
  }

  return `${formatDateValue(date)} ${formatTimeValue(date)}`;
}

export function formatRelativeSlot(value: string) {
  const date = toValidDate(value);
  if (!date) {
    return "N/A";
  }

  const today = new Date();
  const sameDay = date.toDateString() === today.toDateString();

  if (sameDay) {
    return `Today at ${formatTimeValue(date)}`;
  }

  return formatWorkoutSchedule(value);
}

export function toDateTimeLocalValue(value: string) {
  const date = new Date(value);
  const pad = (input: number) => String(input).padStart(2, "0");

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

export function formatDistanceMeters(value: number | null | undefined) {
  if (!value) {
    return "N/A";
  }

  return `${(value / 1000).toFixed(1)} km`;
}

export function formatCredits(value: number | null | undefined) {
  if (value == null) {
    return "No subscription";
  }

  return `${value} credit${value === 1 ? "" : "s"}`;
}

export function formatPlanPeriod(periodType: "weekly" | "monthly" | null | undefined) {
  if (periodType === "weekly") {
    return "Weekly";
  }
  if (periodType === "monthly") {
    return "Monthly";
  }
  return "Not set";
}

export function formatDate(value: string | Date | null | undefined) {
  const date = toValidDate(value);
  if (!date) {
    return "N/A";
  }

  return formatDateValue(date);
}
