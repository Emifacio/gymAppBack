import { forwardRef } from "react";
import type { SelectHTMLAttributes } from "react";

import { formControlClassName } from "@/components/ui/form-control-utils";

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className, error = false, ...props },
  ref
) {
  return (
    <select
      ref={ref}
      className={formControlClassName({ className: `appearance-none ${className ?? ""}`, error })}
      {...props}
    />
  );
});
