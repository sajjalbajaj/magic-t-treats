import type { ReactNode } from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/* ---------------------------------------------------------------------------
   Server-rendered admin building blocks: KPI tiles, tables, filter tabs.
--------------------------------------------------------------------------- */

export function MetricCard({
  label,
  value,
  hint,
  icon: Icon,
  href,
  tone = "default",
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: LucideIcon;
  href?: string;
  tone?: "default" | "attention";
}) {
  const body = (
    <div
      className={cn(
        "flex h-full flex-col gap-1.5 rounded-xl border bg-admin-surface p-4 transition-colors duration-200",
        // The dashboard stays neutral — attention reads as amber, not brand pink.
        tone === "attention" ? "border-warning/40 bg-warning-bg/40" : "border-admin-line",
        href && "hover:border-admin-accent/40",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-admin-muted">
          {label}
        </span>
        {Icon ? <Icon className="size-4 text-admin-muted" aria-hidden="true" /> : null}
      </div>
      <span className="font-sans text-2xl font-bold tracking-tight text-admin-ink">{value}</span>
      {hint ? <span className="text-xs text-admin-muted">{hint}</span> : null}
    </div>
  );

  return href ? (
    <Link href={href} className="block h-full">
      {body}
    </Link>
  ) : (
    body
  );
}

/**
 * Table wrapper.
 *
 * Scrolls horizontally rather than collapsing columns on narrow screens: the
 * baker's phone should still show the real table, and hiding columns tends to
 * hide the one she needed.
 */
export function AdminTable({
  headers,
  children,
  caption,
}: {
  headers: string[];
  children: ReactNode;
  caption?: string;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-admin-line bg-admin-surface">
      <table className="w-full min-w-[640px] border-collapse text-left text-sm">
        {caption ? <caption className="sr-only">{caption}</caption> : null}
        <thead>
          <tr className="border-b border-admin-line bg-admin-bg/60">
            {headers.map((header) => (
              <th
                key={header}
                scope="col"
                className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-admin-muted"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-admin-line">{children}</tbody>
      </table>
    </div>
  );
}

export function Td({
  children,
  className,
  colSpan,
}: {
  children: ReactNode;
  className?: string;
  colSpan?: number;
}) {
  return (
    <td colSpan={colSpan} className={cn("px-4 py-3 align-middle text-admin-ink", className)}>
      {children}
    </td>
  );
}

/** Status filters, rendered as links so filtering works without JavaScript. */
export function FilterTabs({
  options,
  active,
  basePath,
  paramName = "status",
  extraParams = {},
}: {
  options: { label: string; value: string; count?: number }[];
  active: string;
  basePath: string;
  paramName?: string;
  extraParams?: Record<string, string | undefined>;
}) {
  return (
    <div className="scroll-rail" role="tablist" aria-label="Filter">
      {options.map((option) => {
        const params = new URLSearchParams();
        for (const [key, value] of Object.entries(extraParams)) {
          if (value) params.set(key, value);
        }
        if (option.value !== "all") params.set(paramName, option.value);
        const query = params.toString();

        const selected = active === option.value;

        return (
          <Link
            key={option.value}
            href={query ? `${basePath}?${query}` : basePath}
            role="tab"
            aria-selected={selected}
            className={cn(
              "rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors duration-200",
              selected
                ? "border-admin-accent bg-admin-accent text-white"
                : "border-admin-line bg-admin-surface text-admin-muted hover:text-admin-ink",
            )}
          >
            {option.label}
            {typeof option.count === "number" ? (
              <span className={cn("ml-1.5 text-xs", selected ? "opacity-80" : "opacity-60")}>
                {option.count}
              </span>
            ) : null}
          </Link>
        );
      })}
    </div>
  );
}

/**
 * Search box. A plain GET form, so it works before hydration and the result is
 * a shareable, bookmarkable URL.
 */
export function SearchForm({
  action,
  defaultValue,
  placeholder,
  hiddenFields = {},
}: {
  action: string;
  defaultValue?: string;
  placeholder: string;
  hiddenFields?: Record<string, string | undefined>;
}) {
  return (
    <form action={action} method="get" className="flex w-full gap-2 sm:max-w-xs">
      {Object.entries(hiddenFields).map(([key, value]) =>
        value ? <input key={key} type="hidden" name={key} value={value} /> : null,
      )}
      <input
        type="search"
        name="search"
        defaultValue={defaultValue}
        placeholder={placeholder}
        aria-label={placeholder}
        className="w-full rounded-lg border border-admin-line bg-admin-surface px-3 py-2 text-sm text-admin-ink placeholder:text-admin-muted/70"
      />
      <button
        type="submit"
        className="rounded-lg border border-admin-line bg-admin-surface px-3 py-2 text-sm font-medium text-admin-ink transition-colors duration-200 hover:bg-admin-bg"
      >
        Search
      </button>
    </form>
  );
}

export function DefinitionList({
  items,
}: {
  items: { label: string; value: ReactNode }[];
}) {
  return (
    <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
      {items.map(({ label, value }) => (
        <div key={label} className="flex flex-col gap-0.5">
          <dt className="text-xs font-semibold uppercase tracking-wide text-admin-muted">
            {label}
          </dt>
          <dd className="text-sm text-admin-ink">{value || "-"}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Simple horizontal bar chart for the analytics screens. */
export function BarList({
  items,
  emptyLabel = "No data yet.",
}: {
  items: { label: string; value: number; display?: string }[];
  emptyLabel?: string;
}) {
  if (items.length === 0) {
    return <p className="text-sm text-admin-muted">{emptyLabel}</p>;
  }

  const max = Math.max(...items.map((item) => item.value), 1);

  return (
    <ul className="flex flex-col gap-2.5">
      {items.map((item) => (
        <li key={item.label} className="flex flex-col gap-1">
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate font-medium text-admin-ink">{item.label}</span>
            <span className="shrink-0 tabular-nums text-admin-muted">
              {item.display ?? item.value}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-admin-bg">
            <div
              className="h-full rounded-full bg-accent"
              style={{ width: `${Math.max(2, (item.value / max) * 100)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
