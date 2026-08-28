"use client";

import { ArrowUpRight } from "lucide-react";

import { MediaFrame } from "@/components/ui/media-frame";
import { ProductTags } from "@/components/product/product-tags";
import { useProductDialogs } from "@/components/product/product-dialogs";
import { formatProductPrice, getProductPoster } from "@/lib/products/display";
import { cn } from "@/lib/utils";
import type { Product } from "@/types/domain";

/**
 * Product card.
 *
 * The whole card opens the detail dialog and the Enquire button jumps straight
 * to the enquiry form. Nested interactive elements are a real accessibility
 * trap, so the card is a plain article with one full-bleed overlay button for
 * the "open detail" affordance, and Enquire sits above it in the stacking
 * order — two distinct, individually reachable controls, no nesting.
 */
export function ProductCard({
  product,
  ctaLocation = "product_grid",
  className,
  priority = false,
}: {
  product: Product;
  ctaLocation?: string;
  className?: string;
  priority?: boolean;
}) {
  const { openProduct, openEnquiry } = useProductDialogs();
  const poster = getProductPoster(product);

  return (
    <article
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-(--radius-card) border border-line bg-surface transition-shadow duration-300 hover:shadow-(--shadow-lift)",
        className,
      )}
    >
      <div className="relative aspect-4/3 overflow-hidden">
        <MediaFrame
          src={poster?.url}
          alt={poster?.alt ?? product.name}
          rounded={false}
          priority={priority}
          className="size-full [&_img]:group-hover:scale-105"
          sizes="(min-width: 1280px) 25vw, (min-width: 768px) 33vw, (min-width: 640px) 50vw, 80vw"
        />
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex flex-col gap-1.5">
          <h3 className="font-display text-xl leading-tight text-cocoa">{product.name}</h3>
          {product.short_description ? (
            <p className="clamp-2 text-sm leading-relaxed text-ink-muted">
              {product.short_description}
            </p>
          ) : null}
        </div>

        <ProductTags product={product} limit={3} />

        <div className="mt-auto flex items-end justify-between gap-3 pt-1">
          <p className="text-sm font-semibold text-cocoa">{formatProductPrice(product)}</p>

          <button
            type="button"
            onClick={() => openEnquiry(product, ctaLocation)}
            className="relative z-10 inline-flex items-center gap-1 rounded-(--radius-pill) bg-cocoa px-4 py-2 text-xs font-semibold text-cream transition-colors duration-200 hover:bg-cocoa-soft"
          >
            Enquire
            <ArrowUpRight className="size-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Covers the card, sits below the Enquire button. */}
      <button
        type="button"
        onClick={() => openProduct(product, ctaLocation)}
        className="absolute inset-0 z-0"
      >
        <span className="sr-only">View details for {product.name}</span>
      </button>
    </article>
  );
}
