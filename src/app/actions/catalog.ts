"use server";

import { redirect } from "next/navigation";

import {
  actionError,
  describeDatabaseError,
  logActivity,
  revalidateAdmin,
  revalidatePublic,
  withAdmin,
} from "@/lib/admin/actions";
import { categorySchema, collectionSchema, productSchema } from "@/lib/validation/admin";
import { slugify } from "@/lib/utils";
import type { ActionResult } from "@/types/domain";

/**
 * Catalogue mutations: categories, products, product media, collections.
 *
 * Each action re-authorises through withAdmin(), validates with Zod, writes
 * through the caller's RLS-bound client, records an audit entry for the
 * changes that matter, and invalidates the public pages that render the data.
 */

type FormResult = ActionResult<{ id: string }>;

function fieldsFrom(formData: FormData): Record<string, FormDataEntryValue | undefined> {
  return Object.fromEntries(formData.entries());
}

// --- Categories -------------------------------------------------------------
export async function saveCategoryAction(
  _prev: FormResult | null,
  formData: FormData,
): Promise<FormResult> {
  return withAdmin(async ({ supabase, user }) => {
    const raw = fieldsFrom(formData);
    // Auto-derive the slug when the field is left blank, so the baker never
    // has to think about URLs.
    if (!raw.slug && typeof raw.name === "string") raw.slug = slugify(raw.name);

    const parsed = categorySchema.safeParse(raw);
    if (!parsed.success) {
      return actionError(
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "Please check the form.",
      );
    }

    const { id, ...values } = parsed.data;

    const { data, error } = id
      ? await supabase.from("categories").update(values).eq("id", id).select("id").single()
      : await supabase.from("categories").insert(values).select("id").single();

    if (error || !data) {
      return actionError("DB_ERROR", describeDatabaseError(error!, "category"));
    }

    await logActivity(user.id, id ? "category.update" : "category.create", "category", data.id, {
      name: values.name,
    });

    revalidateAdmin("/admin/categories");
    revalidatePublic("catalog");
    return { success: true, data: { id: data.id } };
  });
}

export async function deleteCategoryAction(id: string): Promise<ActionResult<undefined>> {
  return withAdmin(async ({ supabase, user }) => {
    // Categories are referenced by products (ON DELETE SET NULL), so removing
    // one would silently orphan its products. Hiding is almost always what was
    // actually meant, and it is reversible.
    const { count } = await supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("category_id", id);

    if ((count ?? 0) > 0) {
      return actionError(
        "IN_USE",
        `This category still has ${count} product${count === 1 ? "" : "s"}. Move them first, or hide the category instead.`,
      );
    }

    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) return actionError("DB_ERROR", describeDatabaseError(error, "category"));

    await logActivity(user.id, "category.delete", "category", id);
    revalidateAdmin("/admin/categories");
    revalidatePublic("catalog");
    return { success: true, data: undefined };
  });
}

// --- Products ---------------------------------------------------------------
export async function saveProductAction(
  _prev: FormResult | null,
  formData: FormData,
): Promise<FormResult> {
  const result = await withAdmin<{ id: string }>(async ({ supabase, user }) => {
    const raw = fieldsFrom(formData);
    if (!raw.slug && typeof raw.name === "string") raw.slug = slugify(raw.name);

    const parsed = productSchema.safeParse(raw);
    if (!parsed.success) {
      return actionError(
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "Please check the form.",
      );
    }

    const { id, ...values } = parsed.data;

    const { data, error } = id
      ? await supabase.from("products").update(values).eq("id", id).select("id").single()
      : await supabase.from("products").insert(values).select("id").single();

    if (error || !data) {
      return actionError("DB_ERROR", describeDatabaseError(error!, "product"));
    }

    await logActivity(user.id, id ? "product.update" : "product.create", "product", data.id, {
      name: values.name,
      sku: values.sku,
    });

    revalidateAdmin("/admin/products");
    revalidatePublic("catalog");
    return { success: true, data: { id: data.id } };
  });

  // A new product lands on its edit screen so media can be attached straight
  // away; an edit stays put so the baker keeps their place.
  if (result.success && !formData.get("id")) {
    redirect(`/admin/products/${result.data.id}?created=1`);
  }

  return result;
}

/** Archive rather than delete — orders and enquiries still reference products. */
export async function setProductActiveAction(
  id: string,
  isActive: boolean,
): Promise<ActionResult<undefined>> {
  return withAdmin(async ({ supabase, user }) => {
    const { error } = await supabase.from("products").update({ is_active: isActive }).eq("id", id);
    if (error) return actionError("DB_ERROR", describeDatabaseError(error, "product"));

    await logActivity(user.id, isActive ? "product.restore" : "product.archive", "product", id);
    revalidateAdmin("/admin/products");
    revalidatePublic("catalog");
    return { success: true, data: undefined };
  });
}

export async function setAvailableTodayAction(
  id: string,
  available: boolean,
): Promise<ActionResult<undefined>> {
  return withAdmin(async ({ supabase }) => {
    const { error } = await supabase
      .from("products")
      .update({ available_today: available })
      .eq("id", id);

    if (error) return actionError("DB_ERROR", describeDatabaseError(error, "availability"));

    revalidateAdmin("/admin/available-today");
    revalidateAdmin("/admin");
    revalidatePublic("catalog");
    return { success: true, data: undefined };
  });
}

/** Clears the whole "Baking Today" list in one go, at the end of the day. */
export async function clearAvailableTodayAction(): Promise<ActionResult<undefined>> {
  return withAdmin(async ({ supabase, user }) => {
    const { error } = await supabase
      .from("products")
      .update({ available_today: false })
      .eq("available_today", true);

    if (error) return actionError("DB_ERROR", describeDatabaseError(error, "availability"));

    await logActivity(user.id, "product.clear_available_today", "product", null);
    revalidateAdmin("/admin/available-today");
    revalidatePublic("catalog");
    return { success: true, data: undefined };
  });
}

