import { LogOut, Sparkles } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";

import { useAuth } from "@/hooks/use-auth";
import { canManageOperations, canManagePlans } from "@/lib/roles";

function linkClassName(isActive: boolean) {
  return isActive
    ? "rounded-full bg-[var(--ink)] px-4 py-2 text-sm font-semibold text-white"
    : "rounded-full px-4 py-2 text-sm font-semibold text-[var(--muted)] transition hover:bg-white/70 hover:text-[var(--ink)]";
}

export function DashboardLayout() {
  const { logout, session } = useAuth();
  const navigation = [
    { label: "Dashboard", to: "/" },
    { label: "Classes", to: "/workouts" },
    { label: "Reservations", to: "/bookings" },
    { label: "Integrations", to: "/integrations" },
    ...(canManagePlans(session?.member) ? [{ label: "Plans", to: "/plans" }] : []),
    ...(canManageOperations(session?.member)
      ? [
          { label: "Members", to: "/members" },
          { label: "Attendance", to: "/attendance" }
        ]
      : [])
  ];

  return (
    <div className="page-shell min-h-screen px-4 py-4 md:px-8 md:py-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="glass-panel flex flex-col gap-5 rounded-[2rem] px-6 py-5 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-[var(--accent-soft)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-[var(--accent)]">
              <Sparkles className="h-3.5 w-3.5" />
              Contract-first fitness ops
            </div>
            <h1 className="section-title mt-4 text-3xl font-semibold md:text-4xl">Gym Platform</h1>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Welcome back, {session?.member.full_name}. Your web and mobile clients are sharing the same
              typed backend contract.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <nav className="flex flex-wrap items-center gap-2 rounded-full bg-[rgba(255,255,255,0.7)] p-2">
              {navigation.map((item) => (
                <NavLink key={item.to} className={({ isActive }) => linkClassName(isActive)} to={item.to}>
                  {item.label}
                </NavLink>
              ))}
            </nav>
            <button
              className="inline-flex items-center gap-2 rounded-full border border-[rgba(19,34,56,0.08)] bg-white px-4 py-3 text-sm font-semibold text-[var(--ink)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
              onClick={() => {
                void logout();
              }}
              type="button"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        </header>

        <main>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
