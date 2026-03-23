import { ChevronRight, GraduationCap, Mail, ShieldCheck, UserRound } from "lucide-react";
import { Link } from "react-router-dom";
import type { LucideIcon } from "lucide-react";

import type { Member } from "@gym/api-client";
import { Badge } from "@/components/ui/Badge";

interface MemberCardProps {
  member: Member;
}

const roleConfig: Record<
  Member["role"],
  { label: string; icon: LucideIcon; tone: "accent" | "neutral" | "warning" }
> = {
  admin: {
    label: "Administrador",
    icon: ShieldCheck,
    tone: "accent"
  },
  instructor: {
    label: "Instructor",
    icon: GraduationCap,
    tone: "warning"
  },
  member: {
    label: "Miembro",
    icon: UserRound,
    tone: "neutral"
  }
};

const membershipStatusConfig: Record<
  Member["membership_status"],
  { label: string; tone: "success" | "warning" | "danger" }
> = {
  active: {
    label: "Membresia activa",
    tone: "success"
  },
  cancelled: {
    label: "Membresia cancelada",
    tone: "danger"
  },
  inactive: {
    label: "Membresia inactiva",
    tone: "warning"
  },
  suspended: {
    label: "Membresia suspendida",
    tone: "danger"
  }
};

function getInitials(fullName: string) {
  const tokens = fullName
    .split(" ")
    .map((token) => token.trim())
    .filter(Boolean)
    .slice(0, 2);

  if (tokens.length === 0) {
    return "GM";
  }

  return tokens.map((token) => token[0]?.toUpperCase() ?? "").join("");
}

export function MemberCard({ member }: MemberCardProps) {
  const role = roleConfig[member.role];
  const RoleIcon = role.icon;
  const membershipStatus = membershipStatusConfig[member.membership_status];

  return (
    <Link
      className="apple-card group relative flex h-full flex-col gap-5 overflow-hidden border border-[var(--border-base)] bg-[var(--bg-surface)] p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-[var(--accent-soft)]/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-soft)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-main)]"
      to={`/members/${member.id}`}
    >
      <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-[var(--accent)] opacity-[0.06] blur-2xl transition-opacity duration-300 group-hover:opacity-[0.14]" />

      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-[var(--border-base)] bg-[var(--bg-surface-secondary)] text-sm font-black uppercase tracking-[0.2em] text-[var(--accent)] shadow-inner">
            {getInitials(member.full_name)}
          </div>
          <div className="space-y-1">
            <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[var(--text-muted)]">
              Perfil
            </p>
            <h3 className="section-title text-[var(--font-size-lg)] leading-tight text-[var(--text-primary)]">
              {member.full_name}
            </h3>
          </div>
        </div>

        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[var(--border-base)] bg-[var(--bg-surface-secondary)] text-[var(--text-secondary)] transition-all duration-300 group-hover:border-[var(--accent-soft)] group-hover:bg-[var(--accent-soft)] group-hover:text-[var(--accent)]">
          <ChevronRight className="h-4.5 w-4.5" />
        </div>
      </div>

      <div className="flex items-center gap-2.5 text-sm font-medium text-[var(--text-secondary)]">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--bg-surface-secondary)] text-[var(--text-muted)]">
          <Mail className="h-4 w-4" />
        </span>
        <span className="truncate">{member.email}</span>
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge tone={role.tone}>
          <RoleIcon className="h-3.5 w-3.5" />
          {role.label}
        </Badge>
        <Badge tone={membershipStatus.tone}>{membershipStatus.label}</Badge>
      </div>

      <div className="mt-auto flex items-center justify-between gap-3 rounded-2xl border border-[var(--border-base)] bg-[var(--bg-surface-secondary)]/70 px-4 py-3">
        <div className="space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">
            Cuenta
          </p>
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            {member.is_active ? "Activa y operativa" : "Inactiva"}
          </p>
        </div>
        <Badge dot tone={member.is_active ? "success" : "neutral"}>
          {member.is_active ? "Online" : "Offline"}
        </Badge>
      </div>
    </Link>
  );
}
