import { useState, type FormEvent } from "react";
import { Link, Navigate } from "react-router-dom";

import { Button } from "@/components/ui/Button";
import { useAuth } from "@/hooks/use-auth";
import { useCreateMember, useMembers } from "@/hooks/use-workouts";
import { canManageOperations } from "@/lib/roles";

type MemberRole = "member" | "instructor" | "admin";
type MembershipStatus = "active" | "inactive" | "cancelled";

export function MembersPage() {
  const { session } = useAuth();
  const [filters, setFilters] = useState({
    role: "" as "" | MemberRole,
    membership_status: "" as "" | MembershipStatus,
    offset: 0,
    limit: 24
  });
  const membersQuery = useMembers({
    role: filters.role || null,
    membership_status: filters.membership_status || null,
    offset: filters.offset,
    limit: filters.limit
  });
  const createMember = useCreateMember();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [formState, setFormState] = useState({
    email: "",
    password: "",
    full_name: "",
    phone: "",
    birth_date: "",
    emergency_contact: "",
    notes: "",
    role: "member" as MemberRole,
    membership_status: "active" as MembershipStatus,
    is_active: true,
    membership_plan_id: "",
    instructor_bio: "",
    instructor_specialties: ""
  });

  if (!session || !canManageOperations(session.member)) {
    return <Navigate to="/dashboard" replace />;
  }

  const members = membersQuery.data ?? [];

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

    try {
      await createMember.mutateAsync({
        email: formState.email,
        password: formState.password,
        full_name: formState.full_name,
        phone: formState.phone || null,
        birth_date: formState.birth_date || null,
        emergency_contact: formState.emergency_contact || null,
        notes: formState.notes || null,
        role: formState.role,
        membership_status: formState.membership_status,
        is_active: formState.is_active,
        membership_plan_id: formState.membership_plan_id || null,
        instructor_bio: formState.instructor_bio || null,
        instructor_specialties: formState.instructor_specialties || null
      });

      setFormState({
        email: "",
        password: "",
        full_name: "",
        phone: "",
        birth_date: "",
        emergency_contact: "",
        notes: "",
        role: "member",
        membership_status: "active",
        is_active: true,
        membership_plan_id: "",
        instructor_bio: "",
        instructor_specialties: ""
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not create the member.");
    }
  }

  return (
    <div className="space-y-10">
      <header>
        <h1 className="section-title text-4xl font-extrabold text-[var(--ink-900)] tracking-tight">Members</h1>
        <p className="mt-2 text-base font-medium text-[var(--ink-500)]">
          Manage your athlete community, instructor staff, and administrative accounts.
        </p>
      </header>

      <section className="grid gap-8 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="apple-card p-8">
          <div>
            <h2 className="text-xl font-bold text-[var(--ink-900)]">Current Directory</h2>
            <p className="mt-1 text-sm font-medium text-[var(--ink-500)]">
              Real-time member tracking and status overview.
            </p>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--ink-500)]">Role</span>
              <select
                value={filters.role}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    role: event.target.value as "" | MemberRole
                  }))
                }
                className="w-full rounded-xl border border-[var(--surface-outline)] bg-[var(--bg-main)] px-4 py-3 text-sm font-medium outline-none transition focus:border-[var(--primary)]"
              >
                <option value="">All roles</option>
                <option value="member">Member</option>
                <option value="instructor">Instructor</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--ink-500)]">Status</span>
              <select
                value={filters.membership_status}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    membership_status: event.target.value as "" | MembershipStatus
                  }))
                }
                className="w-full rounded-xl border border-[var(--surface-outline)] bg-[var(--bg-main)] px-4 py-3 text-sm font-medium outline-none transition focus:border-[var(--primary)]"
              >
                <option value="">All statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          <div className="mt-8 space-y-3">
            {membersQuery.isLoading ? (
              <div className="rounded-2xl border border-dashed border-[var(--ink-300)] px-4 py-10 text-center text-sm font-medium text-[var(--ink-500)]">
                Fetching member data...
              </div>
            ) : members.length > 0 ? (
              members.map((member) => (
                <Link
                  key={member.id}
                  to={`/members/${member.id}`}
                  className="flex items-center justify-between p-4 rounded-xl border border-[var(--surface-outline)] hover:bg-[var(--ink-100)] transition-colors group"
                >
                  <div>
                    <p className="text-base font-bold text-[var(--ink-900)]">{member.full_name}</p>
                    <p className="text-sm font-medium text-[var(--ink-500)]">{member.email}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="rounded-lg bg-[var(--bg-main)] px-3 py-1 text-xs font-bold uppercase tracking-wider text-[var(--ink-700)]">
                      {member.role}
                    </span>
                    <span className="h-2 w-2 rounded-full bg-green-500" />
                  </div>
                </Link>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-[var(--ink-300)] px-4 py-10 text-center text-sm font-medium text-[var(--ink-500)]">
                No members found match these filters.
              </div>
            )}
          </div>
        </div>

        <section className="apple-card p-8">
          <div>
            <h2 className="text-xl font-bold text-[var(--ink-900)]">New Profile</h2>
            <p className="mt-1 text-sm font-medium text-[var(--ink-500)]">
              Create a new account for a member, instructor, or administrator.
            </p>
          </div>

          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--ink-500)]">Full name</span>
              <input
                required
                value={formState.full_name}
                onChange={(event) =>
                  setFormState((current) => ({ ...current, full_name: event.target.value }))
                }
                className="w-full rounded-xl border border-[var(--surface-outline)] bg-[var(--bg-main)] px-4 py-3 text-sm font-medium outline-none transition focus:border-[var(--primary)]"
              />
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--ink-500)]">Email</span>
                <input
                  required
                  type="email"
                  value={formState.email}
                  onChange={(event) =>
                    setFormState((current) => ({ ...current, email: event.target.value }))
                  }
                  className="w-full rounded-xl border border-[var(--surface-outline)] bg-[var(--bg-main)] px-4 py-3 text-sm font-medium outline-none transition focus:border-[var(--primary)]"
                />
              </div>

              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--ink-500)]">Password</span>
                <input
                  required
                  minLength={8}
                  type="password"
                  value={formState.password}
                  onChange={(event) =>
                    setFormState((current) => ({ ...current, password: event.target.value }))
                  }
                  className="w-full rounded-xl border border-[var(--surface-outline)] bg-[var(--bg-main)] px-4 py-3 text-sm font-medium outline-none transition focus:border-[var(--primary)]"
                />
              </div>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--ink-500)]">Role</span>
                <select
                  value={formState.role}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      role: event.target.value as MemberRole
                    }))
                  }
                  className="w-full rounded-xl border border-[var(--surface-outline)] bg-[var(--bg-main)] px-4 py-3 text-sm font-medium outline-none transition focus:border-[var(--primary)]"
                >
                  <option value="member">Member</option>
                  <option value="instructor">Instructor</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--ink-500)]">Membership status</span>
                <select
                  value={formState.membership_status}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      membership_status: event.target.value as MembershipStatus
                    }))
                  }
                  className="w-full rounded-xl border border-[var(--surface-outline)] bg-[var(--bg-main)] px-4 py-3 text-sm font-medium outline-none transition focus:border-[var(--primary)]"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            {errorMessage ? (
              <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
                {errorMessage}
              </p>
            ) : null}

            <Button className="w-full h-12" disabled={createMember.isPending} loading={createMember.isPending} type="submit" variant="primary">
              {createMember.isPending ? "Creating account..." : "Create member"}
            </Button>
          </form>
        </section>
      </section>
    </div>
  );
}
