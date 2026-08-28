import { Quote, Star } from "lucide-react";

import { Reveal, RevealGroup, RevealItem } from "@/components/public/motion-primitives";
import { SectionHeading } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";
import type { SectionIntro, Testimonial } from "@/types/domain";

export function TestimonialsSection({
  content,
  testimonials,
}: {
  content: SectionIntro;
  testimonials: Testimonial[];
}) {
  if (testimonials.length === 0) return null;

  return (
    <section className="section-y bg-surface-warm" aria-label={content.heading}>
      <div className="container-page flex flex-col gap-9">
        <Reveal variant="up">
          <SectionHeading
            eyebrow="Reviews"
            eyebrowIcon={Star}
            heading={content.heading}
            description={content.description}
            animate
          />
        </Reveal>

        <RevealGroup as="ul" className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {testimonials.slice(0, 6).map((testimonial) => (
            <RevealItem as="li" key={testimonial.id} className="flex">
              <figure className="flex w-full flex-col gap-4 rounded-(--radius-card) border border-line bg-surface p-6 transition-all duration-300 hover:-translate-y-1 hover:border-accent/25 hover:shadow-(--shadow-lift)">
                <Quote className="size-6 text-accent/50" aria-hidden="true" />

                <blockquote className="flex-1 text-sm leading-relaxed text-cocoa">
                  {testimonial.message}
                </blockquote>

                <figcaption className="flex items-center justify-between gap-3 border-t border-line pt-3">
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-cocoa">
                      {testimonial.customer_name}
                    </span>
                    {testimonial.source ? (
                      <span className="text-xs text-ink-muted">via {testimonial.source}</span>
                    ) : null}
                  </div>

                  {testimonial.rating ? (
                    <div
                      className="flex gap-0.5"
                      aria-label={`${testimonial.rating} out of 5 stars`}
                    >
                      {Array.from({ length: 5 }, (_, starIndex) => (
                        <Star
                          key={starIndex}
                          aria-hidden="true"
                          className={cn(
                            "size-3.5",
                            starIndex < (testimonial.rating ?? 0)
                              ? "fill-accent text-accent"
                              : "text-line",
                          )}
                        />
                      ))}
                    </div>
                  ) : null}
                </figcaption>
              </figure>
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
    </section>
  );
}
