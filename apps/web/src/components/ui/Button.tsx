import type { ButtonHTMLAttributes } from "react";

import { LoaderCircle } from "lucide-react";

import { buttonClassName } from "@/components/ui/button-utils";
import type { ButtonSize, ButtonVariant } from "@/components/ui/button-types";


export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  size?: ButtonSize;
  variant?: ButtonVariant;
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
