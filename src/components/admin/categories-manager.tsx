"use client";

import { useState } from "react";
import { LayoutGrid } from "lucide-react";

import { AdminTable, Td } from "@/components/admin/admin-ui";
import { ActionButton } from "@/components/admin/action-controls";
import { MediaPicker } from "@/components/admin/media-picker";
import { Button } from "@/components/ui/button";
import { Badge, Card, EmptyState } from "@/components/ui/primitives";
import { Checkbox, Field, Input, Textarea } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { useActionForm } from "@/components/admin/use-action-form";
import { deleteCategoryAction, saveCategoryAction } from "@/app/actions/catalog";
import { slugify } from "@/lib/utils";
import type { Category } from "@/types/domain";
import type { MediaAssetRow } from "@/types/database";
import { MediaFrame } from "@/components/ui/media-frame";

export function CategoriesManager({
  categories,
  assets,
}: {
  categories: Category[];
  assets: MediaAssetRow[];
}) {
  const [editing, setEditing] = useState<Category | null>(null);
  const [creating, setCreating] = useState(false);

  return (
    <>
      <div className="flex justify-end">
        <Button variant="admin" onClick={() => setCreating(true)}>
          Add category
        </Button>
      </div>

      {categories.length === 0 ? (
        <EmptyState
          title="No categories yet"
          description="Categories group your treats on the homepage and in the gallery."
          icon={<LayoutGrid className="size-6" aria-hidden="true" />}
          action={
            <Button variant="admin" onClick={() => setCreating(true)}>
              Add your first category
            </Button>
          }
        />
      ) : (
        <Card className="p-0">
          <AdminTable
            headers={["", "Name", "Web address", "Order", "Status", ""]}
            caption="Categories"
          >
            {categories.map((category) => (
              <tr key={category.id} className="hover:bg-admin-bg/50">
                <Td>
                  <span className="relative block size-10 overflow-hidden rounded-lg bg-admin-bg">
                    {category.image_url ? (
                      <MediaFrame
                        src={category.image_url}
                        alt=""
                        compact
                        rounded={false}
                        className="size-full"
                        sizes="40px"
                      />
                    ) : null}
                  </span>
                </Td>
                <Td className="font-medium">{category.name}</Td>
                <Td className="font-mono text-xs text-admin-muted">/{category.slug}</Td>
                <Td className="tabular-nums text-admin-muted">{category.sort_order}</Td>
                <Td>
                  {category.is_active ? (
                    <Badge tone="success">Visible</Badge>
                  ) : (
                    <Badge tone="neutral">Hidden</Badge>
                  )}
                </Td>
                <Td>
                  <div className="flex gap-2">
                    <Button
                      variant="adminGhost"
                      size="sm"
                      onClick={() => setEditing(category)}
                    >
                      Edit
                    </Button>
                    <ActionButton
                      variant="adminGhost"
                      size="sm"
                      className="text-danger"
                      action={deleteCategoryAction.bind(null, category.id)}
                      successMessage="Category deleted."
                      confirm="Delete this category? This cannot be undone. If it still has products, hide it instead."
                      confirmTitle="Delete category"
                      confirmLabel="Delete"
                    >
                      Delete
                    </ActionButton>
                  </div>
                </Td>
              </tr>
            ))}
          </AdminTable>
        </Card>
      )}

      <CategoryDialog
        open={creating}
        category={null}
        assets={assets}
        onClose={() => setCreating(false)}
      />
      <CategoryDialog
        key={editing?.id ?? "none"}
        open={editing !== null}
        category={editing}
        assets={assets}
        onClose={() => setEditing(null)}
      />
    </>
  );
}

function CategoryDialog({
  open,
  category,
  assets,
  onClose,
}: {
  open: boolean;
  category: Category | null;
  assets: MediaAssetRow[];
  onClose: () => void;
}) {
  const { state, formAction, pending } = useActionForm(saveCategoryAction, {
    successMessage: "Category saved.",
    onSuccess: onClose,
  });

  // Seeded from props at mount. The caller remounts this component via `key`
  // when a different row is opened, so there is no prop-sync effect to keep.
  const [name, setName] = useState(category?.name ?? "");
  const [slug, setSlug] = useState(category?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(category));

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={category ? `Edit ${category.name}` : "Add a category"}
      size="lg"
    >
      <form action={formAction} className="flex flex-col gap-4">
        {category ? <input type="hidden" name="id" value={category.id} /> : null}

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
              defaultValue={category?.description ?? ""}
            />
          )}
        </Field>

        <MediaPicker
          name="image_url"
          label="Category image"
          assets={assets}
          defaultValue={category?.image_url}
          accept="image"
          folder="products"
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Sort order" hint="Lower numbers appear first.">
            {({ id }) => (
              <Input
                id={id}
                name="sort_order"
                type="number"
                step="1"
                defaultValue={category?.sort_order ?? 0}
              />
            )}
          </Field>

          <div className="flex items-end">
            <Checkbox
              name="is_active"
              label="Visible on the website"
              defaultChecked={category ? category.is_active : true}
              className="w-full"
            />
          </div>
        </div>

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
            Save category
          </Button>
        </div>
      </form>
    </Modal>
  );
}
