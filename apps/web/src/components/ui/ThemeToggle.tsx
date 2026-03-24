import { Sun, Moon, Laptop } from "lucide-react";
import { useTheme } from "@/providers/use-theme";

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();

  const toggleTheme = () => {
    if (theme === "light") setTheme("dark");
    else if (theme === "dark") setTheme("system");
    else setTheme("light");
  };

  const Icon = theme === "system" ? Laptop : resolvedTheme === "dark" ? Moon : Sun;

  return (
    <button
      onClick={toggleTheme}
      title={`Theme: ${theme} (Click to toggle)`}
      className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--bg-surface-secondary)] text-[var(--text-secondary)] transition-all hover:bg-[var(--accent-soft)] hover:text-[var(--accent)] hover:scale-105 active:scale-95 border border-[var(--border-base)]"
      aria-label="Toggle theme"
    >
      <Icon className="h-5 w-5" />
    </button>
  );
}
