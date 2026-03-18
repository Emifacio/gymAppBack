import type { ClassMember } from "@gym/api-client";

interface Props {
  members: ClassMember[];
}

export function MembersList({ members }: Props) {
  if (!members.length) {
    return (
      <div className="rounded-[1.5rem] bg-white/80 p-5 text-sm text-[var(--muted)]">
        Aún no hay miembros confirmados para esta clase.
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {members.map((member) => (
        <div key={member.booking_id} className="rounded-[1.5rem] bg-white/80 p-5">
          <p className="text-sm font-semibold text-[var(--ink)]">{member.full_name}</p>
          <p className="mt-2 text-sm text-[var(--muted)]">{member.email}</p>
          <p className="mt-1 text-sm text-[var(--muted)]">
            reserva de {member.booking_type}
            {member.credits_consumed
              ? ` · ${member.credits_consumed} ${member.credits_consumed === 1 ? "crédito usado" : "créditos usados"}`
              : ""}
          </p>
        </div>
      ))}
    </div>
  );
}
