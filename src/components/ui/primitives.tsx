import type { ReactNode } from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";

import { AnimatedText } from "@/components/public/motion-primitives";

import { cn } from "@/lib/utils";
import type { EnquiryStatus, OrderStatus } from "@/types/database";

/* ---------------------------------------------------------------------------
   Small shared presentational primitives.

   Server components by default — none of these need interactivity, so keeping
   them out of the client bundle is free.
--------------------------------------------------------------------------- */

export function Card({
  children,
  className,
  as: Tag = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "article" | "section" | "li";
}) {
  return (
    <Tag
      className={cn(
        "rounded-(--radius-card) border border-admin-line bg-admin-surface p-5",
        className,
      )}
    >
      {children}
    </Tag>
  );
}

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: "neutral" | "cocoa" | "sage" | "accent" | "blush" | "success" | "warning" | "danger" | "info";
  className?: string;
}) {
  const tones: Record<string, string> = {
    neutral: "border-admin-line bg-admin-bg text-admin-muted",
    cocoa: "border-cocoa/20 bg-cocoa/8 text-cocoa",
    sage: "border-sage/45 bg-sage/18 text-[#4a5c3d]",
    // Text is the deep accent, not the vivid logo pink: on a 15%-tint ground
    // the vivid pink only reaches ~2.6:1.
    accent: "border-accent/30 bg-accent/12 text-accent-deep",
    blush: "border-blush bg-blush/60 text-cocoa",
    success: "border-success/25 bg-success-bg text-success",
    warning: "border-warning/25 bg-warning-bg text-warning",
    danger: "border-danger/25 bg-danger-bg text-danger",
    info: "border-info/25 bg-info-bg text-info",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-(--radius-pill) border px-2.5 py-0.5 text-xs font-semibold",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

const enquiryTones: Record<EnquiryStatus, { label: string; tone: "info" | "warning" | "success" | "neutral" | "danger" }> = {
  new: { label: "New", tone: "info" },
  contacted: { label: "Contacted", tone: "warning" },
  converted: { label: "Converted", tone: "success" },
  closed: { label: "Closed", tone: "neutral" },
  spam: { label: "Spam", tone: "danger" },
};

const orderTones: Record<OrderStatus, { label: string; tone: "info" | "warning" | "success" | "neutral" | "danger" }> = {
  confirmed: { label: "Confirmed", tone: "info" },
  preparing: { label: "Preparing", tone: "warning" },
  ready: { label: "Ready", tone: "success" },
  out_for_delivery: { label: "Out for Delivery", tone: "warning" },
  delivered: { label: "Delivered", tone: "success" },
  cancelled: { label: "Cancelled", tone: "danger" },
};

export function EnquiryStatusBadge({ status }: { status: EnquiryStatus }) {
  const { label, tone } = enquiryTones[status];
  return <Badge tone={tone}>{label}</Badge>;
}

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const { label, tone } = orderTones[status];
  return <Badge tone={tone}>{label}</Badge>;
}

export const orderStatusLabels = orderTones;
export const enquiryStatusLabels = enquiryTones;

/**
 * Empty state. Always paired with an action — telling someone a list is empty
 * without telling them how to fill it is a dead end.
 */
export function EmptyState({
  title,
  description,
  action,
  icon,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-(--radius-card) border border-dashed border-admin-line bg-admin-surface/60 px-6 py-14 text-center",
        className,
      )}
    >
      {icon ? <div className="text-admin-muted">{icon}</div> : null}
      <p className="text-base font-semibold text-admin-ink">{title}</p>
      {description ? (
        <p className="max-w-sm text-sm text-admin-muted">{description}</p>
      ) : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn("animate-pulse rounded-lg bg-admin-line/70", className)}
    />
  );
}

/** Page heading used across every admin screen. */
export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="font-sans text-2xl font-bold tracking-tight text-admin-ink">{title}</h1>
        {description ? (
          <p className="mt-1 text-sm text-admin-muted">{description}</p>
        ) : null}
      </div>
      {action ? <div className="flex shrink-0 gap-2">{action}</div> : null}
    </div>
  );
}

/**
 * Section heading used across the public site.
 *
 * `animate` opts the h2 into the word-by-word reveal. It is a flag rather than
 * the default because the component is also rendered inside dialogs and other
 * places where a scroll-triggered animation would never fire — leaving the
 * text invisible.
 */
export function SectionHeading({
  eyebrow,
  eyebrowIcon: EyebrowIcon,
  heading,
  headingId,
  description,
  align = "center",
  className,
  animate = false,
  /** 1 when this is the page's lead heading. Every page needs exactly one. */
  level = 2,
}: {
  eyebrow?: string;
  eyebrowIcon?: LucideIcon;
  heading: string;
  headingId?: string;
  description?: string;
  align?: "center" | "left";
  className?: string;
  animate?: boolean;
  level?: 1 | 2;
}) {
  const Tag = level === 1 ? "h1" : "h2";
  return (
    <div
      className={cn(
        "flex flex-col gap-3",
        align === "center" ? "items-center text-center" : "items-start text-left",
        className,
      )}
    >
      {eyebrow ? (
        <span className="inline-flex items-center gap-1.5 font-script text-xl font-semibold text-accent">
          {EyebrowIcon ? <EyebrowIcon className="size-4" aria-hidden="true" /> : null}
          {eyebrow}
        </span>
      ) : null}

      {animate ? (
        <AnimatedText
          as={Tag}
          id={headingId}
          text={heading}
          className="max-w-2xl text-3xl sm:text-4xl"
        />
      ) : (
        <Tag id={headingId} className="max-w-2xl text-3xl sm:text-4xl">
          {heading}
        </Tag>
      )}

      {description ? (
        <p className="max-w-xl text-base leading-relaxed text-ink-muted">{description}</p>
      ) : null}
    </div>
  );
}

/** Pagination for server-rendered admin tables. */
export function Pagination({
  page,
  pageCount,
  basePath,
  searchParams,
}: {
  page: number;
  pageCount: number;
  basePath: string;
  searchParams: Record<string, string | undefined>;
}) {
  if (pageCount <= 1) return null;

  const buildHref = (target: number) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(searchParams)) {
      if (value && key !== "page") params.set(key, value);
    }
    params.set("page", String(target));
    return `${basePath}?${params.toString()}`;
  };

  return (
    <nav
      aria-label="Pagination"
      className="flex items-center justify-between gap-4 border-t border-admin-line pt-4"
    >
      <p className="text-sm text-admin-muted">
        Page {page} of {pageCount}
      </p>
      <div className="flex gap-2">
        {page > 1 ? (
          <Link
            href={buildHref(page - 1)}
            className="rounded-lg border border-admin-line px-3 py-1.5 text-sm font-medium text-admin-ink transition-colors duration-200 hover:bg-admin-bg"
          >
            Previous
          </Link>
        ) : null}
        {page < pageCount ? (
          <Link
            href={buildHref(page + 1)}
            className="rounded-lg border border-admin-line px-3 py-1.5 text-sm font-medium text-admin-ink transition-colors duration-200 hover:bg-admin-bg"
          >
            Next
          </Link>
        ) : null}
      </div>
    </nav>
  );
}
