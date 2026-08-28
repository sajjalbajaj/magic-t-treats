import "server-only";

import { revalidatePath } from "next/cache";
import type { PostgrestError } from "@supabase/supabase-js";

import { getAdminSession, type AdminSession } from "@/lib/auth/require-admin";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { hasServiceRoleKey } from "@/lib/supabase/env";
import type { ActionResult } from "@/types/domain";
import type { Json } from "@/types/database";

/**
 * Shared plumbing for admin server actions: authorisation, error shaping,
 * audit logging and cache invalidation.
 */

export function actionError(code: string, message: string): ActionResult<never> {
  return { success: false, error: { code, message } };
}

/**
 * Turns a Postgres error into something the baker can act on.
 *
 * Raw driver messages ("duplicate key value violates unique constraint
 * products_sku_key") are useless to a non-technical user and leak schema
 * detail, so the common ones are translated and everything else falls back to
 * a generic sentence. The real error is always logged.
 */
export function describeDatabaseError(error: PostgrestError, subject = "change"): string {
  console.error(`[admin] ${subject} failed:`, error.code, error.message, error.details);

  switch (error.code) {
    case "23505":
      // Unique violation — almost always a duplicate SKU or slug.
      if (error.message.includes("sku")) {
        return "That product code is already used by another product.";
      }
      if (error.message.includes("slug")) {
        return "That web address (slug) is already taken. Try a different one.";
      }
      return "One of these values must be unique and is already in use.";
    case "23503":
      return "That item is still linked to something else, so it cannot be removed yet.";
    case "23514":
      return "One of the values is outside the allowed range. Please check and try again.";
    case "42501":
      return "You do not have permission to make that change.";
    default:
      return `Could not save the ${subject}. Please try again.`;
  }
}

/**
 * Authorisation gate for every admin server action.
 *
 * Server actions are directly callable endpoints — being rendered inside an
 * already-protected page proves nothing about who invoked them — so each one
 * re-checks the session here. RLS then enforces the same rule at the database.
 */
export async function withAdmin<T>(
  run: (session: AdminSession) => Promise<ActionResult<T>>,
): Promise<ActionResult<T>> {
  const session = await getAdminSession();

  if (!session) {
    return actionError("UNAUTHORIZED", "Your session has expired. Please sign in again.");
  }

  try {
    return await run(session);
  } catch (error) {
    console.error("[admin] unhandled action error:", error);
    return actionError("SERVER_ERROR", "Something went wrong. Please try again.");
  }
}

/**
 * Append-only activity log.
 *
 * Written with the service role because `admin_activity_logs` deliberately has
 * no INSERT policy for authenticated users — history that the client can write
 * (or rewrite) is not much of an audit trail.
 *
 * Never throws: failing to log must not fail the business operation it records.
 */
export async function logActivity(
  userId: string,
  action: string,
  entityType: string,
  entityId: string | null,
  metadata: Record<string, Json> = {},
): Promise<void> {
  if (!hasServiceRoleKey()) return;

  try {
    const supabase = createAdminSupabaseClient();
    await supabase.from("admin_activity_logs").insert({
      user_id: userId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      metadata,
    });
  } catch (error) {
    console.error("[admin] audit log failed:", error);
  }
}

/**
 * Refresh the public pages affected by an admin change.
 *
 * Public pages are statically rendered with a 5-minute revalidate window; this
 * is what makes a change appear immediately instead of at the end of it.
 * Over-invalidating slightly is much cheaper than the baker publishing an
 * update and not seeing it.
 */
export function revalidatePublic(
  scope: "catalog" | "content" | "posts" | "collections" | "testimonials" | "all" = "all",
): void {
  revalidatePath("/", "page");

  if (scope === "catalog" || scope === "all") {
    revalidatePath("/gallery");
    revalidatePath("/products/[slug]", "page");
    revalidatePath("/sitemap.xml");
  }

  if (scope === "content" || scope === "all") {
    revalidatePath("/about");
    revalidatePath("/contact");
    revalidatePath("/custom-order");
    revalidatePath("/", "layout");
  }

  if (scope === "posts" || scope === "all") {
    revalidatePath("/gallery");
    revalidatePath("/about");
  }

  if (scope === "collections" || scope === "testimonials" || scope === "all") {
    revalidatePath("/");
  }
}

/** Refresh an admin screen after a mutation. */
export function revalidateAdmin(path: string): void {
  revalidatePath(path);
}

/** Reads a checkbox out of FormData — absent means unchecked. */
export function formBool(formData: FormData, key: string): boolean {
  const value = formData.get(key);
  return value === "on" || value === "true";
}

/** Reads a trimmed string, or undefined when blank. */
export function formString(formData: FormData, key: string): string | undefined {
  const value = formData.get(key);
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}
