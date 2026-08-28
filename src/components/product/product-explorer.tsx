"use client";

import { useMemo, useState } from "react";

import { ProductCard } from "@/components/product/product-card";
import { EmptyState } from "@/components/ui/primitives";
import { trackEvent } from "@/lib/analytics/track-event";
import { cn } from "@/lib/utils";
import type { Category, Product } from "@/types/domain";

type Filter = { label: string; slug: string };

/**
 * Category-filtered product grid.
 *
 * Filtering happens client-side over an already-rendered list: the catalogue
 * is a few dozen products, so a round trip per filter tap would add latency
 * for no benefit. The initial HTML still contains every product, which keeps
 * the page indexable.
 */
export function ProductExplorer({
  products,
  categories,
  initialCategory = "all",
  showDietaryFilters = true,
}: {
  products: Product[];
  categories: Category[];
  initialCategory?: string;
  showDietaryFilters?: boolean;
}) {
  const [activeCategory, setActiveCategory] = useState(initialCategory);
  const [sugarFreeOnly, setSugarFreeOnly] = useState(false);
  const [egglessOnly, setEgglessOnly] = useState(false);

  const filters = useMemo<Filter[]>(
    () => [
      { label: "All", slug: "all" },
      ...categories.map((category) => ({ label: category.name, slug: category.slug })),
    ],
    [categories],
  );

  const visible = useMemo(
    () =>
      products.filter((product) => {
        if (activeCategory !== "all" && product.category?.slug !== activeCategory) return false;
        if (sugarFreeOnly && !product.is_sugar_free) return false;
        if (egglessOnly && !product.is_eggless) return false;
        return true;
      }),
    [products, activeCategory, sugarFreeOnly, egglessOnly],
  );

  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-col gap-4">
        {/* Overflows into a scroll rail on narrow screens rather than wrapping
            into four ragged rows of pills. */}
        <div
          className="scroll-rail lg:flex-wrap"
          role="tablist"
          aria-label="Filter treats by category"
        >
          {filters.map((filter) => {
            const selected = activeCategory === filter.slug;
            return (
              <button
                key={filter.slug}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => {
                  setActiveCategory(filter.slug);
                  if (filter.slug !== "all") {
                    trackEvent("category_view", { source: filter.slug });
                  }
                }}
                className={cn(
                  "rounded-(--radius-pill) border px-4 py-2 text-sm font-medium transition-colors duration-200",
                  selected
                    ? "border-cocoa bg-cocoa text-cream"
                    : "border-line bg-surface text-ink-muted hover:border-cocoa/30 hover:text-cocoa",
                )}
              >
                {filter.label}
              </button>
            );
          })}
        </div>

        {showDietaryFilters ? (
          <div className="flex flex-wrap gap-4">
            <DietToggle
              label="Sugar-free only"
              checked={sugarFreeOnly}
              onChange={setSugarFreeOnly}
            />
            <DietToggle label="Eggless only" checked={egglessOnly} onChange={setEgglessOnly} />
          </div>
        ) : null}
      </div>

      {visible.length === 0 ? (
        <EmptyState
          title="Nothing here just yet"
          description="Try another category, or clear the filters to see everything we bake."
        />
      ) : (
        <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visible.map((product, index) => (
            <li key={product.id} className="flex">
              <ProductCard
                product={product}
                className="w-full"
                ctaLocation="product_grid"
                priority={index < 4}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function DietToggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm text-ink-muted">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="size-4 accent-[var(--brand-cocoa)]"
      />
      {label}
    </label>
  );
}
