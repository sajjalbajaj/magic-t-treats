/**
 * Pure helpers shared by the client tracker and the server intake route.
 *
 * Attribution is only useful if "Instagram", "instagram" and "INSTAGRAM " all
 * land in the same bucket, so normalisation happens in one place that both
 * sides import — and that the tests can exercise directly.
 */

export const UTM_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
] as const;

export type UtmKey = (typeof UTM_KEYS)[number];
export type Attribution = Partial<Record<UtmKey, string>> & {
  referrer?: string;
  device_type?: DeviceType;
};

export type DeviceType = "mobile" | "tablet" | "desktop";

/** Lowercased, trimmed, length-capped. Empty becomes undefined, never "". */
export function normaliseUtmValue(value: string | null | undefined): string | undefined {
  if (typeof value !== "string") return undefined;
  const cleaned = value.trim().toLowerCase().slice(0, 120);
  return cleaned.length > 0 ? cleaned : undefined;
}

export function extractUtm(params: URLSearchParams): Partial<Record<UtmKey, string>> {
  const result: Partial<Record<UtmKey, string>> = {};
  for (const key of UTM_KEYS) {
    const value = normaliseUtmValue(params.get(key));
    if (value) result[key] = value;
  }
  return result;
}

/**
 * Infer a lead source when no utm_source was present.
 *
 * A visitor arriving from an Instagram link without campaign tags is still an
 * Instagram lead, and the dashboard's source breakdown is far more useful if
 * it says so rather than lumping them into "direct".
 */
export function inferSourceFromReferrer(referrer: string | null | undefined): string | undefined {
  if (!referrer) return undefined;

  let host: string;
  try {
    host = new URL(referrer).hostname.toLowerCase();
  } catch {
    return undefined;
  }

  if (host.includes("instagram")) return "instagram";
  if (host.includes("facebook") || host.includes("fb.")) return "facebook";
  if (host.includes("google")) return "google";
  if (host.includes("bing") || host.includes("duckduckgo")) return "search";
  if (host.includes("whatsapp") || host.includes("wa.me")) return "whatsapp";
  if (host.includes("youtube")) return "youtube";
  if (host.includes("linkedin")) return "linkedin";
  return undefined;
}

/** Coarse device bucket. Enough to segment mobile-from-Instagram traffic. */
export function detectDeviceType(userAgent: string | null | undefined): DeviceType {
  const ua = (userAgent ?? "").toLowerCase();
  if (!ua) return "desktop";
  if (/ipad|tablet|playbook|silk|(android(?!.*mobile))/.test(ua)) return "tablet";
  if (/mobi|iphone|ipod|android|blackberry|windows phone/.test(ua)) return "mobile";
  return "desktop";
}

/**
 * Resolve the attribution actually stored on a record.
 *
 * Precedence: explicit UTM tags beat an inferred referrer, which beats
 * "direct". Doing this once at write time means the dashboard never has to
 * re-derive it at read time.
 */
export function resolveAttribution(input: Attribution): Attribution {
  const resolved: Attribution = { ...input };

  for (const key of UTM_KEYS) {
    resolved[key] = normaliseUtmValue(input[key]);
  }

  if (!resolved.utm_source) {
    resolved.utm_source = inferSourceFromReferrer(input.referrer) ?? "direct";
  }

  if (resolved.referrer) {
    resolved.referrer = resolved.referrer.slice(0, 500);
  }

  return resolved;
}
