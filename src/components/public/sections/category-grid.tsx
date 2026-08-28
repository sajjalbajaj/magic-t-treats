import Link from "next/link";
import { ArrowRight, LayoutGrid } from "lucide-react";

import { Reveal, RevealGroup, RevealItem } from "@/components/public/motion-primitives";
import { MediaFrame } from "@/components/ui/media-frame";
import { SectionHeading } from "@/components/ui/primitives";
import { getCategoryIcon } from "@/lib/products/category-icons";
import type { Category } from "@/types/domain";

export function CategoryGrid({ categories }: { categories: Category[] }) {
  if (categories.length === 0) return null;

  return (
    <section className="section-y" aria-labelledby="categories-heading">
      <div className="container-page flex flex-col gap-10">
        <Reveal variant="up">
          <SectionHeading
            eyebrow="What we bake"
            eyebrowIcon={LayoutGrid}
            heading="Browse by category"
            description="From everyday cookies to hand-moulded chocolates and gift boxes built for the occasion."
            headingId="categories-heading"
            animate
          />
        </Reveal>

        <RevealGroup as="ul" className="grid grid-cols-2 gap-4 md:grid-cols-4" stagger={0.06}>
          {categories.map((category) => {
            const Icon = getCategoryIcon(category.slug, category.name);

            return (
              <RevealItem as="li" key={category.id} variant="rise">
                <Link
                  href={`/gallery?category=${category.slug}`}
                  className="group flex h-full flex-col overflow-hidden rounded-(--radius-card) border border-line bg-surface transition-all duration-300 hover:-translate-y-1 hover:border-accent/30 hover:shadow-(--shadow-lift)"
                >
                  <div className="relative aspect-square overflow-hidden">
                    <MediaFrame
                      src={category.image_url}
                      alt={category.name}
                      rounded={false}
                      className="size-full [&_img]:group-hover:scale-105"
                      sizes="(min-width: 768px) 22vw, 45vw"
                    />

                    {/* Sits over the placeholder when no photo is uploaded, so
                        an empty category still reads as that category. */}
                    <span className="absolute left-3 top-3 grid size-9 place-items-center rounded-full bg-cream/90 shadow-(--shadow-soft) transition-transform duration-300 group-hover:scale-110">
                      <Icon className="size-4.5 text-accent" aria-hidden="true" />
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2 p-3.5">
                    <span className="font-display text-base text-cocoa sm:text-lg">
                      {category.name}
                    </span>
                    <ArrowRight
                      className="size-4 shrink-0 text-accent transition-transform duration-300 group-hover:translate-x-1"
                      aria-hidden="true"
                    />
                  </div>
                </Link>
              </RevealItem>
            );
          })}
        </RevealGroup>
      </div>
    </section>
  );
}
