"use client";

import { useEffect } from "react";

import { Button, ButtonLink } from "@/components/ui/button";

/**
 * Global error boundary.
 *
 * Shows a human sentence, never the underlying exception — a Supabase or
 * Postgres message leaking onto the public site would be both confusing and a
 * small information disclosure. The real error goes to the server logs.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app] unhandled error:", error);
  }, [error]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-5 px-6 text-center">
      <h1 className="text-3xl">Something went wrong</h1>
      <p className="max-w-md text-sm leading-relaxed text-ink-muted">
        Sorry, that did not load as it should. Please try again, or message us on Instagram and
        we will help directly.
      </p>
      {error.digest ? (
        <p className="text-xs text-ink-muted">Reference: {error.digest}</p>
      ) : null}
      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
        <Button onClick={reset}>Try again</Button>
        <ButtonLink href="/" variant="secondary">
          Back to home
        </ButtonLink>
      </div>
    </div>
  );
}
