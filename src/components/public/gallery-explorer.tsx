"use client";

import { useMemo, useState } from "react";
import { Play } from "lucide-react";

import { MediaFrame } from "@/components/ui/media-frame";
import { Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/primitives";
import { SmartVideo } from "@/components/public/smart-video";
import { Button } from "@/components/ui/button";
import { useProductDialogs } from "@/components/product/product-dialogs";
import { cn } from "@/lib/utils";
import type { Category, Product } from "@/types/domain";
import type { GalleryItem } from "@/lib/gallery/items";

export function GalleryExplorer({
  items,
  categories,
  products,
  initialFilter = "all",
}: {
  items: GalleryItem[];
  categories: Category[];
  products: Product[];
  initialFilter?: string;
}) {
  const [filter, setFilter] = useState(initialFilter);
  const [lightbox, setLightbox] = useState<GalleryItem | null>(null);
  const { openProduct } = useProductDialogs();

  const filters = useMemo(
    () => [
      { label: "All", slug: "all" },
      ...categories.map((category) => ({ label: category.name, slug: category.slug })),
      { label: "Videos", slug: "videos" },
    ],
    [categories],
  );

  const visible = useMemo(() => {
    if (filter === "all") return items;
    if (filter === "videos") return items.filter((item) => item.type === "video");
    return items.filter((item) => item.categorySlug === filter);
  }, [items, filter]);

  const lightboxProduct = lightbox?.productSlug
    ? products.find((product) => product.slug === lightbox.productSlug)
    : undefined;

  return (
    <div className="flex flex-col gap-8">
      <div className="scroll-rail lg:flex-wrap" role="tablist" aria-label="Filter gallery">
        {filters.map((option) => {
          const selected = filter === option.slug;
          return (
            <button
              key={option.slug}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setFilter(option.slug)}
              className={cn(
                "rounded-(--radius-pill) border px-4 py-2 text-sm font-medium transition-colors duration-200",
                selected
                  ? "border-cocoa bg-cocoa text-cream"
                  : "border-line bg-surface text-ink-muted hover:border-cocoa/30 hover:text-cocoa",
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      {visible.length === 0 ? (
        <EmptyState
          title="No photos here yet"
          description="We're still adding photography for this category. Try another filter."
        />
      ) : (
        /*
          CSS columns give a true masonry flow without measuring anything in
          JavaScript, so there is no layout thrash and it works before hydration.
        */
        <div className="columns-2 gap-4 md:columns-3 lg:columns-4 [&>*]:mb-4">
          {visible.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setLightbox(item)}
              className="group relative block w-full break-inside-avoid overflow-hidden rounded-(--radius-card) border border-line bg-blush/40"
            >
              {item.thumbnail ? (
                <MediaFrame
                  src={item.thumbnail}
                  alt={item.alt}
                  fill={false}
                  width={600}
                  height={item.type === "video" ? 900 : 600}
                  rounded={false}
                  sizes="(min-width: 1024px) 24vw, (min-width: 768px) 32vw, 45vw"
                  imageClassName="transition-transform duration-500 ease-(--ease-gentle) group-hover:scale-[1.03]"
                />
              ) : (
                // No poster frame for this video. A tinted tile is honest;
                // pointing an <img> at the .mp4 just renders a broken image.
                <span className="flex aspect-9/16 w-full items-end bg-gradient-to-br from-accent-soft via-blush/60 to-accent-soft p-3">
                  <span className="clamp-2 text-xs font-medium text-cocoa">{item.caption}</span>
                </span>
              )}

              {item.type === "video" ? (
                <span className="absolute inset-0 grid place-items-center">
                  <span className="grid size-11 place-items-center rounded-full bg-cream/85 shadow-(--shadow-soft)">
                    <Play className="ml-0.5 size-4 text-cocoa" aria-hidden="true" />
                  </span>
                </span>
              ) : null}

              <span className="sr-only">View {item.alt}</span>
            </button>
          ))}
        </div>
      )}

      <Modal
        open={lightbox !== null}
        onClose={() => setLightbox(null)}
        title={lightbox?.caption ?? lightbox?.alt ?? "Gallery"}
        size="xl"
      >
        {lightbox ? (
          <div className="flex flex-col gap-4">
            {/*
              A fixed height with `contain`, rather than a fixed aspect ratio.

              The reels are shot portrait and the photos are mostly landscape,
              so any single aspect ratio crops one of them. An earlier version
              forced `sm:aspect-video` on the video, which cut the top and
              bottom off every reel — the whole point of opening the lightbox.
              Letting the height lead and the frame letterbox against a dark
              ground shows all of both.
            */}
            {lightbox.type === "video" ? (
              <SmartVideo
                src={lightbox.url}
                poster={lightbox.thumbnail}
                label={lightbox.alt}
                fit="contain"
                className="h-[62dvh] w-full rounded-(--radius-card) bg-ink"
              />
            ) : (
              <MediaFrame
                src={lightbox.url}
                alt={lightbox.alt}
                className="h-[62dvh] w-full bg-ink"
                imageClassName="object-contain!"
                sizes="(min-width: 768px) 70vw, 95vw"
              />
            )}

            {lightboxProduct ? (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-ink-muted">
                  From <span className="font-semibold text-cocoa">{lightboxProduct.name}</span>
                </p>
                <Button
                  onClick={() => {
                    const product = lightboxProduct;
                    setLightbox(null);
                    openProduct(product, "gallery");
                  }}
                >
                  View this treat
                </Button>
              </div>
            ) : null}
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
