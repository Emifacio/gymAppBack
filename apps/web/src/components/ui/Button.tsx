import type { ButtonHTMLAttributes } from "react";

import clsx from "clsx";
import { LoaderCircle } from "lucide-react";

export type ButtonVariant = "primary" | "secondary" | "danger" | "outline" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

interface ButtonClassNameOptions {
  className?: string | undefined;
  size?: ButtonSize | undefined;
  variant?: ButtonVariant | undefined;
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
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

export function buttonClassName({
  className,
  size = "md",
  variant = "primary"
}: ButtonClassNameOptions = {}) {
  return clsx(base, sizeClasses[size], variantClasses[variant], className);
}

export function Button({
  children,
  className,
  disabled,
  loading = false,
  size = "md",
  type = "button",
  variant = "primary",
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      aria-busy={loading || undefined}
      className={buttonClassName({ className, size, variant })}
      disabled={isDisabled}
      type={type}
      {...props}
    >
      {loading ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : null}
      {children}
    </button>
  );
}