// --- Product media ----------------------------------------------------------
export async function attachProductMediaAction(
  _prev: ActionResult<undefined> | null,
  formData: FormData,
): Promise<ActionResult<undefined>> {
  return withAdmin(async ({ supabase }) => {
    const productId = String(formData.get("product_id") ?? "");
    const mediaUrl = String(formData.get("media_url") ?? "");
    const storagePath = String(formData.get("storage_path") ?? "");
    const type = formData.get("type") === "video" ? "video" : "image";
    const altText = String(formData.get("alt_text") ?? "").trim() || null;

    if (!productId || !mediaUrl || !storagePath) {
      return actionError("VALIDATION_ERROR", "Please choose a file from the media library.");
    }

    const { count } = await supabase
      .from("product_media")
      .select("id", { count: "exact", head: true })
      .eq("product_id", productId);

    const existing = count ?? 0;

    const { error } = await supabase.from("product_media").insert({
      product_id: productId,
      type,
      storage_path: storagePath,
      media_url: mediaUrl,
      thumbnail_url: (formData.get("thumbnail_url") as string) || mediaUrl,
      alt_text: altText,
      // The first asset attached becomes the primary one automatically —
      // a product with media but no primary would render no image at all.
      is_primary: existing === 0,
      sort_order: existing,
    });

    if (error) return actionError("DB_ERROR", describeDatabaseError(error, "image"));

    revalidateAdmin(`/admin/products/${productId}`);
    revalidatePublic("catalog");
    return { success: true, data: undefined };
  });
}

export async function setPrimaryMediaAction(
  mediaId: string,
  productId: string,
): Promise<ActionResult<undefined>> {
  return withAdmin(async ({ supabase }) => {
    // A partial unique index enforces one primary per product, so the old one
    // must be cleared before the new one is set.
    const { error: clearError } = await supabase
      .from("product_media")
      .update({ is_primary: false })
      .eq("product_id", productId)
      .eq("is_primary", true);

    if (clearError) return actionError("DB_ERROR", describeDatabaseError(clearError, "image"));

    const { error } = await supabase
      .from("product_media")
      .update({ is_primary: true })
      .eq("id", mediaId);

    if (error) return actionError("DB_ERROR", describeDatabaseError(error, "image"));

    revalidateAdmin(`/admin/products/${productId}`);
    revalidatePublic("catalog");
    return { success: true, data: undefined };
  });
}

export async function removeProductMediaAction(
  mediaId: string,
  productId: string,
): Promise<ActionResult<undefined>> {
  return withAdmin(async ({ supabase }) => {
    const { data: removed } = await supabase
      .from("product_media")
      .select("is_primary")
      .eq("id", mediaId)
      .maybeSingle();

    const { error } = await supabase.from("product_media").delete().eq("id", mediaId);
    if (error) return actionError("DB_ERROR", describeDatabaseError(error, "image"));

    // Promote the next asset so the product does not lose its picture.
    if (removed?.is_primary) {
      const { data: next } = await supabase
        .from("product_media")
        .select("id")
        .eq("product_id", productId)
        .order("sort_order", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (next) {
        await supabase.from("product_media").update({ is_primary: true }).eq("id", next.id);
      }
    }

    revalidateAdmin(`/admin/products/${productId}`);
    revalidatePublic("catalog");
    return { success: true, data: undefined };
  });
}

// --- Collections ------------------------------------------------------------
export async function saveCollectionAction(
  _prev: FormResult | null,
  formData: FormData,
): Promise<FormResult> {
  return withAdmin(async ({ supabase, user }) => {
    const raw = fieldsFrom(formData);
    if (!raw.slug && typeof raw.name === "string") raw.slug = slugify(raw.name);

    const parsed = collectionSchema.safeParse(raw);
    if (!parsed.success) {
      return actionError(
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "Please check the form.",
      );
    }

    const { id, ...values } = parsed.data;

    const { data, error } = id
      ? await supabase.from("collections").update(values).eq("id", id).select("id").single()
      : await supabase.from("collections").insert(values).select("id").single();

    if (error || !data) {
      return actionError("DB_ERROR", describeDatabaseError(error!, "collection"));
    }

    // Membership is submitted as the full desired set, so it is replaced
    // wholesale rather than diffed — simpler, and cannot drift.
    const productIds = formData.getAll("product_ids").map(String).filter(Boolean);

    await supabase.from("collection_products").delete().eq("collection_id", data.id);

    if (productIds.length > 0) {
      const { error: linkError } = await supabase.from("collection_products").insert(
        productIds.map((productId, index) => ({
          collection_id: data.id,
          product_id: productId,
          sort_order: index,
        })),
      );
      if (linkError) {
        return actionError("DB_ERROR", describeDatabaseError(linkError, "collection"));
      }
    }

    await logActivity(
      user.id,
      id ? "collection.update" : "collection.create",
      "collection",
      data.id,
      { name: values.name, products: productIds.length },
    );

    revalidateAdmin("/admin/collections");
    revalidatePublic("collections");
    return { success: true, data: { id: data.id } };
  });
}

export async function deleteCollectionAction(id: string): Promise<ActionResult<undefined>> {
  return withAdmin(async ({ supabase, user }) => {
    const { error } = await supabase.from("collections").delete().eq("id", id);
    if (error) return actionError("DB_ERROR", describeDatabaseError(error, "collection"));

    await logActivity(user.id, "collection.delete", "collection", id);
    revalidateAdmin("/admin/collections");
    revalidatePublic("collections");
    return { success: true, data: undefined };
  });
}
