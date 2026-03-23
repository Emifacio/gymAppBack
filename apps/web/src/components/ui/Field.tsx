import clsx from "clsx";
import type { HTMLAttributes, LabelHTMLAttributes, ReactNode } from "react";

interface FieldProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function Field({ children, className, ...props }: FieldProps) {
  return (
    <div className={clsx("space-y-1.5", className)} {...props}>
      {children}
    </div>
  );
}

export function FieldLabel({ children, className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={clsx(
        "block px-1 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]",
        className
      )}
      {...props}
    >
      {children}
    </label>
  );
}

export function FieldHint({ children, className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={clsx("px-1 text-[11px] text-[var(--text-secondary)]", className)} {...props}>
      {children}
    </p>
  );
}

export function FieldError({ children, className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={clsx("px-1 text-[10px] font-bold text-[var(--danger)]", className)} {...props}>
      {children}
    </p>
  );
}
