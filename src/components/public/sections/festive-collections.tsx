import { Gift } from "lucide-react";

import { Reveal, RevealGroup, RevealItem } from "@/components/public/motion-primitives";
import { MediaFrame } from "@/components/ui/media-frame";
import { ProductCard } from "@/components/product/product-card";
import { Badge, SectionHeading } from "@/components/ui/primitives";
import { formatDate } from "@/lib/utils";
import type { Collection } from "@/types/domain";

export function FestiveCollections({ collections }: { collections: Collection[] }) {
  const withProducts = collections.filter((collection) => collection.products.length > 0);
  if (withProducts.length === 0) return null;

  return (
    <section id="festive" className="section-y bg-surface-warm" aria-label="Festive collections">
      <div className="container-page flex flex-col gap-12">
        <Reveal variant="up">
          <SectionHeading
            eyebrow="Seasonal"
            eyebrowIcon={Gift}
            heading="Festive Collections"
            description="Curated boxes built around the occasion, ordered in advance and packed to gift."
            animate
          />
        </Reveal>

        {withProducts.map((collection) => (
          <Reveal variant="rise" key={collection.id} className="flex flex-col gap-6">
            <div className="grid gap-5 lg:grid-cols-[320px_1fr] lg:items-start">
              <div className="flex flex-col gap-3">
                <MediaFrame
                  src={collection.cover_image}
                  alt={collection.name}
                  className="aspect-16/10 w-full"
                  sizes="(min-width: 1024px) 320px, 100vw"
                />
                <div className="flex flex-col gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-display text-2xl text-cocoa">{collection.name}</h3>
                    {collection.featured ? <Badge tone="accent">Featured</Badge> : null}
                  </div>
                  {collection.description ? (
                    <p className="text-sm leading-relaxed text-ink-muted">
                      {collection.description}
                    </p>
                  ) : null}
                  {collection.available_until ? (
                    <p className="text-xs font-medium text-accent">
                      Ordering open until {formatDate(collection.available_until)}
                    </p>
                  ) : null}
                </div>
              </div>

              <RevealGroup as="ul" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {collection.products.slice(0, 3).map((product) => (
                  <RevealItem as="li" key={product.id} className="flex">
                    <ProductCard
                      product={product}
                      ctaLocation={`collection_${collection.slug}`}
                      className="w-full"
                    />
                  </RevealItem>
                ))}
              </RevealGroup>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
