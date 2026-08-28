"use client";

import { useLinkStatus } from "next/link";

/**
 * Navigation indicator: a small chocolate bite rolling across the top of the
 * viewport while the next page is being fetched.
 *
 * Rendered *inside* a <Link>, which is what `useLinkStatus` requires — it
 * reports the pending state of its nearest ancestor link. That is better than
 * a global router listener here, because it can only ever be true for a
 * navigation the visitor actually started.
 *
 * Fixed to the top rather than placed inline: an indicator that appears next
 * to the tapped link shifts the layout at the exact moment the page is about
 * to change, which reads as a glitch.
 */
export function NavigationBite() {
  const { pending } = useLinkStatus();

  if (!pending) return null;

  return (
    <span
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 top-0 z-[9998] block h-0.5 bg-accent/15"
    >
      <span
        aria-hidden="true"
        className="bakery-nav-bite absolute -top-[3px] size-2 rounded-full bg-cocoa shadow-sm"
      />
      <span className="sr-only">Loading the next page</span>
    </span>
  );
}
