import clsx from "clsx";
import type { HTMLAttributes, ReactNode } from "react";

type BadgeTone = "accent" | "neutral" | "success" | "warning" | "danger";
type BadgeSize = "sm" | "md";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  children: ReactNode;
  tone?: BadgeTone;
  size?: BadgeSize;
  dot?: boolean;
}

const toneClassName: Record<BadgeTone, string> = {
  accent: "border-[var(--accent-soft)] bg-[var(--accent-soft)] text-[var(--accent)]",
  danger: "border-[var(--danger-soft)] bg-[var(--danger-soft)] text-[var(--danger)]",
  neutral:
    "border-[var(--border-base)] bg-[var(--bg-surface-secondary)] text-[var(--text-secondary)]",
  success: "border-[var(--success-soft)] bg-[var(--success-soft)] text-[var(--success)]",
  warning: "border-[var(--warning-soft)] bg-[var(--warning-soft)] text-[var(--warning)]"
};

const sizeClassName: Record<BadgeSize, string> = {
  md: "px-3.5 py-2 text-[11px]",
  sm: "px-3 py-1.5 text-[10px]"
};

export function Badge({
  children,
  className,
  dot = false,
  size = "sm",
  tone = "neutral",
  ...props
}: BadgeProps) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-2 rounded-full border font-bold uppercase tracking-[0.18em]",
        toneClassName[tone],
        sizeClassName[size],
        className
      )}
      {...props}
    >
      {dot ? <span className="h-2 w-2 rounded-full bg-current opacity-80" /> : null}
      {children}
    </span>
  );
}
