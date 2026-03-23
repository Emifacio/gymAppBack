import clsx from "clsx";

interface FormControlClassNameOptions {
  className?: string | undefined;
  error?: boolean;
}

const baseClassName =
  "w-full rounded-xl border border-transparent bg-[var(--bg-surface-secondary)] px-4 py-3 text-sm font-bold text-[var(--text-primary)] shadow-sm outline-none transition-[border-color,background-color,box-shadow,color] duration-200 placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:bg-[var(--bg-surface)] focus:ring-2 focus:ring-[var(--accent-soft)] disabled:cursor-not-allowed disabled:border-[var(--border-base)] disabled:bg-[var(--bg-surface-secondary)] disabled:text-[var(--text-muted)] disabled:shadow-none";

export function formControlClassName({
  className,
  error = false
}: FormControlClassNameOptions = {}) {
  return clsx(
    baseClassName,
    error && "border-[var(--danger)] bg-[var(--danger-soft)] focus:border-[var(--danger)] focus:ring-[var(--danger-soft)]",
    className
  );
}
