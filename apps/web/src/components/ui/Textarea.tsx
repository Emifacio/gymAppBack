import { forwardRef } from "react";
import type { TextareaHTMLAttributes } from "react";

import { formControlClassName } from "@/components/ui/form-control-utils";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className, error = false, ...props },
  ref
) {
  return (
    <textarea
      ref={ref}
      className={formControlClassName({ className: `min-h-[110px] resize-y ${className ?? ""}`, error })}
      {...props}
    />
  );
});
