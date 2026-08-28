"use client";

import { useState } from "react";
import { Check, Share2 } from "lucide-react";

import { InstagramIcon } from "@/components/ui/brand-icons";

import { Button } from "@/components/ui/button";
import { MediaFrame } from "@/components/ui/media-frame";
import { SmartVideo } from "@/components/public/smart-video";
import { ProductTags } from "@/components/product/product-tags";
import { useToast } from "@/components/ui/toast";
import { formatProductPrice, getProductPoster } from "@/lib/products/display";
import { copyToClipboard } from "@/lib/clipboard";
import { trackEvent } from "@/lib/analytics/track-event";
import { cn } from "@/lib/utils";
import type { Product } from "@/types/domain";

/**
 * Body of the product detail dialog.
 *
 * Rendered inside <Modal>, which already provides the dialog semantics, focus
 * trap and Escape handling — so this component is only concerned with content.
 */
export function ProductDetail({
  product,
  onEnquire,
}: {
  product: Product;
  onEnquire: () => void;
}) {
  const gallery = product.media.filter((item) => item.media_url ?? item.thumbnail_url);
  const [activeIndex, setActiveIndex] = useState(0);
  const active = gallery[activeIndex];
  const poster = getProductPoster(product);
  const { toast } = useToast();

  async function handleShare() {
    const url = `${window.location.origin}/products/${product.slug}`;
    trackEvent("product_shared", { product_id: product.id, product_sku: product.sku });

    // The native sheet is far better on the phones most visitors are using.
    if (navigator.share) {
      try {
        await navigator.share({ title: product.name, text: product.short_description ?? "", url });
        return;
      } catch {
        // Cancelled, or unsupported in this context — fall back to copying.
      }
    }

    const copied = await copyToClipboard(url);
    toast(copied ? "Link copied to clipboard." : "Could not copy the link.", copied ? "success" : "error");
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="flex flex-col gap-3">
        <div className="relative aspect-square overflow-hidden rounded-(--radius-card) bg-blush/40">
          {active?.type === "video" && active.media_url ? (
            <SmartVideo
              src={active.media_url}
              poster={active.thumbnail_url}
              label={`${product.name} video`}
              className="size-full"
            />
          ) : active?.media_url || poster?.url ? (
            <MediaFrame
              src={active?.media_url ?? poster?.url ?? ""}
              alt={active?.alt_text ?? poster?.alt ?? product.name}
              rounded={false}
              className="size-full"
              showRetry
              sizes="(min-width: 768px) 40vw, 90vw"
            />
          ) : (
            <MediaFrame src={null} alt={product.name} rounded={false} className="size-full" />
          )}
        </div>

        {gallery.length > 1 ? (
          <ul className="flex gap-2 overflow-x-auto pb-1">
            {gallery.map((item, index) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => setActiveIndex(index)}
                  aria-label={`View ${item.type} ${index + 1} of ${gallery.length}`}
                  aria-current={index === activeIndex}
                  className={cn(
                    "relative size-16 shrink-0 overflow-hidden rounded-lg border-2 transition-colors duration-200",
                    index === activeIndex ? "border-accent" : "border-transparent",
                  )}
                >
                  <MediaFrame
                    src={item.thumbnail_url ?? item.media_url}
                    alt={item.alt_text ?? `${product.name} ${index + 1}`}
                    rounded={false}
                    className="size-full"
                    sizes="64px"
                  />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <p className="text-xs uppercase tracking-[0.16em] text-ink-muted">
            {product.category?.name ? `${product.category.name} · ` : ""}
            {product.sku}
          </p>
          <p className="text-lg font-semibold text-cocoa">{formatProductPrice(product)}</p>
        </div>

        <ProductTags product={product} />

        {product.description ? (
          <p className="text-sm leading-relaxed text-ink-muted">{product.description}</p>
        ) : product.short_description ? (
          <p className="text-sm leading-relaxed text-ink-muted">{product.short_description}</p>
        ) : null}

        {product.is_customizable ? (
          <div className="flex items-start gap-2 rounded-xl border border-sage/40 bg-sage/10 p-3">
            <Check className="mt-0.5 size-4 shrink-0 text-[#4a5c3d]" aria-hidden="true" />
            <p className="text-sm text-[#4a5c3d]">
              This treat can be customised. Choose flavours, shapes, packaging or a message on the box.
              Mention what you need in your enquiry.
            </p>
          </div>
        ) : null}

        {product.instagram_url ? (
          <a
            href={product.instagram_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() =>
              trackEvent("instagram_opened", {
                product_id: product.id,
                product_sku: product.sku,
                cta_location: "product_modal_post",
              })
            }
            className="inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-accent transition-opacity duration-200 hover:opacity-80"
          >
            <InstagramIcon className="size-4" aria-hidden="true" />
            See this on Instagram
          </a>
        ) : null}

        <div className="mt-auto flex flex-col gap-2 pt-2 sm:flex-row">
          <Button className="flex-1" onClick={onEnquire}>
            Enquire About This
          </Button>
          <Button variant="secondary" onClick={() => void handleShare()}>
            <Share2 className="size-4" aria-hidden="true" />
            Share
          </Button>
        </div>
      </div>
    </div>
  );
}
