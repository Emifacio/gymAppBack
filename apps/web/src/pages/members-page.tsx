import { useState, type FormEvent } from "react";
import { Link, Navigate } from "react-router-dom";

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
    <div className="space-y-8">
      <section className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-amber-700">
              Members
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-900">Gym roster</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Review everyone in the gym, open their history, and create staff or member
              accounts from one place.
            </p>
          </div>
          <div className="rounded-2xl bg-slate-900 px-4 py-3 text-sm text-white">
            {members.length} visible profiles
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Current members</h2>
            <p className="mt-1 text-sm text-slate-500">
              Filter the roster by role, membership state, and pagination controls.
            </p>
          </div>

          <div className="mt-6 grid gap-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 md:grid-cols-2">
            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700">Role filter</span>
              <select
                value={filters.role}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    role: event.target.value as "" | MemberRole
                  }))
                }
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-900"
              >
                <option value="">All roles</option>
                <option value="member">Member</option>
                <option value="instructor">Instructor</option>
                <option value="admin">Admin</option>
              </select>
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700">Membership status</span>
              <select
                value={filters.membership_status}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    membership_status: event.target.value as "" | MembershipStatus
                  }))
                }
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-900"
              >
                <option value="">All statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700">Offset</span>
              <input
                min={0}
                type="number"
                value={filters.offset}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    offset: Number(event.target.value || 0)
                  }))
                }
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-900"
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700">Limit</span>
              <input
                min={1}
                type="number"
                value={filters.limit}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    limit: Number(event.target.value || 1)
                  }))
                }
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-900"
              />
            </label>
          </div>

          <div className="mt-6 space-y-3">
            {membersQuery.isLoading ? (
              <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-500">
                Loading members...
              </div>
            ) : members.length > 0 ? (
              members.map((member) => (
                <Link
                  key={member.id}
                  to={`/members/${member.id}`}
                  className="flex flex-col gap-3 rounded-2xl border border-slate-200 px-4 py-4 transition hover:-translate-y-0.5 hover:border-slate-900 hover:shadow-sm sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="text-base font-semibold text-slate-900">{member.full_name}</p>
                    <p className="text-sm text-slate-500">{member.email}</p>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="rounded-full bg-amber-100 px-3 py-1 font-medium capitalize text-amber-800">
                      {member.role}
                    </span>
                    <span className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-600">
                      {member.membership_status}
                    </span>
                  </div>
                </Link>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-500">
                No members found for the selected filters.
              </div>
            )}
          </div>
        </div>

        <section className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-amber-700">
              Create account
            </p>
            <h2 className="mt-2 text-xl font-semibold text-slate-900">Add a new person</h2>
            <p className="mt-1 text-sm text-slate-500">
              This form now exposes every optional member creation field in the current schema.
            </p>
          </div>

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700">Full name</span>
              <input
                required
                value={formState.full_name}
                onChange={(event) =>
                  setFormState((current) => ({ ...current, full_name: event.target.value }))
                }
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-900"
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700">Email</span>
              <input
                required
                type="email"
                value={formState.email}
                onChange={(event) =>
                  setFormState((current) => ({ ...current, email: event.target.value }))
                }
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-900"
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700">Password</span>
              <input
                required
                minLength={8}
                type="password"
                value={formState.password}
                onChange={(event) =>
                  setFormState((current) => ({ ...current, password: event.target.value }))
                }
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-900"
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-700">Role</span>
                <select
                  value={formState.role}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      role: event.target.value as MemberRole
                    }))
                  }
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-900"
                >
                  <option value="member">Member</option>
                  <option value="instructor">Instructor</option>
                  <option value="admin">Admin</option>
                </select>
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-700">Membership status</span>
                <select
                  value={formState.membership_status}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      membership_status: event.target.value as MembershipStatus
                    }))
                  }
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-900"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-700">Phone</span>
                <input
                  value={formState.phone}
                  onChange={(event) =>
                    setFormState((current) => ({ ...current, phone: event.target.value }))
                  }
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-900"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-700">Birth date</span>
                <input
                  type="date"
                  value={formState.birth_date}
                  onChange={(event) =>
                    setFormState((current) => ({ ...current, birth_date: event.target.value }))
                  }
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-900"
                />
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-700">Membership plan ID</span>
                <input
                  value={formState.membership_plan_id}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      membership_plan_id: event.target.value
                    }))
                  }
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-900"
                />
              </label>

              <label className="flex items-center gap-3 rounded-2xl border border-slate-300 px-4 py-3 text-sm font-medium text-slate-700">
                <input
                  checked={formState.is_active}
                  type="checkbox"
                  onChange={(event) =>
                    setFormState((current) => ({ ...current, is_active: event.target.checked }))
                  }
                />
                Account is active
              </label>
            </div>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700">Emergency contact</span>
              <input
                value={formState.emergency_contact}
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    emergency_contact: event.target.value
                  }))
                }
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-900"
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700">Medical notes</span>
              <textarea
                rows={4}
                value={formState.notes}
                onChange={(event) =>
                  setFormState((current) => ({ ...current, notes: event.target.value }))
                }
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-900"
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700">Instructor bio</span>
              <textarea
                rows={3}
                value={formState.instructor_bio}
                onChange={(event) =>
                  setFormState((current) => ({ ...current, instructor_bio: event.target.value }))
                }
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-900"
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700">Instructor specialties</span>
              <input
                value={formState.instructor_specialties}
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    instructor_specialties: event.target.value
                  }))
                }
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-900"
              />
            </label>

            {errorMessage ? (
              <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {errorMessage}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={createMember.isPending}
              className="w-full rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {createMember.isPending ? "Creating account..." : "Create member"}
            </button>
          </form>
        </section>
      </section>
    </div>
  );
}
