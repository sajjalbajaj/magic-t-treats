"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

import { requirePublicEnv } from "@/lib/supabase/env";
import type { Database } from "@/types/database";

let browserClient: SupabaseClient<Database> | null = null;

/**
 * Browser client, used only for the admin login form and sign-out. All data
 * access happens on the server; the browser never queries tables directly.
 */
export function createClient(): SupabaseClient<Database> {
  if (browserClient) return browserClient;
  const { url, anonKey } = requirePublicEnv();
  browserClient = createBrowserClient<Database>(url, anonKey);
  return browserClient;
}
