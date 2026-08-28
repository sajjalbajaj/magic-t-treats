"use client";

import { Suspense, useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

import { captureAttribution } from "@/lib/analytics/track-event";

/**
 * Captures campaign attribution on entry and re-checks it on navigation.
 *
 * Rendered once in the root layout. It draws nothing — its only job is to make
 * sure a visitor who lands on a QR- or campaign-tagged URL still carries that
 * attribution when they submit an enquiry three pages later.
 */
function AttributionListener() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    captureAttribution();
  }, [pathname, searchParams]);

  return null;
}

export function AnalyticsProvider() {
  // useSearchParams() requires a Suspense boundary, or it opts every page into
  // dynamic rendering — which would forfeit static generation site-wide.
  return (
    <Suspense fallback={null}>
      <AttributionListener />
    </Suspense>
  );
}
