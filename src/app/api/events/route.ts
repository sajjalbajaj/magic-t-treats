import type { NextRequest } from "next/server";

import { apiError, apiSuccess } from "@/lib/api/response";
import { detectDeviceType, resolveAttribution } from "@/lib/analytics/normalize";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { hasServiceRoleKey, isSupabaseConfigured } from "@/lib/supabase/env";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { analyticsEventSchema } from "@/lib/validation/enquiry";

/**
 * Analytics intake for the bakery's own funnel.
 *
 * Called via sendBeacon, so it must stay fast and must never fail loudly — a
 * rejected beacon is invisible to the user but a slow one delays navigation.
 * Event names are allow-listed by the schema so an open endpoint cannot be
 * used to fill the table with arbitrary rows.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured() || !hasServiceRoleKey()) {
    // Measurement is optional; report success so the client does not retry.
    return apiSuccess({ recorded: false });
  }

  const allowed = await checkRateLimit("events", request.headers);
  if (!allowed) {
    return apiError("RATE_LIMITED", "Too many events.");
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return apiError("VALIDATION_ERROR", "Malformed event payload.");
  }

  const parsed = analyticsEventSchema.safeParse(raw);
  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", "Unrecognised event.");
  }

  const event = parsed.data;

  const attribution = resolveAttribution({
    utm_source: event.utm_source,
    utm_medium: event.utm_medium,
    utm_campaign: event.utm_campaign,
    utm_content: event.utm_content,
    utm_term: event.utm_term,
    referrer: event.referrer ?? request.headers.get("referer") ?? undefined,
    device_type: event.device_type ?? detectDeviceType(request.headers.get("user-agent")),
  });

  try {
    const supabase = createAdminSupabaseClient();
    const { error } = await supabase.from("enquiry_events").insert({
      product_id: event.product_id ?? null,
      product_sku: event.product_sku ?? null,
      event_type: event.event_type,
      source: event.source ?? "website",
      cta_location: event.cta_location ?? null,
      utm_source: attribution.utm_source ?? null,
      utm_medium: attribution.utm_medium ?? null,
      utm_campaign: attribution.utm_campaign ?? null,
      utm_content: attribution.utm_content ?? null,
      utm_term: attribution.utm_term ?? null,
      referrer: attribution.referrer ?? null,
      device_type: attribution.device_type ?? null,
    });

    if (error) throw error;
  } catch (error) {
    console.error("[events] insert failed:", error);
    return apiError("SERVER_ERROR", "Could not record event.");
  }

  return apiSuccess({ recorded: true });
}
