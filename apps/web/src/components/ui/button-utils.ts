import clsx from "clsx";
import type { ButtonSize, ButtonVariant } from "./button-types";

interface ButtonClassNameOptions {
  className?: string | undefined;
  size?: ButtonSize;
  variant?: ButtonVariant;
}

const base =
  "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-base"
};

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-[var(--primary)] text-white hover:opacity-90 active:scale-95 transition-all",
  secondary: "bg-[var(--ink-100)] text-[var(--ink-900)] hover:bg-[var(--ink-300)] active:scale-95 transition-all",
  danger: "bg-[#FF3B30] text-white hover:opacity-90 active:scale-95 transition-all",
  outline: "border border-[var(--ink-300)] bg-transparent text-[var(--ink-900)] hover:bg-[var(--ink-100)] active:scale-95 transition-all",
  ghost: "bg-transparent text-[var(--ink-700)] hover:bg-[var(--ink-100)] active:scale-95 transition-all"
};

export function buttonClassName({ className, size = "md", variant = "primary" }: ButtonClassNameOptions = {}) {
  return clsx(base, sizeClasses[size], variantClasses[variant], className);
}
