import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { LoginForm } from "@/components/admin/login-form";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const metadata: Metadata = {
  title: "Sign in",
  // The dashboard login must never be indexed.
  robots: { index: false, follow: false },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string; reason?: string }>;
}) {
  const { redirectTo, reason } = await searchParams;
  const configured = isSupabaseConfigured();

  return (
    <main className="grid min-h-dvh place-items-center bg-admin-bg px-5 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-7 flex flex-col items-center gap-2 text-center">
          <Link href="/" className="flex flex-col items-center gap-2.5">
            <span className="relative size-16 overflow-hidden rounded-full">
              <Image src="/brand/logo.png" alt="" fill sizes="64px" priority className="object-cover" />
            </span>
            <h1 className="font-display text-3xl text-cocoa">Magic T-treats</h1>
          </Link>
          <p className="text-sm text-admin-muted">Sign in to the bakery dashboard</p>
        </div>

        <div className="rounded-2xl border border-admin-line bg-admin-surface p-6 shadow-(--shadow-soft)">
          {configured ? (
            <LoginForm redirectTo={redirectTo} reason={reason} />
          ) : (
            <div className="flex flex-col gap-2 text-sm">
              <p className="font-semibold text-admin-ink">Supabase is not configured</p>
              <p className="text-admin-muted">
                Copy <code className="rounded bg-admin-bg px-1">.env.example</code> to{" "}
                <code className="rounded bg-admin-bg px-1">.env.local</code> and add your
                Supabase project URL and keys, then restart the dev server.
              </p>
            </div>
          )}
        </div>

        <p className="mt-5 text-center text-xs text-admin-muted">
          <Link href="/" className="transition-colors duration-200 hover:text-admin-ink">
            ← Back to the website
          </Link>
        </p>
      </div>
    </main>
  );
}
