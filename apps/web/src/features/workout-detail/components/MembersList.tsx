import type { ClassMember } from "@gym/api-client";

import { CardInset } from "@/components/ui/Card";

interface Props {
  members: ClassMember[];
}

export function MembersList({ members }: Props) {
  if (!members.length) {
    return (
      <CardInset>
        <p className="text-sm text-[var(--text-secondary)]">
        Aún no hay miembros confirmados para esta clase.
        </p>
      </CardInset>
    );
  }

  return (
    <div className="grid gap-4">
      {members.map((member) => (
        <CardInset key={member.booking_id}>
          <p className="text-sm font-semibold text-[var(--text-primary)]">{member.full_name}</p>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">{member.email}</p>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            reserva de {member.booking_type}
            {member.credits_consumed
              ? ` · ${member.credits_consumed} ${member.credits_consumed === 1 ? "crédito usado" : "créditos usados"}`
              : ""}
          </p>
        </CardInset>
      ))}
    </div>
  );
}
