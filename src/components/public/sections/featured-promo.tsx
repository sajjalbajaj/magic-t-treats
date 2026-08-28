import { CalendarDays, Check, Sparkles } from "lucide-react";

import { Reveal, RevealGroup, RevealItem, RevealImage } from "@/components/public/motion-primitives";
import { MediaFrame } from "@/components/ui/media-frame";
import { EnquireButton } from "@/components/public/enquire-button";
import { Badge } from "@/components/ui/primitives";
import type { FeaturedContent } from "@/types/domain";
import { altText } from "@/lib/seo/alt-text";

/**
 * Seasonal promotion banner.
 *
 * Built around a ready-made campaign poster rather than a styled layout,
 * because that is what the bakery actually produces for each festival — the
 * section frames the artwork instead of trying to rebuild it in HTML, so a new
 * campaign is a single image swap from the dashboard.
 *
 * Hides itself entirely when no artwork is set.
 */
export function FeaturedPromo({ content }: { content: FeaturedContent }) {
  if (!content.imageUrl) return null;

  return (
    <section
      className="section-y bg-gradient-to-b from-accent-soft via-cream to-cream"
      aria-labelledby="featured-heading"
    >
      <div className="container-page">
        <div className="grid items-center gap-9 lg:grid-cols-[0.82fr_minmax(0,1fr)] lg:gap-14">
          {/*
            A 4:5 food photograph, shown edge to edge.

            An earlier version sat the artwork on a pink mat, which suited the
            flat campaign poster it was built for. A real photo does not need
            it: the section's own gradient is already the brand ground, and a
            coloured border around a warm, dark image only competes with it.
            The shadow does the lifting instead.

            Capped on small screens so the portrait does not run taller than the
            viewport before the copy beside it is ever reached.
          */}
          <RevealImage className="mx-auto w-full max-w-sm shadow-(--shadow-lift) sm:max-w-md lg:max-w-none">
            <MediaFrame
              src={content.imageUrl}
              alt={altText(content.imageAlt || content.heading)}
              fill={false}
              width={1122}
              height={1402}
              rounded={false}
              showRetry
              sizes="(min-width: 1024px) 38vw, (min-width: 640px) 28rem, 24rem"
            />
          </RevealImage>

          <div className="flex flex-col items-start gap-5">
            <Reveal variant="scale">
              <Badge tone="accent" className="font-script text-lg font-semibold">
                <Sparkles className="size-4" aria-hidden="true" />
                {content.eyebrow}
              </Badge>
            </Reveal>

            <Reveal variant="up" delay={0.05}>
              <h2 id="featured-heading" className="text-3xl sm:text-4xl lg:text-5xl">
                {content.heading}
              </h2>
            </Reveal>

            <Reveal variant="up" delay={0.1}>
              <p className="max-w-lg text-base leading-relaxed text-ink-muted">
                {content.description}
              </p>
            </Reveal>

            {content.points.length > 0 ? (
              <RevealGroup as="ul" className="flex flex-col gap-2.5" delayChildren={0.15}>
                {content.points.map((point) => (
                  <RevealItem as="li" key={point} variant="left" className="flex items-start gap-3">
                    <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-accent/12">
                      <Check className="size-3 text-accent" aria-hidden="true" />
                    </span>
                    <span className="text-sm leading-relaxed text-cocoa">{point}</span>
                  </RevealItem>
                ))}
              </RevealGroup>
            ) : null}

            <Reveal variant="up" delay={0.25} className="mt-1 flex flex-wrap items-center gap-3">
              <EnquireButton size="lg" ctaLocation="featured_promo">
                {content.ctaLabel}
              </EnquireButton>

              {content.note ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-muted">
                  <CalendarDays className="size-3.5 text-accent" aria-hidden="true" />
                  {content.note}
                </span>
              ) : null}
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
