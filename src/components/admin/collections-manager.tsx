"use client";

import { useState } from "react";
import { Gift } from "lucide-react";

import { ActionButton } from "@/components/admin/action-controls";
import { MediaPicker } from "@/components/admin/media-picker";
import { Button } from "@/components/ui/button";
import { Badge, Card, EmptyState } from "@/components/ui/primitives";
import { Checkbox, Field, Input, Textarea } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { useActionForm } from "@/components/admin/use-action-form";
import { deleteCollectionAction, saveCollectionAction } from "@/app/actions/catalog";
import { formatDate, slugify } from "@/lib/utils";
import type { CollectionRow, MediaAssetRow } from "@/types/database";
import { MediaFrame } from "@/components/ui/media-frame";

type CollectionWithProducts = CollectionRow & { productIds: string[] };
type ProductOption = { id: string; name: string; sku: string };

export function CollectionsManager({
  collections,
  products,
  assets,
}: {
  collections: CollectionWithProducts[];
  products: ProductOption[];
  assets: MediaAssetRow[];
}) {
  const [editing, setEditing] = useState<CollectionWithProducts | null>(null);
  const [creating, setCreating] = useState(false);

  return (
    <>
      <div className="flex justify-end">
        <Button variant="admin" onClick={() => setCreating(true)}>
          Add collection
        </Button>
      </div>

      {collections.length === 0 ? (
        <EmptyState
          title="No festive collections are active"
          description="Group treats into a seasonal set, such as Diwali, Rakhi or corporate gifting, and it appears on the homepage."
          icon={<Gift className="size-6" aria-hidden="true" />}
          action={
            <Button variant="admin" onClick={() => setCreating(true)}>
              Create a collection
            </Button>
          }
        />
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {collections.map((collection) => (
            <li key={collection.id}>
              <Card className="flex h-full flex-col gap-3">
                <div className="flex gap-3">
                  <span className="relative block size-20 shrink-0 overflow-hidden rounded-lg bg-admin-bg">
                    {collection.cover_image ? (
                      <MediaFrame
                        src={collection.cover_image}
                        alt=""
                        compact
                        rounded={false}
                        className="size-full"
                        sizes="80px"
                      />
                    ) : null}
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-admin-ink">{collection.name}</p>
                      {collection.featured ? <Badge tone="accent">Featured</Badge> : null}
                      {collection.active ? (
                        <Badge tone="success">Active</Badge>
                      ) : (
                        <Badge tone="neutral">Hidden</Badge>
                      )}
                    </div>
                    {collection.description ? (
                      <p className="clamp-2 mt-1 text-xs leading-relaxed text-admin-muted">
                        {collection.description}
                      </p>
                    ) : null}
                    <p className="mt-1.5 text-xs text-admin-muted">
                      {collection.productIds.length} product
                      {collection.productIds.length === 1 ? "" : "s"}
                      {collection.available_until
                        ? ` · until ${formatDate(collection.available_until)}`
                        : ""}
                    </p>
                  </div>
                </div>

                <div className="flex justify-end gap-1 border-t border-admin-line pt-3">
                  <Button variant="adminGhost" size="sm" onClick={() => setEditing(collection)}>
                    Edit
                  </Button>
                  <ActionButton
                    variant="adminGhost"
                    size="sm"
                    className="text-danger"
                    action={deleteCollectionAction.bind(null, collection.id)}
                    successMessage="Collection deleted."
                    confirm="Delete this collection? The products in it are not affected."
                    confirmTitle="Delete collection"
                    confirmLabel="Delete"
                  >
                    Delete
                  </ActionButton>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <CollectionDialog
        open={creating}
        collection={null}
        products={products}
        assets={assets}
        onClose={() => setCreating(false)}
      />
      <CollectionDialog
        key={editing?.id ?? "none"}
        open={editing !== null}
        collection={editing}
        products={products}
        assets={assets}
        onClose={() => setEditing(null)}
      />
    </>
  );
}

function CollectionDialog({
  open,
  collection,
  products,
  assets,
  onClose,
}: {
  open: boolean;
  collection: CollectionWithProducts | null;
  products: ProductOption[];
  assets: MediaAssetRow[];
  onClose: () => void;
}) {
  const { state, formAction, pending } = useActionForm(saveCollectionAction, {
    successMessage: "Collection saved.",
    onSuccess: onClose,
  });

  // Seeded once; the caller remounts via `key` when editing a different row.
  const [name, setName] = useState(collection?.name ?? "");
  const [slug, setSlug] = useState(collection?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(collection));
  const [selected, setSelected] = useState<string[]>(collection?.productIds ?? []);

  const toggleProduct = (id: string) =>
    setSelected((current) =>
      current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id],
    );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={collection ? `Edit ${collection.name}` : "New festive collection"}
      size="xl"
    >
      <form action={formAction} className="flex flex-col gap-4">
        {collection ? <input type="hidden" name="id" value={collection.id} /> : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name" required>
            {({ id }) => (
              <Input
                id={id}
                name="name"
                required
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  if (!slugTouched) setSlug(slugify(event.target.value));
                }}
                placeholder="e.g. Diwali Gifting"
              />
            )}
          </Field>

          <Field label="Web address" required>
            {({ id }) => (
              <Input
                id={id}
                name="slug"
                required
                value={slug}
                onChange={(event) => {
                  setSlugTouched(true);
                  setSlug(event.target.value);
                }}
              />
            )}
          </Field>
        </div>

        <Field label="Description">
          {({ id }) => (
            <Textarea
              id={id}
              name="description"
              rows={2}
              defaultValue={collection?.description ?? ""}
            />
          )}
        </Field>

        <MediaPicker
          name="cover_image"
          label="Cover image"
          assets={assets}
          defaultValue={collection?.cover_image}
          accept="image"
          folder="festive"
        />

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Available from">
            {({ id }) => (
              <Input
                id={id}
                name="available_from"
                type="date"
                defaultValue={collection?.available_from ?? ""}
              />
            )}
          </Field>

          <Field label="Available until">
            {({ id }) => (
              <Input
                id={id}
                name="available_until"
                type="date"
                defaultValue={collection?.available_until ?? ""}
              />
            )}
          </Field>

          <Field label="Sort order">
            {({ id }) => (
              <Input
                id={id}
                name="sort_order"
                type="number"
                step="1"
                defaultValue={collection?.sort_order ?? 0}
              />
            )}
          </Field>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Checkbox
            name="active"
            label="Active"
            description="Shown on the website."
            defaultChecked={collection ? collection.active : true}
          />
          <Checkbox
            name="featured"
            label="Featured"
            description="Highlighted on the homepage."
            defaultChecked={collection?.featured ?? false}
          />
        </div>

        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-semibold text-admin-ink">
            Products in this collection
          </legend>
          <p className="text-xs text-admin-muted">
            {selected.length} selected. The order you tick them is the order they appear in.
          </p>

          <div className="max-h-56 overflow-y-auto rounded-lg border border-admin-line">
            <ul className="divide-y divide-admin-line">
              {products.map((product) => (
                <li key={product.id}>
                  <label className="flex cursor-pointer items-center gap-3 px-3 py-2 text-sm hover:bg-admin-bg">
                    <input
                      type="checkbox"
                      checked={selected.includes(product.id)}
                      onChange={() => toggleProduct(product.id)}
                      className="size-4 accent-[var(--admin-accent)]"
                    />
                    <span className="flex-1 text-admin-ink">{product.name}</span>
                    <span className="font-mono text-xs text-admin-muted">{product.sku}</span>
                  </label>
                </li>
              ))}
            </ul>
          </div>

          {/* Emitted in selection order so the server can store sort_order. */}
          {selected.map((id) => (
            <input key={id} type="hidden" name="product_ids" value={id} />
          ))}
        </fieldset>

        {state && !state.success ? (
          <p role="alert" className="text-sm font-medium text-danger">
            {state.error.message}
          </p>
        ) : null}

        <div className="flex justify-end gap-2">
          <Button variant="adminGhost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="admin" loading={pending} loadingLabel="Saving…">
            Save collection
          </Button>
        </div>
      </form>
    </Modal>
  );
}
