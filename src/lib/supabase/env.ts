/**
 * Environment access for the Supabase layer.
 *
 * Validation is lazy and non-throwing at module scope on purpose. `next build`
 * runs without secrets in CI and on a fresh clone, and a top-level throw would
 * turn "no .env yet" into a failed build. Instead the data layer checks
 * `isSupabaseConfigured()` and degrades to empty results, while any code path
 * that genuinely cannot continue calls the `require*` helpers and fails loudly.
 */

export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export function isSupabaseConfigured(): boolean {
  return supabaseUrl.length > 0 && supabaseAnonKey.length > 0;
}

export function requirePublicEnv(): { url: string; anonKey: string } {
  if (!isSupabaseConfigured()) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local.",
    );
  }
  return { url: supabaseUrl, anonKey: supabaseAnonKey };
}

/**
 * Service role key. Server-only — this module must never be imported from a
 * client component. The name is not NEXT_PUBLIC_ prefixed, so Next will not
 * inline it into the browser bundle even by accident.
 */
export function requireServiceRoleKey(): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!key) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set. It is required for enquiry intake and uploads.",
    );
  }
  return key;
}

export function hasServiceRoleKey(): boolean {
  return (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").length > 0;
}
