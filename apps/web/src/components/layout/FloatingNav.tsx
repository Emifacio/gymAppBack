import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from "framer-motion";
import { 
  LayoutDashboard, 
  Calendar, 
  History, 
  Users, 
  User,
  ChevronUp
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  role?: "admin" | "member";
}

const navigation: NavItem[] = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Horario", href: "/workouts", icon: Calendar },
  { name: "Reservas", href: "/bookings", icon: History, role: "member" },
  { name: "Miembros", href: "/members", icon: Users, role: "admin" }
];

export function FloatingNav() {
  const { session } = useAuth();
  const location = useLocation();
  const { scrollY } = useScroll();
  
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  // Filter navigation based on user role
  const filteredNav = navigation.filter((item) => {
    if (!item.role) return true;
    if (item.role === "admin") return session?.member?.role === "admin";
    if (item.role === "member") return session?.member?.role === "member";
    return true;
  });

  // Handle scroll to collapse/expand
  useMotionValueEvent(scrollY, "change", (latest) => {
    const previous = scrollY.getPrevious() ?? 0;
    if (latest > previous && latest > 50) {
      setIsCollapsed(true);
    } else {
      setIsCollapsed(false);
    }
  });

  const activeItem = filteredNav.find(item => location.pathname === item.href) || filteredNav[0];

  return (
    <div className="fixed bottom-6 left-0 right-0 z-50 flex justify-center px-6 lg:hidden pointer-events-none">
      <motion.nav
        initial={false}
        animate={{
          width: isCollapsed ? "64px" : "auto",
          height: isCollapsed ? "64px" : "72px",
          borderRadius: "32px",
        }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className={cn(
          "pointer-events-auto flex items-center justify-center bg-[var(--bg-surface)]/70 backdrop-blur-2xl border border-[var(--border-base)] shadow-[0_20px_50px_rgba(0,0,0,0.3)] ring-1 ring-white/10",
          isCollapsed ? "px-0" : "px-2"
        )}
      >
        <AnimatePresence mode="wait">
          {isCollapsed ? (
            <motion.button
              key="collapsed"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              onClick={() => setIsCollapsed(false)}
              className="relative flex h-full w-full items-center justify-center text-[var(--accent)]"
            >
              {activeItem && <activeItem.icon className="h-6 w-6" />}
              <div className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--accent)] text-[8px] text-white">
                <ChevronUp className="h-3 w-3" />
              </div>
            </motion.button>
          ) : (
            <motion.div
              key="expanded"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="flex items-center gap-1"
            >
              {filteredNav.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={cn(
                      "relative flex h-14 min-w-[64px] flex-col items-center justify-center rounded-2xl transition-all duration-300",
                      isActive ? "text-[var(--accent)]" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    )}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="active-pill"
                        className="absolute inset-x-2 inset-y-2 rounded-xl bg-[var(--accent-soft)]"
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      />
                    )}
                    <item.icon className={cn("relative z-10 h-5 w-5 mb-0.5 transition-transform duration-300", isActive && "scale-110")} />
                    <span className="relative z-10 text-[10px] font-bold uppercase tracking-tighter transition-all duration-300">
                      {item.name}
                    </span>
                  </Link>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>
    </div>
  );
}
