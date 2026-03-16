import { LayoutDashboard, Calendar, BookCheck, Puzzle, CreditCard, Users, History, LogOut, Sparkles } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";

import { useAuth } from "@/hooks/use-auth";
import { canManageOperations, canManagePlans } from "@/lib/roles";

function linkClassName(isActive: boolean) {
  return isActive
    ? "flex items-center gap-3 rounded-xl bg-[var(--accent-soft)] px-4 py-3 text-sm font-semibold text-[var(--primary)]"
    : "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-[var(--ink-700)] transition-all hover:bg-[var(--ink-100)] hover:text-[var(--ink-900)]";
}

export function DashboardLayout() {
  const { logout, session } = useAuth();
  const navigation = [
    { label: "Dashboard", to: "/", icon: LayoutDashboard },
    { label: "Classes", to: "/workouts", icon: Calendar },
    { label: "Reservations", to: "/bookings", icon: BookCheck },
    { label: "Integrations", to: "/integrations", icon: Puzzle },
    ...(canManagePlans(session?.member) ? [{ label: "Plans", to: "/plans", icon: CreditCard }] : []),
    ...(canManageOperations(session?.member)
      ? [
          { label: "Members", to: "/members", icon: Users },
          { label: "Attendance", to: "/attendance", icon: History }
        ]
      : [])
  ];

  return (
    <div className="flex min-h-screen bg-[var(--bg-main)]">
      {/* Sidebar navigation */}
      <aside className="fixed inset-y-0 left-0 w-64 border-r border-[var(--surface-outline)] bg-[var(--bg-sidebar)] px-6 py-8 flex flex-col">
        <div className="flex items-center gap-2 px-2 mb-10">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary)] text-white">
            <Sparkles className="h-6 w-6" />
          </div>
          <span className="text-xl font-bold tracking-tight text-[var(--ink-900)]">Gym Platform</span>
        </div>

        <nav className="flex-1 space-y-1">
          {navigation.map((item) => (
            <NavLink key={item.to} className={({ isActive }) => linkClassName(isActive)} to={item.to}>
              <item.icon className="h-5 w-5" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto border-t border-[var(--surface-outline)] pt-6">
          <div className="px-4 mb-4">
            <p className="text-xs font-semibold text-[var(--ink-500)] uppercase tracking-wider">User</p>
            <p className="text-sm font-medium text-[var(--ink-900)] mt-1 truncate">{session?.member.full_name}</p>
          </div>
          <button
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-[#FF3B30] transition-colors hover:bg-red-50"
            onClick={() => {
              void logout();
            }}
            type="button"
          >
            <LogOut className="h-5 w-5" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main content area */}
      <main className="ml-64 flex-1 px-8 py-10 max-w-6xl mx-auto">
        <Outlet />
      </main>
    </div>
  );
}
