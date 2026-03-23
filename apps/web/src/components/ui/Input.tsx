import { forwardRef } from "react";
import type { InputHTMLAttributes } from "react";

import { formControlClassName } from "@/components/ui/form-control-utils";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, error = false, ...props },
  ref
) {
  return (
    <input
      ref={ref}
      className={formControlClassName({ className, error })}
      {...props}
    />
  );
});
