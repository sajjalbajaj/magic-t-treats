import { ChefHat } from "lucide-react";

import { Reveal, RevealImage } from "@/components/public/motion-primitives";
import { ButtonLink } from "@/components/ui/button";
import { MediaFrame } from "@/components/ui/media-frame";
import { cn } from "@/lib/utils";
import type { AboutStoryContent } from "@/types/domain";
import { altText } from "@/lib/seo/alt-text";

/**
 * The baker's story, in two lengths from one source.
 *
 * The homepage shows the opening paragraphs and links onward; the About page
 * runs the whole thing. Both read from the same `paragraphs` list so the story
 * is written once, in the dashboard, and never drifts between the two pages.
 */
export function MeetTheBaker({
  content,
  showCta = true,
  /** 1 on the About page, where this is the lead heading; 2 on the homepage. */
  level = 2,
  /** Omit to show the full story. The homepage passes a small number. */
  maxParagraphs,
}: {
  content: AboutStoryContent;
  showCta?: boolean;
  level?: 1 | 2;
  maxParagraphs?: number;
}) {
  const Heading = level === 1 ? "h1" : "h2";

  const all = content.paragraphs ?? [];
  const paragraphs = maxParagraphs ? all.slice(0, maxParagraphs) : all;
  const truncated = paragraphs.length < all.length;

  return (
    <section className="section-y" aria-labelledby="meet-the-baker-heading">
      <div className="container-page">
        <Reveal
          variant="up"
          className={cn(
            "grid gap-9 lg:grid-cols-[0.85fr_1fr] lg:gap-14",
            // Centred when the copy is short enough to sit beside the portrait.
            // For the full story the portrait would float in the middle of a
            // very tall column, so it pins to the top and stays in view while
            // the story scrolls past it.
            truncated ? "items-center" : "items-start",
          )}
        >
          <RevealImage
            className={cn(
              "aspect-4/5 w-full shadow-(--shadow-lift)",
              !truncated && "lg:sticky lg:top-28",
            )}
          >
            <MediaFrame
              src={content.photoUrl}
              alt={altText(content.photoAlt || content.bakerName)}
              className="size-full"
              rounded={false}
              showRetry
              sizes="(min-width: 1024px) 40vw, 90vw"
            />
          </RevealImage>

          <div className="flex min-w-0 flex-col gap-4">
            <span className="inline-flex w-fit items-center gap-1.5 font-script text-xl font-semibold text-accent">
              <ChefHat className="size-4" aria-hidden="true" />
              Behind the bakes
            </span>

            <Heading id="meet-the-baker-heading" className="text-3xl sm:text-4xl">
              {content.heading}
            </Heading>

            {paragraphs.map((paragraph, index) => (
              <p
                key={paragraph}
                className={cn(
                  "leading-relaxed text-ink-muted",
                  // The opening paragraph carries the voice of the whole page,
                  // so it gets a size above the rest.
                  index === 0 ? "text-lg" : "text-base",
                )}
              >
                {paragraph}
              </p>
            ))}

            {content.signature ? (
              <p className="mt-2 font-script text-3xl font-semibold text-accent">
                {content.signature}
              </p>
            ) : null}

            {showCta ? (
              <div className="mt-2">
                <ButtonLink href="/about" variant="secondary">
                  Read our story
                </ButtonLink>
              </div>
            ) : null}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
