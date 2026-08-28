"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/field";
import { Card } from "@/components/ui/primitives";
import { useActionForm } from "@/components/admin/use-action-form";
import { saveProductAction } from "@/app/actions/catalog";
import { slugify } from "@/lib/utils";
import type { Category, Product } from "@/types/domain";

/**
 * Create / edit a product.
 *
 * The slug is derived from the name as you type, but only for new products —
 * changing an existing slug would break every link already shared to that
 * product, so it becomes manual once saved.
 */
export function ProductForm({
  product,
  categories,
}: {
  product: Product | null;
  categories: Category[];
}) {
  const { state, formAction, pending } = useActionForm(saveProductAction, {
    successMessage: "Product saved.",
  });

  const [name, setName] = useState(product?.name ?? "");
  const [slug, setSlug] = useState(product?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(product));

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {product ? <input type="hidden" name="id" value={product.id} /> : null}

      <Card className="flex flex-col gap-4">
        <h2 className="font-sans text-base font-bold text-admin-ink">Basics</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Product name" required>
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

          <Field label="Product code (SKU)" required hint="Shown to customers in enquiries.">
            {({ id }) => (
              <Input
                id={id}
                name="sku"
                required
                defaultValue={product?.sku ?? ""}
                placeholder="e.g. CB-004"
              />
            )}
          </Field>

          <Field
            label="Web address"
            required
            hint={
              product
                ? "Changing this breaks links already shared for this product."
                : "Filled in automatically from the name."
            }
          >
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

          <Field label="Category">
            {({ id }) => (
              <Select id={id} name="category_id" defaultValue={product?.category_id ?? ""}>
                <option value="">No category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>

        <Field label="Short description" hint="One line, shown on the product card.">
          {({ id }) => (
            <Textarea
              id={id}
              name="short_description"
              rows={2}
              defaultValue={product?.short_description ?? ""}
            />
          )}
        </Field>

        <Field label="Full description" hint="Shown when someone opens the product.">
          {({ id }) => (
            <Textarea
              id={id}
              name="description"
              rows={5}
              defaultValue={product?.description ?? ""}
            />
          )}
        </Field>
      </Card>

      <Card className="flex flex-col gap-4">
        <h2 className="font-sans text-base font-bold text-admin-ink">Pricing</h2>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Starting price" hint="Leave blank for “Price on enquiry”.">
            {({ id }) => (
              <Input
                id={id}
                name="starting_price"
                type="number"
                min="0"
                step="1"
                defaultValue={product?.starting_price ?? ""}
              />
            )}
          </Field>

          <Field label="Price label" hint="e.g. per 250g box">
            {({ id }) => (
              <Input id={id} name="price_label" defaultValue={product?.price_label ?? ""} />
            )}
          </Field>

          <Field label="Sort order" hint="Lower numbers appear first.">
            {({ id }) => (
              <Input
                id={id}
                name="sort_order"
                type="number"
                step="1"
                defaultValue={product?.sort_order ?? 0}
              />
            )}
          </Field>
        </div>

        <Field
          label="Instagram post"
          hint="Optional. Links the treat to its post, and names it in the enquiry message."
        >
          {({ id }) => (
            <Input
              id={id}
              name="instagram_url"
              type="url"
              defaultValue={product?.instagram_url ?? ""}
              placeholder="https://www.instagram.com/p/…"
            />
          )}
        </Field>

        <Field label="Extra badges" hint="Comma separated, e.g. Limited Batch, Handmade">
          {({ id }) => (
            <Input
              id={id}
              name="highlight_tags"
              defaultValue={(product?.highlight_tags ?? []).join(", ")}
            />
          )}
        </Field>
      </Card>

      <Card className="flex flex-col gap-4">
        <h2 className="font-sans text-base font-bold text-admin-ink">Labels &amp; visibility</h2>

        <div className="grid gap-3 sm:grid-cols-2">
          <Checkbox
            name="is_active"
            label="Active"
            description="Visible on the website."
            defaultChecked={product ? product.is_active : true}
          />
          <Checkbox
            name="is_bestseller"
            label="Bestseller"
            description="Shows in Most Loved Treats."
            defaultChecked={product?.is_bestseller ?? false}
          />
          <Checkbox
            name="available_today"
            label="Available today"
            description="Shows in Baking Today."
            defaultChecked={product?.available_today ?? false}
          />
          <Checkbox
            name="is_seasonal"
            label="Seasonal / festive"
            defaultChecked={product?.is_seasonal ?? false}
          />
          <Checkbox
            name="is_sugar_free"
            label="Sugar-free"
            defaultChecked={product?.is_sugar_free ?? false}
          />
          <Checkbox
            name="is_eggless"
            label="Eggless"
            defaultChecked={product?.is_eggless ?? false}
          />
          <Checkbox
            name="is_customizable"
            label="Customizable"
            description="Customers can request changes."
            defaultChecked={product?.is_customizable ?? false}
          />
        </div>
      </Card>

      {state && !state.success ? (
        <p role="alert" className="text-sm font-medium text-danger">
          {state.error.message}
        </p>
      ) : null}

      <div className="flex justify-end gap-2">
        <Button type="submit" variant="admin" loading={pending} loadingLabel="Saving…">
          {product ? "Save changes" : "Create product"}
        </Button>
      </div>
    </form>
  );
}
