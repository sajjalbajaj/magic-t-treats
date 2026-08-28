import "server-only";

import { redirect } from "next/navigation";
import type { SupabaseClient, User } from "@supabase/supabase-js";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { AdminRole, Database } from "@/types/database";

export type AdminSession = {
  user: User;
  role: AdminRole;
  fullName: string | null;
  supabase: SupabaseClient<Database>;
};

/**
 * Ceiling on the auth round-trip. Matches `proxy.ts`; see the note there.
 */
const AUTH_TIMEOUT_MS = 3000;

/**
 * Resolves the current admin, or null.
 *
 * Two checks, both required:
 *   1. `getUser()` — validates the JWT against Supabase Auth. Session cookies
 *      are attacker-controllable, so `getSession()` alone is not sufficient.
 *   2. An active row in `admin_users` — being signed in is not being an admin.
 */
export async function getAdminSession(): Promise<AdminSession | null> {
  // Without credentials there is no session to resolve. Returning null sends
  // the caller to the login screen, which explains what is missing — throwing
  // here would surface as a 500 on every /admin route instead.
  if (!isSupabaseConfigured()) return null;

  const supabase = await createServerSupabaseClient();

  /*
    Bounded, and fails closed.

    `getUser()` carries no timeout of its own. On 2026-08-28 the project's auth
    service stopped responding while the database stayed healthy, and every
    admin request hung on this line instead of returning a login screen.
    Treating an unreachable auth service as "not signed in" is the safe
    reading: the worst case is an admin being asked to log in again.
  */
  const user = await Promise.race([
    supabase.auth.getUser().then(({ data, error }) => (error ? null : data.user)),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), AUTH_TIMEOUT_MS)),
  ]).catch(() => null);

  if (!user) return null;

  const { data: adminRow, error: adminError } = await supabase
    .from("admin_users")
    .select("role, full_name, is_active")
    .eq("user_id", user.id)
    .maybeSingle();

  if (adminError || !adminRow || !adminRow.is_active) return null;

  return {
    user,
    role: adminRow.role,
    fullName: adminRow.full_name,
    supabase,
  };
}

/**
 * Server-side gate for every admin page and mutation.
 *
 * Middleware already blocks unauthenticated requests to /admin, but middleware
 * is a convenience, not a security boundary — it can be bypassed by anything
 * that reaches a server action directly. Every privileged entry point calls
 * this, and RLS backstops it a third time at the database.
 */
export async function requireAdmin(): Promise<AdminSession> {
  const session = await getAdminSession();
  if (!session) {
    redirect("/auth/login?reason=unauthorized");
  }
  return session;
}
