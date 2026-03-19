import { Check, LoaderCircle } from "lucide-react";
import type { ButtonHTMLAttributes } from "react";

import { buttonClassName } from "@/components/ui/button-utils";
import type { ButtonSize, ButtonVariant } from "@/components/ui/button-types";


export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  success?: boolean;
  size?: ButtonSize;
  variant?: ButtonVariant;
}

export function Button({
  children,
  className,
  disabled,
  loading = false,
  success = false,
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
      {loading ? (
        <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
      ) : success ? (
        <Check aria-hidden="true" className="size-4" strokeWidth={2.5} />
      ) : null}
      {children}
    </button>
  );
}
