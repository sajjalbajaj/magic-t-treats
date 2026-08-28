"use server";

import { randomUUID } from "node:crypto";

import {
  actionError,
  describeDatabaseError,
  logActivity,
  revalidateAdmin,
  revalidatePublic,
  withAdmin,
} from "@/lib/admin/actions";
import { mediaBucket } from "@/config/site";
import { fetchInstagramPreview, normaliseInstagramUrl } from "@/lib/instagram/preview";
import { buildStoragePath, validateFileSignature } from "@/lib/media/validate";
import { slugify } from "@/lib/utils";
import type { ActionResult } from "@/types/domain";

export type InstagramImportPreview = {
  postUrl: string;
  imageUrl: string | null;
  caption: string | null;
  suggestedName: string;
  alreadyImported: boolean;
  warning: string | null;
};

/** First non-empty caption line, cleaned of hashtags and emoji clutter. */
function suggestName(caption: string | null): string {
  if (!caption) return "";
  const firstLine =
    caption
      .split("\n")
      .map((line) => line.trim())
      .find((line) => line.length > 0) ?? "";

  return firstLine
    .replace(/#[\w]+/g, "")
    .replace(/\s{2,}/g, " ")
    .replace(/^[^\p{L}\p{N}]+/u, "")
    .trim()
    .slice(0, 70);
}

/**
 * Step 1 — look up a post so the admin can review it before anything is saved.
 *
 * Deliberately does not write: an import that silently created a half-formed
 * product from a caption would be worse than typing it. The admin confirms.
 */
export async function previewInstagramPostAction(
  rawUrl: string,
): Promise<ActionResult<InstagramImportPreview>> {
  return withAdmin(async ({ supabase }) => {
    const postUrl = normaliseInstagramUrl(rawUrl);
    if (!postUrl) {
      return actionError(
        "VALIDATION_ERROR",
        "Paste a link to a post or reel, e.g. https://www.instagram.com/p/ABC123/",
      );
    }

    const { data: existing } = await supabase
      .from("products")
      .select("id, name")
      .eq("instagram_url", postUrl)
      .maybeSingle();

    const preview = await fetchInstagramPreview(postUrl);

    // Annotated so the early-return branch does not narrow `imageUrl` to
    // `null` and make the two return shapes incompatible.
    const data: InstagramImportPreview = preview.ok
      ? {
          postUrl,
          imageUrl: preview.data.imageUrl,
          caption: preview.data.caption,
          suggestedName: suggestName(preview.data.caption),
          alreadyImported: Boolean(existing),
          warning: null,
        }
      : {
          // Import can still proceed — the admin supplies the photo. The post
          // link is the part that matters for the enquiry message.
          postUrl,
          imageUrl: null,
          caption: null,
          suggestedName: "",
          alreadyImported: Boolean(existing),
          warning: preview.reason,
        };

    return { success: true, data };
  });
}

/**
 * Copies the post's image into our own storage bucket.
 *
 * Instagram's CDN URLs are signed and expire within days, so storing one would
 * leave a product with a broken photo shortly after import. This downloads it
 * once and re-hosts it, which also keeps the public site off a third-party CDN.
 */
async function mirrorImage(
  supabase: Awaited<ReturnType<typeof import("@/lib/supabase/server").createServerSupabaseClient>>,
  imageUrl: string,
): Promise<{ publicUrl: string; storagePath: string } | null> {
  try {
    const response = await fetch(imageUrl, { signal: AbortSignal.timeout(12000) });
    if (!response.ok) return null;

    const contentType = (response.headers.get("content-type") ?? "").split(";")[0]?.trim() ?? "";
    if (!contentType.startsWith("image/")) return null;

    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.byteLength === 0 || buffer.byteLength > 12 * 1024 * 1024) return null;

    // Same signature check as a manual upload: a remote URL is no more
    // trustworthy than a browser-supplied file.
    const signature = validateFileSignature(new Uint8Array(buffer.subarray(0, 16)), "image");
    if (!signature.ok) return null;

    const extension = contentType === "image/png" ? "png" : "jpg";
    const storagePath = buildStoragePath(
      "products",
      `instagram-${Date.now()}.${extension}`,
      randomUUID().slice(0, 8),
    );

    const { error } = await supabase.storage
      .from(mediaBucket)
      .upload(storagePath, buffer, { contentType, cacheControl: "31536000", upsert: false });

    if (error) return null;

    const {
      data: { publicUrl },
    } = supabase.storage.from(mediaBucket).getPublicUrl(storagePath);

    return { publicUrl, storagePath };
  } catch {
    return null;
  }
}

/**
 * Step 2 — create the treat from the reviewed values.
 *
 * The admin has already edited the name, price and description by this point;
 * this only handles the parts that come from Instagram.
 */
export async function importInstagramProductAction(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  return withAdmin(async ({ supabase, user }) => {
    const postUrl = normaliseInstagramUrl(String(formData.get("instagram_url") ?? ""));
    const name = String(formData.get("name") ?? "").trim();
    const sku = String(formData.get("sku") ?? "").trim().toUpperCase();
    const shortDescription = String(formData.get("short_description") ?? "").trim();
    const remoteImage = String(formData.get("image_url") ?? "").trim();
    const priceRaw = String(formData.get("starting_price") ?? "").trim();
    const categoryId = String(formData.get("category_id") ?? "").trim();

    if (!postUrl) return actionError("VALIDATION_ERROR", "That Instagram link is not valid.");
    if (name.length < 2) return actionError("VALIDATION_ERROR", "Please give the treat a name.");
    if (!/^[A-Za-z0-9-]{2,40}$/.test(sku)) {
      return actionError("VALIDATION_ERROR", "Product code: letters, numbers and hyphens only.");
    }

    const { data: existing } = await supabase
      .from("products")
      .select("id")
      .eq("instagram_url", postUrl)
      .maybeSingle();

    if (existing) {
      return actionError(
        "DUPLICATE",
        "That post has already been imported as a treat.",
      );
    }

    const price = priceRaw ? Number(priceRaw) : null;

    const { data: product, error } = await supabase
      .from("products")
      .insert({
        sku,
        name,
        slug: slugify(name) || sku.toLowerCase(),
        short_description: shortDescription || null,
        starting_price: price !== null && Number.isFinite(price) && price >= 0 ? price : null,
        category_id: categoryId || null,
        instagram_url: postUrl,
        is_active: true,
      })
      .select("id")
      .single();

    if (error || !product) {
      return actionError("DB_ERROR", describeDatabaseError(error!, "treat"));
    }

    if (remoteImage) {
      const mirrored = await mirrorImage(supabase, remoteImage);
      if (mirrored) {
        await supabase.from("product_media").insert({
          product_id: product.id,
          type: "image",
          storage_path: mirrored.storagePath,
          media_url: mirrored.publicUrl,
          thumbnail_url: mirrored.publicUrl,
          alt_text: name,
          is_primary: true,
          sort_order: 0,
        });

        await supabase.from("media_assets").insert({
          bucket: mediaBucket,
          storage_path: mirrored.storagePath,
          public_url: mirrored.publicUrl,
          folder: "products",
          type: "image",
          file_name: `${slugify(name) || "instagram"}.jpg`,
          mime_type: "image/jpeg",
          size_bytes: 0,
          alt_text: name,
          uploaded_by: user.id,
        });
      }
    }

    await logActivity(user.id, "product.import_instagram", "product", product.id, {
      name,
      post: postUrl,
    });

    revalidateAdmin("/admin/products");
    revalidatePublic("catalog");
    return { success: true, data: { id: product.id } };
  });
}
