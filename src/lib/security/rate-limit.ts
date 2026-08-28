import "server-only";

import { createHash } from "node:crypto";

import { createAdminSupabaseClient } from "@/lib/supabase/admin";

/**
 * Rate limiting for the public write endpoints.
 *
 * Backed by Postgres rather than memory: these routes run as serverless
 * functions, so a per-process counter would reset on every cold start and be
 * per-region besides. Postgres is already a hard dependency of the request, so
 * it costs one extra round trip and actually works.
 *
 * If the check itself fails (database hiccup), the request is allowed through.
 * Losing an enquiry is worse for the business than admitting a rare duplicate,
 * and validation still applies either way.
 */

export type RateLimitRule = { maxHits: number; windowSeconds: number };

export const RATE_LIMITS = {
  enquiry: { maxHits: 5, windowSeconds: 600 },
  events: { maxHits: 120, windowSeconds: 60 },
} satisfies Record<string, RateLimitRule>;

/**
 * Client IP, as reported by the proxy. Vercel sets x-forwarded-for; the first
 * entry is the client. Hashed before storage so the rate-limit table never
 * holds raw personal data.
 */
export function getClientKey(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for") ?? "";
  const realIp = headers.get("x-real-ip") ?? "";
  const ip = forwarded.split(",")[0]?.trim() || realIp || "unknown";
  return createHash("sha256").update(ip).digest("hex").slice(0, 32);
}

export async function checkRateLimit(
  route: keyof typeof RATE_LIMITS,
  headers: Headers,
): Promise<boolean> {
  const rule = RATE_LIMITS[route];
  const bucketKey = `${route}:${getClientKey(headers)}`;

  try {
    const supabase = createAdminSupabaseClient();
    const { data, error } = await supabase.rpc("check_rate_limit", {
      p_bucket_key: bucketKey,
      p_max_hits: rule.maxHits,
      p_window_seconds: rule.windowSeconds,
    });

    if (error) {
      console.error("[rate-limit] check failed, allowing request:", error.message);
      return true;
    }

    return data === true;
  } catch (error) {
    console.error("[rate-limit] unavailable, allowing request:", error);
    return true;
  }
}
