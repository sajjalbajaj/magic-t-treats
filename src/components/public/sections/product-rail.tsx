import { Reveal, RevealGroup, RevealItem } from "@/components/public/motion-primitives";
import { ProductCard } from "@/components/product/product-card";
import { Sparkles } from "lucide-react";

import { Badge, SectionHeading } from "@/components/ui/primitives";
import type { Product } from "@/types/domain";

/**
 * A titled row of products, used for "Most Loved Treats" and "Baking Today".
 *
 * Renders nothing at all when the list is empty — the Available Today section
 * in particular must disappear on days when the baker has not marked anything,
 * rather than show an apologetic empty state on the homepage.
 */
export function ProductRail({
  id,
  eyebrow,
  heading,
  description,
  note,
  products,
  ctaLocation,
  tone = "cream",
}: {
  id?: string;
  eyebrow?: string;
  heading: string;
  description?: string;
  note?: string;
  products: Product[];
  ctaLocation: string;
  tone?: "cream" | "warm";
}) {
  if (products.length === 0) return null;

  return (
    <section
      id={id}
      className={tone === "warm" ? "section-y bg-surface-warm" : "section-y"}
      aria-label={heading}
    >
      <div className="container-page flex flex-col gap-9">
        <div className="flex flex-col items-center gap-4 text-center">
          <Reveal variant="up">
            <SectionHeading
              eyebrow={eyebrow}
              eyebrowIcon={Sparkles}
              heading={heading}
              description={description}
              animate
            />
          </Reveal>
          {note ? (
            <Reveal variant="scale" delay={0.1}>
              <Badge tone="accent">{note}</Badge>
            </Reveal>
          ) : null}
        </div>

        <RevealGroup
          as="ul"
          className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        >
          {products.map((product) => (
            <RevealItem as="li" key={product.id} className="flex">
              <ProductCard product={product} ctaLocation={ctaLocation} className="w-full" />
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
    </section>
  );
}
