import type { AttendanceRecord } from "@gym/api-client";

import { CardInset } from "@/components/ui/Card";
import { formatWorkoutSchedule } from "@/lib/format";

interface Props {
  attendance: AttendanceRecord[];
}

export function AttendancePanel({ attendance }: Props) {
  if (!attendance.length) {
    return (
      <CardInset>
        <p className="text-sm text-[var(--text-secondary)]">
        Aún no se ha marcado asistencia para esta clase.
        </p>
      </CardInset>
    );
  }

  return (
    <div className="grid gap-4">
      {attendance.map((record) => (
        <CardInset key={record.id}>
          <p className="text-sm font-semibold text-[var(--text-primary)]">{record.member_id}</p>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Estado: {record.status === "present" ? "presente" : record.status === "absent" ? "ausente" : record.status} · Marcado el {formatWorkoutSchedule(record.marked_at)}
          </p>
        </CardInset>
      ))}
    </div>
  );
}
