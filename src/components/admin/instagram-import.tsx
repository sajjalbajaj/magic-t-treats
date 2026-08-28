"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { AlertTriangle, Check, Link2 } from "lucide-react";

import { InstagramIcon } from "@/components/ui/brand-icons";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { useActionForm } from "@/components/admin/use-action-form";
import { useToast } from "@/components/ui/toast";
import {
  importInstagramProductAction,
  previewInstagramPostAction,
  type InstagramImportPreview,
} from "@/app/actions/instagram";
import { slugify } from "@/lib/utils";
import type { Category } from "@/types/domain";

/**
 * Turns an Instagram post into a treat.
 *
 * Two steps on purpose: fetch and review, then save. The fetch is best-effort
 * — Instagram often refuses — so the review step is where the admin fills any
 * gaps rather than discovering an empty product afterwards.
 */
export function InstagramImport({ categories }: { categories: Category[] }) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [preview, setPreview] = useState<InstagramImportPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const { toast } = useToast();

  const { state, formAction, pending: saving } = useActionForm(
    importInstagramProductAction,
    {
      successMessage: "Treat imported from Instagram.",
      onSuccess: () => {
        setOpen(false);
        setPreview(null);
        setUrl("");
      },
    },
  );

  const lookUp = () => {
    setError(null);
    startTransition(async () => {
      const result = await previewInstagramPostAction(url);
      if (result.success) {
        setPreview(result.data);
        if (result.data.alreadyImported) {
          toast("That post is already a treat.", "info");
        }
      } else {
        setError(result.error.message);
        setPreview(null);
      }
    });
  };

  return (
    <>
      <Button variant="adminGhost" onClick={() => setOpen(true)}>
        <InstagramIcon className="size-4" aria-hidden="true" />
        Import from Instagram
      </Button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Import a treat from Instagram"
        description="Paste a post link. We'll pull the photo and caption where Instagram allows it, and you fill in the rest."
        size="lg"
      >
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <Field label="Instagram post or reel link" error={error}>
              {({ id, invalid }) => (
                <Input
                  id={id}
                  invalid={invalid}
                  value={url}
                  onChange={(event) => setUrl(event.target.value)}
                  placeholder="https://www.instagram.com/p/ABC123/"
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      lookUp();
                    }
                  }}
                />
              )}
            </Field>
            <Button
              variant="adminGhost"
              className="w-fit"
              loading={pending}
              loadingLabel="Looking up…"
              onClick={lookUp}
              disabled={url.trim().length === 0}
            >
              <Link2 className="size-4" aria-hidden="true" />
              Fetch post
            </Button>
          </div>

          {preview ? (
            <form action={formAction} className="flex flex-col gap-4 border-t border-admin-line pt-4">
              <input type="hidden" name="instagram_url" value={preview.postUrl} />
              <input type="hidden" name="image_url" value={preview.imageUrl ?? ""} />

              {preview.warning ? (
                <p className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning-bg px-3 py-2 text-xs text-warning">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                  {preview.warning} The link is still saved, so the treat will point at the post.
                </p>
              ) : (
                <p className="flex items-center gap-2 text-xs font-medium text-success">
                  <Check className="size-4" aria-hidden="true" />
                  Photo and caption pulled from Instagram.
                </p>
              )}

              <div className="flex gap-4">
                <div className="relative size-28 shrink-0 overflow-hidden rounded-lg border border-admin-line bg-admin-bg">
                  {preview.imageUrl ? (
                    // Remote Instagram CDN preview only. On save the file is
                    // copied into our own storage, because these URLs expire.
                    <Image
                      src={preview.imageUrl}
                      alt=""
                      fill
                      sizes="112px"
                      unoptimized
                      className="object-cover"
                    />
                  ) : (
                    <span className="grid size-full place-items-center text-[11px] text-admin-muted">
                      No photo
                    </span>
                  )}
                </div>

                <div className="flex min-w-0 flex-1 flex-col gap-3">
                  <Field label="Treat name" required>
                    {({ id }) => (
                      <Input
                        id={id}
                        name="name"
                        required
                        defaultValue={preview.suggestedName}
                        placeholder="e.g. Scoopable Cookies"
                      />
                    )}
                  </Field>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Product code" required>
                      {({ id }) => (
                        <Input
                          id={id}
                          name="sku"
                          required
                          defaultValue={
                            preview.suggestedName
                              ? `IG-${slugify(preview.suggestedName).slice(0, 10).toUpperCase()}`
                              : ""
                          }
                        />
                      )}
                    </Field>
                    <Field label="Starting price">
                      {({ id }) => (
                        <Input id={id} name="starting_price" type="number" min="0" step="1" />
                      )}
                    </Field>
                  </div>
                </div>
              </div>

              <Field label="Category">
                {({ id }) => (
                  <Select id={id} name="category_id" defaultValue="">
                    <option value="">No category</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>

              <Field
                label="Short description"
                hint="Prefilled from the caption. Trim it to one clear line."
              >
                {({ id }) => (
                  <Textarea
                    id={id}
                    name="short_description"
                    rows={3}
                    defaultValue={preview.caption?.slice(0, 300) ?? ""}
                  />
                )}
              </Field>

              {state && !state.success ? (
                <p role="alert" className="text-sm font-medium text-danger">
                  {state.error.message}
                </p>
              ) : null}

              <div className="flex justify-end gap-2">
                <Button variant="adminGhost" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="admin"
                  loading={saving}
                  loadingLabel="Importing…"
                  disabled={preview.alreadyImported}
                >
                  {preview.alreadyImported ? "Already imported" : "Create treat"}
                </Button>
              </div>
            </form>
          ) : null}
        </div>
      </Modal>
    </>
  );
}
