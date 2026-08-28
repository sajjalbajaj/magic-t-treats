"use client";

import { useEffect, useState } from "react";
import { Loader2, Play } from "lucide-react";

import { InstagramIcon } from "@/components/ui/brand-icons";
import { cn } from "@/lib/utils";

/* ---------------------------------------------------------------------------
   Loading states, in one bakery language.

   Chef hat + choco bite  — the brand loader (first load, route changes)
   Cream shimmer          — images and content blocks
   Rolling bite           — navigation and the Instagram handoff
   Cocoa spinner          — the dashboard, which stays deliberately plain

   Animation is CSS, not Motion: these render at the exact moment the main
   thread is busiest, and a keyframe animation runs on the compositor while a
   JS-driven one competes with the work being waited on.

   Every loader is announced once as "Loading" and no more. Rotating copy is
   `aria-hidden` — a live region that re-announces every two seconds is worse
   than silence for a screen reader user.
--------------------------------------------------------------------------- */

/** Shown in order, only lasting long enough to be read on slow loads. */
const BAKING_MESSAGES = [
  "Baking something sweet…",
  "Adding a little chocolate…",
  "Almost ready to serve…",
] as const;

function useRotatingMessage(messages: readonly string[], enabled: boolean) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!enabled || messages.length < 2) return;
    // First message holds longer: most loads finish before it ever changes,
    // and copy that flickers reads as broken rather than charming.
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % messages.length);
    }, 2200);
    return () => window.clearInterval(timer);
  }, [enabled, messages.length]);

  return messages[index] ?? messages[0] ?? "";
}

/**
 * The brand loader: a chef's hat with a chocolate bite dropping into it,
 * finished by a small sparkle.
 */
export function BakeryLoader({
  message,
  rotate = true,
  fullScreen = false,
  className,
}: {
  /** Fixed copy. Omit to rotate through the baking messages. */
  message?: string;
  rotate?: boolean;
  fullScreen?: boolean;
  className?: string;
}) {
  const rotating = useRotatingMessage(BAKING_MESSAGES, rotate && !message);
  const label = message ?? rotating;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={cn(
        fullScreen
          ? "fixed inset-0 z-[9999] flex items-center justify-center bg-cream"
          : "flex items-center justify-center py-16",
        className,
      )}
    >
      <div className="flex flex-col items-center gap-5">
        <div className="relative h-24 w-28" aria-hidden="true">
          <svg viewBox="0 0 120 90" className="absolute inset-0 size-full">
            <path
              d="M30 62 C15 58 14 38 29 33 C29 16 47 10 59 20 C72 7 94 16 92 34 C108 39 105 59 91 63 L91 74 L30 74 Z"
              fill="var(--brand-cream)"
              stroke="var(--brand-cocoa)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="bakery-hat"
            />
            <path
              d="M32 63 H90"
              stroke="var(--brand-cocoa)"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </svg>

          {/* The chocolate bite, dropping in and settling. */}
          <span className="bakery-bite absolute left-1/2 top-3 size-4 rounded-full bg-cocoa shadow-sm" />

          <span className="bakery-spark absolute right-2 top-2 text-lg leading-none text-accent">
            ✦
          </span>
        </div>

        {label ? (
          <p
            // aria-hidden so the rotation does not re-announce; the sr-only
            // label below carries the meaning once.
            aria-hidden="true"
            className="bakery-fade text-sm font-medium tracking-wide text-cocoa"
            key={label}
          >
            {label}
          </p>
        ) : null}

        <span className="sr-only">Loading</span>
      </div>
    </div>
  );
}

/** The hat outline, shared so the loader and the error state are the same hat. */
const CHEF_HAT_PATH =
  "M30 62 C15 58 14 38 29 33 C29 16 47 10 59 20 C72 7 94 16 92 34 C108 39 105 59 91 63 L91 74 L30 74 Z";

/**
 * The chef hat with a bitten chocolate bite resting in it.
 *
 * The failure counterpart to `BakeryLoader`: same hat, but the bite has a piece
 * missing and nothing moves. Static on purpose — an animated error state reads
 * as "still working", which is the opposite of what has happened.
 */
