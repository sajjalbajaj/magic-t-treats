"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { signInAction } from "@/app/actions/auth";
import type { ActionResult } from "@/types/domain";

export function LoginForm({
  redirectTo,
  reason,
}: {
  redirectTo?: string;
  reason?: string;
}) {
  const router = useRouter();

  // Navigation happens inside the action rather than in an effect watching the
  // result: refresh() first so the destination's server components see the new
  // auth cookie, then replace() so Back does not return to the login form.
  const [state, formAction, pending] = useActionState<
    ActionResult<{ redirectTo: string }> | null,
    FormData
  >(async (previous, formData) => {
    const result = await signInAction(previous, formData);
    if (result.success) {
      router.refresh();
      router.replace(result.data.redirectTo);
    }
    return result;
  }, null);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {reason === "unauthorized" ? (
        <p className="rounded-lg border border-warning/25 bg-warning-bg px-3 py-2 text-xs text-warning">
          Please sign in to continue.
        </p>
      ) : null}

      <input type="hidden" name="redirectTo" value={redirectTo ?? "/admin"} />

      <Field label="Email" required>
        {({ id }) => (
          <Input
            id={id}
            name="email"
            type="email"
            required
            autoComplete="email"
            autoFocus
            placeholder="you@example.com"
          />
        )}
      </Field>

      <Field label="Password" required>
        {({ id }) => (
          <Input
            id={id}
            name="password"
            type="password"
            required
            autoComplete="current-password"
            placeholder="••••••••"
          />
        )}
      </Field>

      {state && !state.success ? (
        <p role="alert" className="text-sm font-medium text-danger">
          {state.error.message}
        </p>
      ) : null}

      <Button
        type="submit"
        variant="admin"
        className="mt-1 w-full"
        loading={pending}
        loadingLabel="Signing in…"
      >
        Sign in
      </Button>
    </form>
  );
}
