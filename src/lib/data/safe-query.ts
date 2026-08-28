import "server-only";

import { isSupabaseConfigured } from "@/lib/supabase/env";

/**
 * Runs a public-site query, falling back rather than throwing.
 *
 * The public website must render even when the database is unreachable or not
 * yet configured — `next build` on a fresh clone has no credentials, and a
 * transient Supabase outage should degrade a section to its empty state rather
 * than 500 the whole homepage.
 *
 * Admin code deliberately does NOT use this: there, a failed write must
 * surface as an error the baker can act on, not be silently swallowed.
 */
export async function safeQuery<T>(
  label: string,
  fallback: T,
  run: () => Promise<T>,
): Promise<T> {
  if (!isSupabaseConfigured()) return fallback;

  try {
    return await run();
  } catch (error) {
    console.error(`[data] ${label} failed:`, error);
    return fallback;
  }
}
