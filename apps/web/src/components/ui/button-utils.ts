import clsx from "clsx";
import type { ButtonSize, ButtonVariant } from "./button-types";
import { ButtonMotionTokens } from "./motion-tokens";

interface ButtonClassNameOptions {
  className?: string | undefined;
  size?: ButtonSize;
  variant?: ButtonVariant;
}

const base = `inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors duration-${ButtonMotionTokens.colorTransition} ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50`;

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-base"
};

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-[var(--accent)] text-[var(--text-on-accent)] hover:bg-[var(--accent-hover)] active:scale-95 transition-all shadow-sm",
  secondary: "bg-[var(--bg-surface-secondary)] text-[var(--text-primary)] hover:opacity-80 active:scale-95 transition-all",
  danger: "bg-[var(--danger)] text-[var(--text-on-accent)] hover:opacity-90 active:scale-95 transition-all shadow-sm",
  outline: "border border-[var(--border-strong)] bg-transparent text-[var(--text-primary)] hover:bg-[var(--bg-surface-secondary)] active:scale-95 transition-all",
  ghost: "bg-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-surface-secondary)] active:scale-95 transition-all"
};

export function buttonClassName({ className, size = "md", variant = "primary" }: ButtonClassNameOptions = {}) {
  return clsx(base, sizeClasses[size], variantClasses[variant], className);
}
