"use client";

import { useState } from "react";
import Image from "next/image";
import { Film, Star, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, EmptyState } from "@/components/ui/primitives";
import { MediaLibraryDialog } from "@/components/admin/media-picker";
import { ActionButton } from "@/components/admin/action-controls";
import { useActionForm } from "@/components/admin/use-action-form";
import {
  attachProductMediaAction,
  removeProductMediaAction,
  setPrimaryMediaAction,
} from "@/app/actions/catalog";
import { cn } from "@/lib/utils";
import type { ProductMedia } from "@/types/domain";
import type { MediaAssetRow } from "@/types/database";

/**
 * Image and video manager for a product.
 *
 * Attaching is a two-step flow — pick from the library, then submit — because
 * the same file is often reused across products, and re-uploading it each time
 * would bloat storage for no reason.
 */
export function ProductMediaManager({
  productId,
  media,
  assets,
}: {
  productId: string;
  media: ProductMedia[];
  assets: MediaAssetRow[];
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pending, setPending] = useState<MediaAssetRow | null>(null);
  const { formAction, pending: submitting } = useActionForm(attachProductMediaAction, {
    successMessage: "Image added to product.",
    onSuccess: () => setPending(null),
  });

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-sans text-base font-bold text-admin-ink">Photos &amp; videos</h2>
          <p className="text-xs text-admin-muted">
            The starred item is the one shown on cards and in search results.
          </p>
        </div>
        <Button variant="adminGhost" size="sm" onClick={() => setPickerOpen(true)}>
          Add media
        </Button>
      </div>

      {media.length === 0 ? (
        <EmptyState
          title="No photos yet"
          description="Products without a photo still work, but they will show a placeholder on the website."
          action={
            <Button variant="admin" size="sm" onClick={() => setPickerOpen(true)}>
              Add the first photo
            </Button>
          }
        />
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {media.map((item) => (
            <li
              key={item.id}
              className={cn(
                "flex flex-col gap-2 rounded-lg border p-2",
                item.is_primary ? "border-admin-accent" : "border-admin-line",
              )}
            >
              <span className="relative block aspect-square overflow-hidden rounded bg-admin-bg">
                {item.type === "video" ? (
                  <span className="grid size-full place-items-center">
                    <Film className="size-6 text-admin-muted" aria-hidden="true" />
                  </span>
                ) : item.media_url ? (
                  <Image
                    src={item.media_url}
                    alt={item.alt_text ?? ""}
                    fill
                    sizes="160px"
                    className="object-cover"
                  />
                ) : null}

                {item.is_primary ? (
                  <span className="absolute left-1.5 top-1.5 grid size-6 place-items-center rounded-full bg-admin-accent">
                    <Star className="size-3 fill-white text-white" aria-hidden="true" />
                  </span>
                ) : null}
              </span>

              <div className="flex items-center justify-between gap-1">
                {!item.is_primary ? (
                  <ActionButton
                    variant="adminGhost"
                    size="sm"
                    action={setPrimaryMediaAction.bind(null, item.id, productId)}
                    successMessage="Primary image updated."
                  >
                    Make main
                  </ActionButton>
                ) : (
                  <span className="px-1 text-xs font-semibold text-admin-accent">Main</span>
                )}

                <ActionButton
                  variant="adminGhost"
                  size="sm"
                  aria-label="Remove media"
                  action={removeProductMediaAction.bind(null, item.id, productId)}
                  successMessage="Removed from product."
                  confirm="Remove this from the product? The file stays in your media library."
                  confirmTitle="Remove media"
                  confirmLabel="Remove"
                >
                  <Trash2 className="size-3.5 text-danger" aria-hidden="true" />
                </ActionButton>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Confirmation step: the chosen asset is held here until submitted. */}
      {pending ? (
        <form
          action={formAction}
          className="flex flex-col gap-3 rounded-lg border border-admin-accent/40 bg-admin-bg/60 p-3"
        >
          <input type="hidden" name="product_id" value={productId} />
          <input type="hidden" name="media_url" value={pending.public_url ?? ""} />
          <input type="hidden" name="storage_path" value={pending.storage_path} />
          <input type="hidden" name="type" value={pending.type} />
          <input type="hidden" name="thumbnail_url" value={pending.public_url ?? ""} />
          <input type="hidden" name="alt_text" value={pending.alt_text ?? ""} />

          <p className="text-sm text-admin-ink">
            Add <span className="font-semibold">{pending.file_name}</span> to this product?
          </p>

          <div className="flex gap-2">
            <Button type="submit" variant="admin" size="sm" loading={submitting}>
              Add to product
            </Button>
            <Button variant="adminGhost" size="sm" onClick={() => setPending(null)}>
              Cancel
            </Button>
          </div>
        </form>
      ) : null}

      <MediaLibraryDialog
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        assets={assets}
        accept="both"
        folder="products"
        onSelect={(asset) => {
          setPending(asset);
          setPickerOpen(false);
        }}
      />
    </Card>
  );
}
