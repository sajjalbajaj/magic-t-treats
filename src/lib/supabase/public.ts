import "server-only";

import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

import { requirePublicEnv } from "@/lib/supabase/env";
import type { Database } from "@/types/database";

let cachedClient: SupabaseClient<Database> | null = null;

/**
 * Anonymous, cookie-free server client for the public website.
 *
 * Deliberately not the cookie-bound client: touching cookies() would force
 * every public page to render dynamically. Without it, homepage/gallery/about
 * stay statically rendered and are refreshed by revalidateTag() when the baker
 * publishes a change — which is both faster for visitors and cheaper to run.
 *
 * Only sees rows that the anon RLS policies expose.
 */
export function createPublicSupabaseClient(): SupabaseClient<Database> {
  if (cachedClient) return cachedClient;
  const { url, anonKey } = requirePublicEnv();

  cachedClient = createClient<Database>(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cachedClient;
}
