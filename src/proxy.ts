import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

import { isSupabaseConfigured, supabaseAnonKey, supabaseUrl } from "@/lib/supabase/env";
import type { Database } from "@/types/database";

/**
 * How long to wait for Supabase Auth before giving up on a request.
 *
 * Auth is a network call to a service that can be slow or, as happened on
 * 2026-08-28, entirely unresponsive while the database and storage stayed
 * healthy. Without a ceiling the request simply hangs: `getUser()` has no
 * timeout of its own, so a dead auth service turned into a dead website.
 */
const AUTH_TIMEOUT_MS = 3000;

/** Paths that actually need to know who the visitor is. */
function needsSession(pathname: string): boolean {
  return pathname.startsWith("/admin") || pathname === "/auth/login";
}

/**
 * Runs on every matched request (the Next 16 `proxy` convention, formerly
 * `middleware`).
 *
 * Two jobs:
 *   1. Refresh the Supabase auth cookie so server components see a live session.
 *   2. Bounce unauthenticated traffic away from /admin before it renders.
 *
 * This is a fast path, not the security boundary. It intentionally does not
 * query admin_users — that check belongs on the server next to the data, in
 * requireAdmin(), and again in RLS.
 *
 * It deliberately does NOT touch auth on public pages. Those render from the
 * cookie-free public client and have no session to use, so asking who the
 * visitor is bought nothing and cost a network round-trip on every navigation.
 * It also meant an auth outage took the whole public site down with it, which
 * is exactly what happened.
 */
export default async function proxy(request: NextRequest) {
  const response = NextResponse.next({ request });
  const { pathname } = request.nextUrl;

  // Without credentials there is no session to refresh and nothing to protect;
  // let the page render its own "not configured" state rather than redirect-loop.
  if (!isSupabaseConfigured()) return response;

  // The public site never needs a session. Leave before doing any network work.
  if (!needsSession(pathname)) return response;

  const supabase = createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  /*
    Fail closed on timeout.

    If auth cannot answer we treat the visitor as signed out, which sends them
    to the login form rather than letting them through to /admin. The real
    boundary is requireAdmin() and RLS behind this, so a wrong guess here can
    only ever be more restrictive, never less.
  */
  const user = await Promise.race([
    supabase.auth.getUser().then(({ data }) => data.user),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), AUTH_TIMEOUT_MS)),
  ]).catch(() => null);

  if (pathname.startsWith("/admin") && !user) {
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Already signed in? Skip the login form.
  if (pathname === "/auth/login" && user) {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Everything except static assets and image optimisation, so the auth
     * cookie stays fresh on normal navigations without paying the cost on
     * every asset request.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|mp4|webm)$).*)",
  ],
};
