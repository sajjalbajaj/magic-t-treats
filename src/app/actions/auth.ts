"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { loginSchema } from "@/lib/validation/admin";
import type { ActionResult } from "@/types/domain";

/**
 * Sign in.
 *
 * Two gates, in order: Supabase Auth must accept the credentials, and the
 * resulting user must have an active row in admin_users. A valid account that
 * is not on the admin roster is signed straight back out — otherwise a stray
 * auth user would hold a session cookie for a dashboard they cannot use, and
 * every page would bounce them in a confusing loop.
 *
 * Failures return one deliberately vague message. Distinguishing "no such
 * user" from "wrong password" hands an attacker a way to enumerate accounts.
 */
export async function signInAction(
  _prev: ActionResult<{ redirectTo: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ redirectTo: string }>> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: parsed.error.issues[0]?.message ?? "Please check your details.",
      },
    };
  }

  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error || !data.user) {
    return {
      success: false,
      error: { code: "UNAUTHORIZED", message: "Those details did not match. Please try again." },
    };
  }

  const { data: adminRow } = await supabase
    .from("admin_users")
    .select("user_id, is_active")
    .eq("user_id", data.user.id)
    .maybeSingle();

  if (!adminRow || !adminRow.is_active) {
    await supabase.auth.signOut();
    return {
      success: false,
      error: {
        code: "UNAUTHORIZED",
        message: "This account does not have dashboard access.",
      },
    };
  }

  const rawRedirect = formData.get("redirectTo");
  // Only same-site paths, so ?redirectTo=https://evil.example cannot turn the
  // login form into an open redirect.
  const redirectTo =
    typeof rawRedirect === "string" &&
    rawRedirect.startsWith("/admin") &&
    !rawRedirect.startsWith("//")
      ? rawRedirect
      : "/admin";

  revalidatePath("/admin", "layout");
  return { success: true, data: { redirectTo } };
}

export async function signOutAction(): Promise<void> {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
  revalidatePath("/admin", "layout");
  redirect("/auth/login");
}
