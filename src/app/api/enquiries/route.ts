import { after, type NextRequest } from "next/server";

import { apiError, apiSuccess } from "@/lib/api/response";
import { detectDeviceType, resolveAttribution } from "@/lib/analytics/normalize";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { hasServiceRoleKey, isSupabaseConfigured } from "@/lib/supabase/env";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { enquiryPayloadSchema } from "@/lib/validation/enquiry";
import { enquirySources } from "@/config/site";

/**
 * Public enquiry intake.
 *
 * The only way an anonymous visitor's data reaches the database. Anon has no
 * INSERT policy on any table, so this route — validated, rate limited, and
 * running with the service role — is a deliberate single chokepoint rather
 * than trusting the browser with write access.
 *
 * Pipeline: parse -> rate limit -> validate -> normalise attribution -> insert.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured() || !hasServiceRoleKey()) {
    console.error("[enquiries] Supabase is not fully configured; cannot accept enquiries.");
    return apiError(
      "NOT_CONFIGURED",
      "We could not save your enquiry just now. Please message us on Instagram directly.",
    );
  }

  // Rate limit before parsing, so a flood of large bodies is cheap to reject.
  const allowed = await checkRateLimit("enquiry", request.headers);
  if (!allowed) {
    return apiError(
      "RATE_LIMITED",
      "That's a few enquiries in a short time. Please wait a few minutes and try again.",
    );
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return apiError("VALIDATION_ERROR", "We could not read that request.");
  }

  const parsed = enquiryPayloadSchema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return apiError("VALIDATION_ERROR", first?.message ?? "Please check the form and try again.", {
      issues: parsed.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    });
  }

  const payload = parsed.data;

  const attribution = resolveAttribution({
    utm_source: payload.utm_source,
    utm_medium: payload.utm_medium,
    utm_campaign: payload.utm_campaign,
    utm_content: payload.utm_content,
    utm_term: payload.utm_term,
    referrer: payload.referrer ?? request.headers.get("referer") ?? undefined,
    device_type: payload.device_type ?? detectDeviceType(request.headers.get("user-agent")),
  });

  const supabase = createAdminSupabaseClient();

  // Custom orders collect a different set of fields; both land in the same
  // table so the baker has one inbox rather than two.
  const record =
    payload.kind === "product"
      ? {
          product_id: payload.productId ?? null,
          product_sku: payload.productSku ?? null,
          product_name: payload.productName ?? null,
          customer_name: payload.customerName ?? null,
          phone: payload.phone ?? null,
          email: payload.email ?? null,
          quantity: payload.quantity ?? null,
          required_date: payload.requiredDate ?? null,
          fulfilment_type: payload.fulfilmentType ?? null,
          customization: payload.customization ?? null,
          message: payload.message ?? null,
          source: enquirySources.productModal,
        }
      : {
          product_name: payload.productsInterested ?? null,
          customer_name: payload.customerName,
          phone: payload.phone ?? null,
          email: payload.email ?? null,
          quantity: payload.quantity ?? null,
          required_date: payload.requiredDate ?? null,
          fulfilment_type: payload.fulfilmentType ?? null,
          customization: payload.packaging ?? null,
          // Occasion, budget and the sugar-free flag have no dedicated columns;
          // folding them into the message keeps the enquiry readable at a
          // glance instead of scattering them across sparse fields.
          message: [
            payload.occasion ? `Occasion: ${payload.occasion}` : null,
            payload.budget ? `Budget: ${payload.budget}` : null,
            payload.sugarFreeRequired ? "Sugar-free required: Yes" : null,
            payload.message,
          ]
            .filter(Boolean)
            .join("\n"),
          source: enquirySources.customOrder,
        };

  const { data, error } = await supabase
    .from("enquiries")
    .insert({
      ...record,
      utm_source: attribution.utm_source ?? null,
      utm_medium: attribution.utm_medium ?? null,
      utm_campaign: attribution.utm_campaign ?? null,
      utm_content: attribution.utm_content ?? null,
      utm_term: attribution.utm_term ?? null,
      referrer: attribution.referrer ?? null,
      device_type: attribution.device_type ?? null,
    })
    .select("id")
    .single();

  if (error || !data) {
    // Log the real cause; never hand a Postgres error to a customer.
    console.error("[enquiries] insert failed:", error?.message);
    return apiError(
      "SERVER_ERROR",
      "We could not save your enquiry. Please message us on Instagram and we will pick it up there.",
    );
  }

  // Funnel event, recorded after the response so it cannot slow the customer down.
  after(async () => {
    try {
      await supabase.from("enquiry_events").insert({
        product_id: payload.kind === "product" ? (payload.productId ?? null) : null,
        product_sku: payload.kind === "product" ? (payload.productSku ?? null) : null,
        event_type:
          payload.kind === "product" ? "enquiry_submitted" : "custom_order_submitted",
        source: record.source,
        cta_location: payload.kind === "product" ? "enquiry_form" : "custom_order_form",
        utm_source: attribution.utm_source ?? null,
        utm_medium: attribution.utm_medium ?? null,
        utm_campaign: attribution.utm_campaign ?? null,
        referrer: attribution.referrer ?? null,
        device_type: attribution.device_type ?? null,
      });
    } catch (eventError) {
      console.error("[enquiries] follow-up event failed:", eventError);
    }
  });

  return apiSuccess({ id: data.id }, 201);
}
