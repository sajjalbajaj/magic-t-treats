"use client";

import { ProductDetail } from "@/components/product/product-detail";
import { useProductDialogs } from "@/components/product/product-dialogs";
import type { Product } from "@/types/domain";

/**
 * Renders the product detail body outside a dialog, for the standalone product
 * page. Reuses the same component as the modal so the two can never drift.
 */
export function ProductDetailPanel({ product }: { product: Product }) {
  const { openEnquiry } = useProductDialogs();

  return (
    <ProductDetail product={product} onEnquire={() => openEnquiry(product, "product_page")} />
  );
}
