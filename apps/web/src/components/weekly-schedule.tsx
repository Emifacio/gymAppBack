import { useMemo } from "react";
import type { components } from "@gym/api-client";
import { Link } from "react-router-dom";

type ClassRead = components["schemas"]["ClassRead"];

interface WeeklyScheduleProps {
  classes: ClassRead[];
}

const DAYS = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];

export function WeeklySchedule({ classes }: WeeklyScheduleProps) {
  const groupedClasses = useMemo(() => {
    const groups: Record<number, ClassRead[]> = {
      0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: []
    };

    classes.forEach((c) => {
      const date = new Date(c.scheduled_at);
      const day = date.getDay();
      if (!groups[day]) {
        groups[day] = [];
      }
      groups[day].push(c);
    });

    Object.keys(groups).forEach((key) => {
      const dayIndex = Number(key);
      const list = groups[dayIndex];
      if (list) {
        list.sort((a, b) => 
          new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
        );
      }
    });

    return groups;
  }, [classes]);

  const orderedDayIndices = [1, 2, 3, 4, 5, 6, 0]; // Mon-Sun

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="apple-card overflow-hidden my-8 p-0 bg-[var(--bg-surface)] border border-[var(--border-base)] shadow-xl transition-colors duration-300">
      <div className="grid grid-cols-1 md:grid-cols-7 border-b border-[var(--border-base)] bg-[var(--bg-surface-secondary)]/50">
        {orderedDayIndices.map((dayIndex) => (
          <div
            key={dayIndex}
            className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] text-center border-r border-[var(--border-base)] last:border-0 hidden md:block"
          >
            {DAYS[dayIndex]}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-7 divide-y md:divide-y-0 md:divide-x divide-[var(--border-base)]">
        {orderedDayIndices.map((dayIndex) => {
          const dayClasses = groupedClasses[dayIndex] || [];
          return (
            <div key={dayIndex} className="p-3 min-h-[120px] space-y-3">
              <div className="md:hidden font-bold text-xs uppercase text-[var(--accent)] mb-2">
                {DAYS[dayIndex]}
              </div>
              {dayClasses.length === 0 ? (
                <div className="text-[10px] text-[var(--text-muted)] italic py-2 text-center opacity-60">
                  Sin clases
                </div>
              ) : (
                dayClasses.map((c) => (
                  <Link
                    key={c.id}
                    to={`/workouts/${c.id}`}
                    className="block p-3 rounded-xl bg-[var(--bg-surface-secondary)] border border-[var(--border-base)] hover:border-[var(--accent)] transition-all group shadow-sm hover:shadow-md"
                  >
                    <div className="text-[10px] font-bold text-[var(--accent)]">
                      {formatTime(c.scheduled_at)}
                    </div>
                    <div className="text-xs font-bold text-[var(--text-primary)] line-clamp-1 group-hover:text-[var(--accent)] transition-colors">
                      {c.name}
                    </div>
                    <div className="text-[10px] text-[var(--text-muted)] mt-1 truncate">
                      {c.location}
                    </div>
                  </Link>
                ))
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
