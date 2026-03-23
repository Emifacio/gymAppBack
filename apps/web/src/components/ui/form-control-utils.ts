import clsx from "clsx";

interface FormControlClassNameOptions {
  className?: string | undefined;
  error?: boolean;
}

const baseClassName =
  "w-full rounded-xl border border-[var(--border-base)] bg-[var(--bg-surface)] px-4 py-3 text-sm font-bold text-[var(--text-primary)] shadow-[var(--shadow-xs)] outline-none transition-[border-color,background-color,box-shadow,color,transform] duration-200 placeholder:text-[var(--text-muted)] hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-sm)] focus:border-[var(--accent)] focus:bg-[var(--bg-surface)] focus:shadow-[var(--shadow-sm)] focus:ring-2 focus:ring-[var(--accent-soft)] disabled:cursor-not-allowed disabled:border-[var(--border-base)] disabled:bg-[var(--bg-surface-secondary)] disabled:text-[var(--text-muted)] disabled:shadow-none";

export function formControlClassName({
  className,
  error = false
}: FormControlClassNameOptions = {}) {
  return clsx(
    baseClassName,
    error &&
      "border-[var(--danger)] bg-[var(--danger-soft)] hover:border-[var(--danger)] focus:border-[var(--danger)] focus:bg-[var(--danger-soft)] focus:ring-[var(--danger-soft)]",
    className
  );
}
