import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "danger"
  | "admin"
  | "adminGhost";

export type ButtonSize = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-semibold " +
  "transition-[background-color,color,box-shadow,opacity] duration-200 " +
  "disabled:opacity-55 disabled:pointer-events-none whitespace-nowrap";

const variants: Record<ButtonVariant, string> = {
  // Brand pink, darkened from the logo so white text clears AA (5.58:1).
  primary: "bg-accent text-white hover:bg-accent-deep shadow-(--shadow-soft)",
  secondary: "border border-cocoa/25 bg-transparent text-cocoa hover:bg-blush/60",
  ghost: "bg-transparent text-cocoa hover:bg-blush/50",
  danger: "bg-danger text-white hover:opacity-90",
  admin: "rounded-lg bg-admin-accent text-white hover:opacity-90",
  adminGhost:
    "rounded-lg border border-admin-line bg-admin-surface text-admin-ink hover:bg-admin-bg",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-9 px-4 text-sm",
  md: "h-11 px-6 text-sm",
  lg: "h-13 px-8 text-base",
};

/**
 * Shared class string, so a link can be styled as a button without a wrapper.
 * Nesting an <a> inside a <button> is invalid HTML and confuses assistive
 * tech about what the control actually does, so links use <ButtonLink>.
 */
export function buttonClasses(
  variant: ButtonVariant = "primary",
  size: ButtonSize = "md",
  className?: string,
): string {
  return cn(base, variants[variant], sizes[size], className);
}

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  /** Announced to screen readers while `loading` is true. */
  loadingLabel?: string;
  children?: ReactNode;
};

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  loadingLabel = "Working…",
  className,
  children,
  disabled,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonClasses(variant, size, className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? (
        <>
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          <span>{loadingLabel}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}

export type ButtonLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Set for external destinations; adds target and rel automatically. */
  external?: boolean;
  children: ReactNode;
};

export function ButtonLink({
  href,
  variant = "primary",
  size = "md",
  external = false,
  className,
  children,
  ...props
}: ButtonLinkProps) {
  const classes = buttonClasses(variant, size, className);

  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        // noopener closes the reverse-tabnabbing hole on target=_blank.
        rel="noopener noreferrer"
        className={classes}
        {...props}
      >
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className={classes} {...props}>
      {children}
    </Link>
  );
}
