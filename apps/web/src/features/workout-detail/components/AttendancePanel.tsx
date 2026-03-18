import type { AttendanceRecord } from "@gym/api-client";
import { formatWorkoutSchedule } from "@/lib/format";

interface Props {
  attendance: AttendanceRecord[];
}

export function AttendancePanel({ attendance }: Props) {
  if (!attendance.length) {
    return (
      <div className="rounded-[1.5rem] bg-white/80 p-5 text-sm text-[var(--muted)]">
        Aún no se ha marcado asistencia para esta clase.
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {attendance.map((record) => (
        <div key={record.id} className="rounded-[1.5rem] bg-white/80 p-5">
          <p className="text-sm font-semibold text-[var(--ink)]">{record.member_id}</p>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Estado: {record.status === "present" ? "presente" : record.status === "absent" ? "ausente" : record.status} · Marcado el {formatWorkoutSchedule(record.marked_at)}
          </p>
        </div>
      ))}
    </div>
  );
}
