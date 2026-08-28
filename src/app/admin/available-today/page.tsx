import { Sun } from "lucide-react";

import { ActionButton, ActionToggle } from "@/components/admin/action-controls";
import { Card, EmptyState, PageHeader } from "@/components/ui/primitives";
import { ButtonLink } from "@/components/ui/button";
import { clearAvailableTodayAction, setAvailableTodayAction } from "@/app/actions/catalog";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getAdminCategories, getProductOptions } from "@/lib/data/admin";

export const dynamic = "force-dynamic";

export const metadata = { title: "Available Today" };

/**
 * Today's kitchen.
 *
 * Designed to be worked through quickly on a phone first thing in the morning:
 * one row per product, one tap each, grouped by category so the list matches
 * how the baking is actually organised.
 */
export default async function AvailableTodayPage() {
  const { supabase } = await requireAdmin();

  const [products, categories] = await Promise.all([
    getProductOptions(supabase),
    getAdminCategories(supabase),
  ]);

  const onCount = products.filter((product) => product.available_today).length;

  const grouped = categories
    .map((category) => ({
      category,
      items: products.filter((product) => product.category_id === category.id),
    }))
    .filter((group) => group.items.length > 0);

  const uncategorised = products.filter((product) => !product.category_id);

  return (
    <>
      <PageHeader
        title="Baking today"
        description="Switch on whatever is ready. The homepage section updates immediately."
        action={
          onCount > 0 ? (
            <ActionButton
              variant="adminGhost"
              action={clearAvailableTodayAction}
              successMessage="Cleared today's list."
              confirm="Turn everything off? The Baking Today section will disappear from the homepage."
              confirmTitle="Clear today's list"
              confirmLabel="Turn all off"
            >
              Clear all
            </ActionButton>
          ) : undefined
        }
      />

      <Card
        className={
          onCount === 0 ? "border-warning/35 bg-warning-bg/50" : "border-success/30 bg-success-bg"
        }
      >
        <p className="text-sm font-medium">
          {onCount === 0 ? (
            <span className="text-warning">
              Nothing is marked available, so the “Baking Today” section is hidden on the website.
            </span>
          ) : (
            <span className="text-success">
              {onCount} treat{onCount === 1 ? "" : "s"} showing in “Baking Today” on the homepage.
            </span>
          )}
        </p>
      </Card>

      {products.length === 0 ? (
        <EmptyState
          title="No active products"
          description="Add a product first, then you can mark it available."
          icon={<Sun className="size-6" aria-hidden="true" />}
          action={
            <ButtonLink href="/admin/products/new" variant="admin">
              Add product
            </ButtonLink>
          }
        />
      ) : (
        <div className="flex flex-col gap-5">
          {grouped.map(({ category, items }) => (
            <Card key={category.id} className="flex flex-col gap-1 p-0">
              <h2 className="border-b border-admin-line px-5 py-3 font-sans text-sm font-bold uppercase tracking-wide text-admin-muted">
                {category.name}
              </h2>
              <ul className="divide-y divide-admin-line">
                {items.map((product) => (
                  <li
                    key={product.id}
                    className="flex items-center justify-between gap-4 px-5 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-admin-ink">
                        {product.name}
                      </p>
                      <p className="font-mono text-xs text-admin-muted">{product.sku}</p>
                    </div>
                    <ActionToggle
                      checked={product.available_today}
                      label={`Mark ${product.name} available today`}
                      action={setAvailableTodayAction.bind(null, product.id)}
                    />
                  </li>
                ))}
              </ul>
            </Card>
          ))}

          {uncategorised.length > 0 ? (
            <Card className="flex flex-col gap-1 p-0">
              <h2 className="border-b border-admin-line px-5 py-3 font-sans text-sm font-bold uppercase tracking-wide text-admin-muted">
                Uncategorised
              </h2>
              <ul className="divide-y divide-admin-line">
                {uncategorised.map((product) => (
                  <li
                    key={product.id}
                    className="flex items-center justify-between gap-4 px-5 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-admin-ink">
                        {product.name}
                      </p>
                      <p className="font-mono text-xs text-admin-muted">{product.sku}</p>
                    </div>
                    <ActionToggle
                      checked={product.available_today}
                      label={`Mark ${product.name} available today`}
                      action={setAvailableTodayAction.bind(null, product.id)}
                    />
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
        </div>
      )}
    </>
  );
}
