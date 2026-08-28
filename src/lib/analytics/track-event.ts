"use client";

import {
  detectDeviceType,
  extractUtm,
  UTM_KEYS,
  type Attribution,
} from "@/lib/analytics/normalize";

/**
 * Client-side event tracking.
 *
 * Two destinations, on purpose:
 *   - GA4, for general web analytics.
 *   - /api/events, for the bakery's own funnel — GA cannot tell the baker
 *     which product was enquired about in a way the dashboard can query.
 *
 * Never throws and never blocks the interaction it is measuring: a failed
 * analytics call must not stop someone from sending an enquiry.
 */

export type TrackableEvent =
  | "product_view"
  | "product_enquiry_click"
  | "enquiry_submitted"
  | "instagram_opened"
  | "whatsapp_opened"
  | "product_shared"
  | "category_view"
  | "custom_order_started"
  | "custom_order_submitted";

export type TrackEventPayload = {
  product_id?: string;
  product_sku?: string;
  source?: string;
  cta_location?: string;
};

const ATTRIBUTION_KEY = "mt_attribution";

type GtagFn = (command: string, ...args: unknown[]) => void;

function gtag(): GtagFn | null {
  if (typeof window === "undefined") return null;
  const candidate = (window as unknown as { gtag?: GtagFn }).gtag;
  return typeof candidate === "function" ? candidate : null;
}

/**
 * Capture attribution on the first page of the visit and keep it for the rest
 * of the session. Without this, a visitor who lands on a QR-tagged URL and
 * then browses to a product would submit their enquiry with no campaign data.
 *
 * sessionStorage rather than a cookie: this is first-party measurement that
 * ends with the tab, so it needs no consent banner and cannot follow anyone.
 */
export function captureAttribution(): void {
  if (typeof window === "undefined") return;

  try {
    const params = new URLSearchParams(window.location.search);
    const incoming = extractUtm(params);
    const stored = readAttribution();

    // First touch wins — the campaign that brought them here is the one that
    // earned the lead, not whatever tag happens to be on the last URL.
    const hasStoredCampaign = UTM_KEYS.some((key) => stored[key]);
    if (hasStoredCampaign && Object.keys(incoming).length === 0) return;

    const referrer =
      stored.referrer ??
      (document.referrer && !document.referrer.includes(window.location.host)
        ? document.referrer
        : undefined);

    const next: Attribution = {
      ...(hasStoredCampaign ? stored : {}),
      ...incoming,
      referrer,
      device_type: detectDeviceType(navigator.userAgent),
    };

    window.sessionStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(next));
  } catch {
    // Private browsing can throw on sessionStorage. Tracking is optional.
  }
}

export function readAttribution(): Attribution {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.sessionStorage.getItem(ATTRIBUTION_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null ? (parsed as Attribution) : {};
  } catch {
    return {};
  }
}

export function trackEvent(event: TrackableEvent, payload: TrackEventPayload = {}): void {
  if (typeof window === "undefined") return;

  const attribution = readAttribution();

  gtag()?.("event", event, {
    product_sku: payload.product_sku,
    cta_location: payload.cta_location,
    ...attribution,
  });

  const body = JSON.stringify({ event_type: event, ...payload, ...attribution });

  try {
    // sendBeacon survives the page unload that follows "open Instagram".
    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type: "application/json" });
      if (navigator.sendBeacon("/api/events", blob)) return;
    }

    void fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => undefined);
  } catch {
    // Measurement is best-effort by design.
  }
}
