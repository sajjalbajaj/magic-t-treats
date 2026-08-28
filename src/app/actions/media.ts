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
import { mediaBucket, mediaFolders, uploadDefaults } from "@/config/site";
import { getSettings } from "@/lib/data/content";
import {
  buildStoragePath,
  limitsFrom,
  validateFileSignature,
  validateUploadMetadata,
} from "@/lib/media/validate";
import { mediaAssetSchema } from "@/lib/validation/admin";
import type { ActionResult } from "@/types/domain";
import type { MediaAssetRow, MediaFolder } from "@/types/database";

/**
 * Media uploads.
 *
 * Uploading through a server action rather than straight from the browser is
 * intentional: it is the only way to inspect the file's magic bytes before it
 * reaches storage. A direct-to-Supabase upload would trust whatever MIME type
 * the client declared.
 */
export async function uploadMediaAction(
  _prev: ActionResult<MediaAssetRow> | null,
  formData: FormData,
): Promise<ActionResult<MediaAssetRow>> {
  return withAdmin(async ({ supabase, user }) => {
    const file = formData.get("file");
    const folderRaw = String(formData.get("folder") ?? "products");
    const altText = String(formData.get("alt_text") ?? "").trim() || null;

    if (!(file instanceof File)) {
      return actionError("VALIDATION_ERROR", "Please choose a file to upload.");
    }

    if (!(mediaFolders as readonly string[]).includes(folderRaw)) {
      return actionError("VALIDATION_ERROR", "Unknown folder.");
    }
    const folder = folderRaw as MediaFolder;

    // Limits are configurable from Settings, with the config file as fallback.
    const uploads = await getSettings("uploads").catch(() => null);
    const limits = uploads
      ? limitsFrom(uploads)
      : {
          maxImageBytes: uploadDefaults.maxImageBytes,
          maxVideoBytes: uploadDefaults.maxVideoBytes,
        };

    const metadata = validateUploadMetadata(
      { name: file.name, type: file.type, size: file.size },
      limits,
    );
    if (!metadata.ok) return actionError("VALIDATION_ERROR", metadata.message);

    const buffer = Buffer.from(await file.arrayBuffer());

    const signature = validateFileSignature(
      new Uint8Array(buffer.subarray(0, 16)),
      metadata.type,
    );
    if (!signature.ok) return actionError("VALIDATION_ERROR", signature.message);

    const storagePath = buildStoragePath(folder, file.name, randomUUID().slice(0, 8));

    const { error: uploadError } = await supabase.storage
      .from(mediaBucket)
      .upload(storagePath, buffer, {
        contentType: file.type,
        cacheControl: "31536000",
        upsert: false,
      });

    if (uploadError) {
      console.error("[media] upload failed:", uploadError.message);
      return actionError("UPLOAD_ERROR", "The upload did not complete. Please try again.");
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(mediaBucket).getPublicUrl(storagePath);

    const { data, error } = await supabase
      .from("media_assets")
      .insert({
        bucket: mediaBucket,
        storage_path: storagePath,
        public_url: publicUrl,
        folder,
        type: metadata.type,
        file_name: file.name,
        mime_type: file.type,
        size_bytes: file.size,
        alt_text: altText,
        uploaded_by: user.id,
      })
      .select("*")
      .single();

    if (error || !data) {
      // Do not leave an orphan object behind if the catalogue row failed.
      await supabase.storage.from(mediaBucket).remove([storagePath]);
      return actionError("DB_ERROR", describeDatabaseError(error!, "upload"));
    }

    revalidateAdmin("/admin/media");
    return { success: true, data };
  });
}

export async function updateMediaAction(
  _prev: ActionResult<undefined> | null,
  formData: FormData,
): Promise<ActionResult<undefined>> {
  return withAdmin(async ({ supabase }) => {
    const parsed = mediaAssetSchema.safeParse({
      id: formData.get("id"),
      folder: formData.get("folder"),
      alt_text: formData.get("alt_text"),
    });

    if (!parsed.success || !parsed.data.id) {
      return actionError("VALIDATION_ERROR", "Please check the details.");
    }

    const { id, ...values } = parsed.data;

    const { error } = await supabase.from("media_assets").update(values).eq("id", id);
    if (error) return actionError("DB_ERROR", describeDatabaseError(error, "media"));

    revalidateAdmin("/admin/media");
    return { success: true, data: undefined };
  });
}

/**
 * Deletes an asset — but only when nothing references it.
 *
 * The usage count is computed in Postgres across products, posts, categories,
 * collections and testimonials. Without it, deleting a file from the library
 * would silently blank an image somewhere on the live site.
 */
export async function deleteMediaAction(id: string): Promise<ActionResult<undefined>> {
  return withAdmin(async ({ supabase, user }) => {
    const { data: asset } = await supabase
      .from("media_assets")
      .select("storage_path, public_url, bucket, file_name")
      .eq("id", id)
      .maybeSingle();

    if (!asset) return actionError("NOT_FOUND", "That file no longer exists.");

    const { data: usage, error: usageError } = await supabase.rpc("media_asset_usage", {
      asset_url: asset.public_url,
      asset_path: asset.storage_path,
    });

    if (usageError) {
      console.error("[media] usage check failed:", usageError.message);
      return actionError("SERVER_ERROR", "Could not check whether this file is in use.");
    }

    if ((usage ?? 0) > 0) {
      return actionError(
        "IN_USE",
        `This file is used in ${usage} place${usage === 1 ? "" : "s"}. Remove it there first.`,
      );
    }

    const { error: storageError } = await supabase.storage
      .from(asset.bucket)
      .remove([asset.storage_path]);

    if (storageError) {
      console.error("[media] storage delete failed:", storageError.message);
    }

    const { error } = await supabase.from("media_assets").delete().eq("id", id);
    if (error) return actionError("DB_ERROR", describeDatabaseError(error, "media"));

    await logActivity(user.id, "media.delete", "media_asset", id, { file: asset.file_name });

    revalidateAdmin("/admin/media");
    revalidatePublic("all");
    return { success: true, data: undefined };
  });
}
