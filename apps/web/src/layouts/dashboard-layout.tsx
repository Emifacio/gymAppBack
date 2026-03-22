import React, { useState } from "react";
import { Link, useLocation, useNavigate, Outlet } from "react-router-dom";
import {
  LayoutDashboard,
  Calendar,
  Users,
  CreditCard,
  History,
  LogOut,
  Menu,
  X,
  User
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Avatar } from "@/components/ui/Avatar";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { FloatingNav } from "@/components/layout/FloatingNav";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Horario", href: "/workouts", icon: Calendar },
  { name: "Mis Reservas", href: "/bookings", icon: History, role: "member" },
  { name: "Miembros", href: "/members", icon: Users, role: "admin" },
  { name: "Planes", href: "/plans", icon: CreditCard, role: "admin" },
  { name: "Asistencia", href: "/attendance", icon: History, role: "admin" }
];

export function DashboardLayout() {
  const { session, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await logout();
    navigate("/login");
  };

  const filteredNavigation = navigation.filter((item) => {
    if (!item.role) return true;
    if (item.role === "admin") return session?.member?.role === "admin";
    if (item.role === "member") return session?.member?.role === "member";
    return true;
  });

  const linkClassName = (href: string) => {
    const isActive = location.pathname === href;
    return `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group ${
      isActive
        ? "bg-[var(--accent-soft)] text-[var(--accent)] shadow-sm"
        : "text-[var(--text-secondary)] hover:bg-[var(--bg-surface-secondary)] hover:text-[var(--text-primary)]"
    }`;
  };

  return (
    <div className="flex min-h-screen bg-[var(--bg-base)] transition-colors duration-500">
      {/* Sidebar Desktop */}
      <aside className="fixed inset-y-0 left-0 hidden w-72 flex-col border-r border-[var(--border-base)] bg-[var(--bg-surface)] lg:flex shadow-sm">
        <div className="flex h-20 items-center px-8">
          <Link to="/" className="text-2xl font-bold tracking-tighter text-[var(--text-primary)] transition-opacity hover:opacity-80">
            ATHL<span className="text-[var(--accent)]">YT</span>
          </Link>
        </div>

        <nav className="flex-1 space-y-1 px-4 py-4">
          {filteredNavigation.map((item) => (
            <Link key={item.name} to={item.href} className={linkClassName(item.href)}>
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          ))}
        </nav>

        <div className="border-t border-[var(--border-base)] p-4 space-y-2">
          <Link
            to="/profile"
            className="flex items-center gap-3 rounded-xl p-3 text-sm font-medium text-[var(--text-secondary)] transition-all hover:bg-[var(--bg-surface-secondary)] hover:text-[var(--text-primary)] group"
          >
            <Avatar member={session?.member} size="sm" className="group-hover:scale-105 transition-transform" />
            <div className="flex flex-col truncate">
              <span className="truncate font-semibold text-[var(--text-primary)]">{session?.member?.full_name}</span>
              <span className="truncate text-xs opacity-70">Ver perfil</span>
            </div>
          </Link>
          
          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-3 rounded-xl p-3 text-sm font-medium text-[var(--danger)] transition-all hover:bg-[var(--danger-soft)] hover:text-[var(--danger)] group"
          >
            <LogOut className="h-5 w-5 group-hover:-translate-x-1 transition-transform" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex flex-1 flex-col lg:pl-72">
        {/* Top Header */}
        <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-[var(--border-base)] bg-[var(--bg-surface)]/80 px-6 backdrop-blur-xl lg:px-10">
          <div className="flex items-center gap-4">
            <button
              onClick={handleSignOut}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--danger-soft)] text-[var(--danger)] hover:bg-[var(--danger)] hover:text-white transition-all lg:hidden"
              title="Cerrar sesión"
            >
              <LogOut className="h-5 w-5" />
            </button>
            <div className="flex flex-col lg:flex-row lg:items-center lg:gap-3">
              {filteredNavigation.find(n => n.href === location.pathname)?.name ? (
                <h2 className="text-sm font-bold text-[var(--text-primary)] lg:font-medium lg:text-[var(--text-muted)]">
                  {filteredNavigation.find(n => n.href === location.pathname)?.name}
                </h2>
              ) : (
                <h1 className="text-xl font-black tracking-tighter text-[var(--text-primary)]">
                  ATHL<span className="text-[var(--accent)]">YT</span>
                </h1>
              )}
              {session?.member?.role && (
                <span className="text-[10px] font-black uppercase tracking-widest text-[var(--accent)] bg-[var(--accent-soft)] px-2 py-0.5 rounded-md lg:hidden w-fit">
                  {session.member.role === "admin" ? "Administrador" : "Miembro"}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Link 
              to="/profile" 
              className="group flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-all duration-300 hover:scale-110 active:scale-90"
            >
              <Avatar 
                member={session?.member} 
                size="md" 
                className="ring-2 ring-[var(--accent)]/10 ring-offset-2 ring-offset-[var(--bg-surface)] transition-all group-hover:ring-[var(--accent)]/30" 
              />
            </Link>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 px-6 py-8 pb-24 lg:px-10 lg:py-12 lg:pb-12">
          <div className="mx-auto max-w-6xl animate-in fade-in slide-in-from-bottom-4 duration-700">
            <Outlet />
          </div>
        </main>
      </div>

      <FloatingNav />
    </div>
  );
}
