import clsx from "clsx";
import type { ElementType, HTMLAttributes, ReactNode } from "react";

type CardElement = "section" | "div" | "article" | "aside";

interface CardProps extends HTMLAttributes<HTMLElement> {
  as?: CardElement;
  interactive?: boolean;
  children: ReactNode;
}

interface CardInsetProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function Card({
  as,
  children,
  className,
  interactive = false,
  ...props
}: CardProps) {
  const Component = (as ?? "section") as ElementType;

  return (
    <Component
      className={clsx(
        "rounded-[var(--radius-lg)] border border-[var(--border-base)] bg-[var(--bg-surface)] p-6 shadow-[var(--shadow-sm)] transition-[transform,box-shadow,border-color,background-color] duration-200 lg:p-9",
        interactive && "hover:-translate-y-0.5 hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-md)]",
        className
      )}
      {...props}
    >
      {children}
    </Component>
  );
}

export function CardHeader({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={clsx("space-y-3", className)} {...props}>
      {children}
    </div>
  );
}

export function CardEyebrow({ children, className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={clsx(
        "text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--accent)]",
        className
      )}
      {...props}
    >
      {children}
    </p>
  );
}

export function CardTitle({ children, className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={clsx(
        "section-title text-[var(--font-size-xl)] leading-tight text-[var(--text-primary)]",
        className
      )}
      {...props}
    >
      {children}
    </h2>
  );
}

export function CardDescription({ children, className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={clsx("text-sm leading-7 text-[var(--text-secondary)]", className)} {...props}>
      {children}
    </p>
  );
}

export function CardContent({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={clsx("mt-6", className)} {...props}>
      {children}
    </div>
  );
}

export function CardInset({ children, className, ...props }: CardInsetProps) {
  return (
    <div
      className={clsx(
        "rounded-[1.25rem] border border-[var(--border-base)] bg-[var(--bg-surface-secondary)] p-5 shadow-sm",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
