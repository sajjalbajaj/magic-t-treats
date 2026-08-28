import type { Product, ProductPoster, ProductTag } from "@/types/domain";
import { altText } from "@/lib/seo/alt-text";

/**
 * Presentation logic for products.
 *
 * Kept out of the components so the card, the modal, the gallery and the
 * structured-data generator all describe a product identically.
 */

/**
 * Badges derived from the product's flags, in a deliberate order: dietary
 * information first (it is the reason some people are on the site at all),
 * then availability, then marketing.
 */
export function getProductTags(product: Product): ProductTag[] {
  const tags: ProductTag[] = [];

  if (product.is_sugar_free) tags.push({ label: "Sugar-Free", tone: "sage" });
  if (product.is_eggless) tags.push({ label: "Eggless", tone: "sage" });
  if (product.available_today) tags.push({ label: "Available Today", tone: "accent" });
  if (product.is_bestseller) tags.push({ label: "Bestseller", tone: "cocoa" });
  if (product.is_customizable) tags.push({ label: "Customizable", tone: "blush" });
  if (product.is_seasonal) tags.push({ label: "Festive", tone: "accent" });

  for (const tag of product.highlight_tags ?? []) {
    tags.push({ label: tag, tone: "blush" });
  }

  return tags;
}

/**
 * The image or video to lead with. Returns null when nothing has been
 * uploaded, so callers render a proper placeholder instead of a broken image.
 */
export function getProductPoster(product: Product): ProductPoster {
  const primary = product.media.find((item) => item.is_primary) ?? product.media[0];
  if (!primary) return null;

  // For a video, prefer the poster frame — a still is what belongs in a grid.
  const url =
    primary.type === "video"
      ? (primary.thumbnail_url ?? primary.media_url)
      : (primary.media_url ?? primary.thumbnail_url);

  if (!url) return null;

  return {
    url,
    alt: altText(primary.alt_text ?? product.name),
    type: primary.type,
  };
}

export function getProductVideos(product: Product) {
  return product.media.filter((item) => item.type === "video" && item.media_url);
}

export function getProductImages(product: Product) {
  return product.media.filter((item) => item.type === "image" && item.media_url);
}

/**
 * Price line for a card. Falls back to a prompt to ask rather than showing
 * nothing — an empty price slot reads as "unavailable".
 */
export function formatProductPrice(product: Product): string {
  if (product.starting_price === null || product.starting_price === undefined) {
    return product.price_label ?? "Price on enquiry";
  }

  const amount = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(product.starting_price);

  return product.price_label ? `${amount} ${product.price_label}` : amount;
}

/** Short, honest description used for meta tags and card copy. */
export function getProductSummary(product: Product): string {
  return (
    product.short_description ??
    product.description?.slice(0, 160) ??
    `${product.name}, handmade in small batches by Magic T-treats.`
  );
}
