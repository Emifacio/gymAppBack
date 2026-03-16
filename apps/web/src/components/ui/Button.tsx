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
  sm: "min-h-9 px-3 py-2 text-sm",
  md: "min-h-10 px-4 py-2.5 text-sm",
  lg: "min-h-11 px-5 py-3 text-base"
};

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500",
  secondary: "bg-gray-100 text-gray-800 hover:bg-gray-200 focus:ring-gray-400",
  danger: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500",
  outline:
    "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:ring-gray-400",
  ghost: "bg-transparent text-gray-700 hover:bg-gray-100 focus:ring-gray-400"
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
