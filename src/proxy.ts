import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

import { isSupabaseConfigured, supabaseAnonKey, supabaseUrl } from "@/lib/supabase/env";
import type { Database } from "@/types/database";

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
 */
export default async function proxy(request: NextRequest) {
  const response = NextResponse.next({ request });
  const { pathname } = request.nextUrl;

  // Without credentials there is no session to refresh and nothing to protect;
  // let the page render its own "not configured" state rather than redirect-loop.
  if (!isSupabaseConfigured()) return response;

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

  const {
    data: { user },
  } = await supabase.auth.getUser();

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
