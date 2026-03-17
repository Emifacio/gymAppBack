import { LayoutDashboard, Calendar, BookCheck, Puzzle, CreditCard, Users, History, LogOut, Sparkles, User } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";

import { useAuth } from "@/hooks/use-auth";
import { canManageOperations, canManagePlans } from "@/lib/roles";

function linkClassName(isActive: boolean) {
  return isActive
    ? "flex items-center gap-3 rounded-xl bg-[var(--accent-soft)] px-4 py-3 text-sm font-semibold text-[var(--primary)]"
    : "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-[var(--ink-700)] transition-all hover:bg-[var(--ink-100)] hover:text-[var(--ink-900)]";
}

function RoleBadge({ role }: { role: string | undefined }) {
  if (!role) return null;
  const styles = {
    admin: "bg-purple-100 text-purple-700 border-purple-200",
    instructor: "bg-blue-100 text-blue-700 border-blue-200",
    member: "bg-gray-100 text-gray-700 border-gray-200",
  }[role] || "bg-gray-100 text-gray-700 border-gray-200";

  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${styles} uppercase tracking-wider`}>
      {role}
    </span>
  );
}

export function DashboardLayout() {
  const { logout, session } = useAuth();
  const navigation = [
    { label: "Panel", to: "/", icon: LayoutDashboard },
    { label: "Mi Perfil", to: "/profile", icon: User },
    { label: "Clases", to: "/workouts", icon: Calendar },
    { label: "Reservas", to: "/bookings", icon: BookCheck },
    { label: "Integraciones", to: "/integrations", icon: Puzzle },
    ...(canManagePlans(session?.member) ? [{ label: "Planes", to: "/plans", icon: CreditCard }] : []),
    ...(canManageOperations(session?.member)
      ? [
          { label: "Miembros", to: "/members", icon: Users },
          { label: "Asistencia", to: "/attendance", icon: History }
        ]
      : [])
  ];

  return (
    <div className="flex min-h-screen bg-[var(--bg-main)]">
      {/* Mobile Header (Hidden on LG) */}
      <header className="fixed top-0 left-0 right-0 z-40 flex h-16 items-center justify-between border-b border-[var(--surface-outline)] bg-[var(--bg-sidebar)/80] px-4 backdrop-blur-md lg:hidden">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--primary)] text-white">
            <Sparkles className="h-5 w-5" />
          </div>
          <span className="text-lg font-bold tracking-tight text-[var(--ink-900)]">Gimnasio</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-[#FF3B30] hover:bg-red-100 transition-colors"
            onClick={() => {
              void logout();
            }}
            type="button"
            title="Cerrar sesión"
          >
            <LogOut className="h-5 w-5" />
          </button>
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-bold text-[var(--ink-900)] line-clamp-1">{session?.member.full_name}</span>
            <RoleBadge role={session?.member.role} />
          </div>
          <div className="h-8 w-8 rounded-full bg-[var(--ink-100)] flex items-center justify-center shrink-0">
            <span className="text-[10px] font-bold text-[var(--ink-700)]">
              {session?.member.full_name?.split(" ").map(n => n[0]).join("")}
            </span>
          </div>
        </div>
      </header>

      {/* Sidebar navigation (Hidden on Mobile, Visible on Desktop) */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-[var(--surface-outline)] bg-[var(--bg-sidebar)] px-6 py-8 lg:flex flex-col">
        <div className="flex items-center gap-2 px-2 mb-10">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary)] text-white text-lg font-bold">
            {session?.member.full_name?.[0]}
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold tracking-tight text-[var(--ink-900)] truncate w-32">{session?.member.full_name}</span>
            <div className="mt-0.5">
              <RoleBadge role={session?.member.role} />
            </div>
          </div>
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
          <button
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-[#FF3B30] transition-colors hover:bg-red-50"
            onClick={() => {
              void logout();
            }}
            type="button"
          >
            <LogOut className="h-5 w-5" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Main content area */}
      <main className="flex-1 lg:ml-64">
        <div className="mx-auto max-w-6xl px-[var(--container-px)] pb-32 pt-24 lg:py-10">
          <Outlet />
        </div>
      </main>

      {/* Bottom Navigation (Mobile Only) */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 flex h-20 items-center justify-around border-t border-[var(--surface-outline)] bg-[var(--bg-sidebar)/90] px-2 pb-6 backdrop-blur-lg lg:hidden">
        {navigation.slice(0, canManageOperations(session?.member) ? 6 : 4).map((item) => (
          <NavLink
            key={item.to}
            className={({ isActive }) => 
              `flex flex-col items-center gap-1 px-1 py-1 transition-colors ${
                isActive ? "text-[var(--primary)]" : "text-[var(--ink-500)]"
              }`
            }
            to={item.to}
          >
            <item.icon className="h-5 w-5" />
            <span className="text-[8px] font-bold uppercase tracking-wider text-center">{item.label}</span>
          </NavLink>
        ))}
      </nav>

    </div>
  );
}