export function BrokenBakeryIcon({ className }: { className?: string }) {
  return (
    <span className={cn("relative block h-20 w-24", className)} aria-hidden="true">
      <svg viewBox="0 0 120 90" className="size-full">
        <path
          d={CHEF_HAT_PATH}
          fill="var(--brand-cream)"
          stroke="var(--brand-cocoa)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M32 63 H90"
          stroke="var(--brand-cocoa)"
          strokeWidth="3"
          strokeLinecap="round"
        />

        {/*
          The bite, with a piece taken out of it. The "missing" wedge is punched
          out with the surface colour rather than a mask, so it reads correctly
          on the cream card without needing an SVG mask per instance.
        */}
        <circle cx="60" cy="52" r="9" fill="var(--brand-cocoa)" />
        <circle cx="67" cy="46" r="4" fill="var(--brand-cream)" />

        <path
          d="M92 19 L95 25 L101 28 L95 31 L92 37 L89 31 L83 28 L89 25 Z"
          fill="var(--brand-accent)"
        />
      </svg>
    </span>
  );
}

/**
 * Skeleton block with a cream shimmer.
 *
 * Used instead of the chef-hat animation wherever several placeholders appear
 * at once — a grid of cards each running its own hat would be a fairground.
 */
export function BakerySkeleton({
  className,
  rounded = "rounded-(--radius-card)",
}: {
  className?: string;
  rounded?: string;
}) {
  return (
    <div
      aria-hidden="true"
      className={cn("relative overflow-hidden bg-blush/45", rounded, className)}
    >
      <div className="bakery-shimmer absolute inset-0" />
    </div>
  );
}

/** Card-shaped skeleton matching the product grid, so nothing shifts on load. */
export function ProductCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-(--radius-card) border border-line bg-surface">
      <BakerySkeleton className="aspect-4/3 w-full" rounded="rounded-none" />
      <div className="flex flex-col gap-3 p-4">
        <BakerySkeleton className="h-5 w-3/4" rounded="rounded-md" />
        <BakerySkeleton className="h-4 w-full" rounded="rounded-md" />
        <div className="flex items-center justify-between gap-3 pt-1">
          <BakerySkeleton className="h-4 w-20" rounded="rounded-md" />
          <BakerySkeleton className="h-8 w-24" rounded="rounded-(--radius-pill)" />
        </div>
      </div>
    </div>
  );
}

/**
 * Rolling chocolate bite, for the moment between "we saved it" and the
 * customer landing on Instagram.
 */
export function RollingBite({
  message = "Taking you to Instagram…",
  note,
  fullScreen = true,
}: {
  message?: string;
  note?: string;
  fullScreen?: boolean;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        fullScreen
          ? "fixed inset-0 z-[9999] flex items-center justify-center bg-cream/95 backdrop-blur-sm"
          : "flex items-center justify-center",
      )}
    >
      <div className="flex flex-col items-center gap-4 px-6 text-center">
        <div className="relative flex h-10 w-40 items-center" aria-hidden="true">
          <span className="bakery-roll absolute left-0 size-4 rounded-full bg-cocoa shadow-sm" />
          <span className="absolute right-0 grid size-9 place-items-center rounded-full bg-accent text-white">
            <InstagramIcon className="size-4.5" />
          </span>
        </div>

        <p className="text-sm font-semibold text-cocoa">{message}</p>
        {note ? <p className="text-xs text-ink-muted">{note}</p> : null}
        <span className="sr-only">Loading</span>
      </div>
    </div>
  );
}

/** Plain cocoa spinner. The dashboard stays calm and out of the way. */
export function CocoaSpinner({
  label = "Loading",
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn("flex items-center justify-center gap-3 py-16", className)}
    >
      <Loader2 className="size-5 animate-spin text-admin-accent" aria-hidden="true" />
      <span className="text-sm text-admin-muted">{label}</span>
      <span className="sr-only">Loading</span>
    </div>
  );
}

/** Pulsing bite behind a play icon, for a video that has not started yet. */
export function VideoLoadingBadge({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn("pointer-events-none grid place-items-center", className)}
    >
      <span className="relative grid size-12 place-items-center">
        <span className="bakery-pulse absolute inset-0 rounded-full bg-cocoa/15" />
        <span className="relative grid size-11 place-items-center rounded-full bg-cream/90 shadow-(--shadow-soft)">
          <Play className="ml-0.5 size-4 text-cocoa" />
        </span>
      </span>
    </span>
  );
}
