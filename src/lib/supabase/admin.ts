import "server-only";

import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

import { requirePublicEnv, requireServiceRoleKey } from "@/lib/supabase/env";
import type { Database } from "@/types/database";

let cachedClient: SupabaseClient<Database> | null = null;

/**
 * Service-role client. Bypasses RLS entirely.
 *
 * Legitimate uses are narrow and all server-side:
 *   1. Inserting public enquiries after validation + rate limiting, because
 *      anon has no INSERT policy anywhere by design.
 *   2. Recording analytics events from anonymous visitors.
 *   3. Writing the append-only audit log.
 *
 * Never import this from a client component, and never widen its use to
 * ordinary admin CRUD — that must stay under RLS so a bug cannot leak data.
 */
export function createAdminSupabaseClient(): SupabaseClient<Database> {
  if (cachedClient) return cachedClient;
  const { url } = requirePublicEnv();

  cachedClient = createClient<Database>(url, requireServiceRoleKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cachedClient;
}
