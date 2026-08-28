import { Cookie, Gift, Leaf, MapPin, ShoppingBag, Sparkles, type LucideIcon } from "lucide-react";

import { ButtonLink } from "@/components/ui/button";
import { InstagramIcon } from "@/components/ui/brand-icons";
import { EnquireButton } from "@/components/public/enquire-button";
import { HeroSlider, type HeroSlide } from "@/components/public/hero-slider";
import { SocialRail } from "@/components/public/social-rail";
import {
  Float,
  Reveal,
  RevealGroup,
  RevealItem,
} from "@/components/public/motion-primitives";
import type { HeroContent, Post, Testimonial } from "@/types/domain";

/**
 * Icons for the hero badges, matched on the text the baker types.
 *
 * Keyword-matched rather than configured, so editing the badge copy in the
 * dashboard never leaves a mismatched icon behind — worst case it falls back
 * to a neutral sparkle.
 */
const BADGE_ICONS: [RegExp, LucideIcon][] = [
  [/homemade|handmade|small batch/i, Cookie],
  [/sugar|healthy|eggless/i, Leaf],
  [/custom|personal/i, Gift],
  [/deliver|tricity|chandigarh|mohali|panchkula/i, MapPin],
  [/pickup|collect/i, ShoppingBag],
];

function badgeIcon(label: string): LucideIcon {
  for (const [pattern, icon] of BADGE_ICONS) {
    if (pattern.test(label)) return icon;
  }
  return Sparkles;
}

/**
 * Splits the headline so the closing phrase can carry the accent colour.
 *
 * Splits on the last sentence break, falling back to the midpoint by word
 * count. Done by rule rather than by storing two fields, so the baker keeps
 * editing one plain heading and still gets the two-tone treatment.
 */
function splitHeadline(heading: string): [string, string] {
  const sentences = heading.match(/[^.!?]+[.!?]*/g);

  if (sentences && sentences.length > 1) {
    const last = sentences[sentences.length - 1]?.trim() ?? "";
    const head = sentences.slice(0, -1).join("").trim();
    if (head && last) return [head, last];
  }

  const words = heading.split(" ");
  if (words.length < 3) return [heading, ""];
  const pivot = Math.ceil(words.length / 2);
  return [words.slice(0, pivot).join(" "), words.slice(pivot).join(" ")];
}

/** Builds the slide list: the hero's own media first, then published reels. */
function buildSlides(content: HeroContent, reels: Post[]): HeroSlide[] {
  const slides: HeroSlide[] = [];

  if (content.mediaUrl) {
    slides.push({
      id: "hero-media",
      type: content.mediaType,
      src: content.mediaUrl,
      poster: null,
      label: "Magic T-treats",
      caption: null,
    });
  }

  for (const reel of reels) {
    if (!reel.media_url) continue;
    slides.push({
      id: reel.id,
      type: reel.type,
      src: reel.media_url,
      poster: reel.thumbnail_url,
      label: reel.title ?? "Magic T-treats",
      caption: reel.title,
    });
  }

  return slides;
}

/**
 * Homepage hero.
 *
 * A cream card floating on the brand pink, with the media in an arch to the
 * right and the brand badge turning slowly on its edge. The headline animates
 * on mount rather than on scroll — it is already in view, so a scroll trigger
 * would either fire instantly or never.
 */
export function Hero({
  content,
  instagramUrl,
  whatsappUrl,
  logoUrl,
  bakeryName,
  reels,
  testimonials,
}: {
  content: HeroContent;
  instagramUrl: string;
  whatsappUrl: string;
  logoUrl: string | null;
  bakeryName: string;
  reels: Post[];
  testimonials: Testimonial[];
}) {
  const [headStart, headEnd] = splitHeadline(content.heading);
  const slides = buildSlides(content, reels);

  // Only claim a rating when there are real published reviews behind it.
  const rated = testimonials.filter((item) => typeof item.rating === "number");
  const rating =
    rated.length > 0
      ? {
          value: rated.reduce((sum, item) => sum + (item.rating ?? 0), 0) / rated.length,
          count: rated.length,
        }
      : null;

  return (
    <section className="bg-accent-vivid px-2 pb-3 pt-2 sm:px-4 sm:pb-4 sm:pt-3">
      {/*
        Fills the fold: viewport height less the header (5rem) and this
        section's own frame padding. `svh` rather than `vh` so mobile browser
        chrome is accounted for — with `vh` the bottom of the hero would sit
        under Safari's toolbar. Content is centred, so on tall screens the
        card breathes instead of stranding everything at the top.
      */}
      <div className="relative flex min-h-[calc(100svh-6.4rem)] flex-col justify-center overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-accent-soft via-cream to-blush sm:min-h-[calc(100svh-6.9rem)] sm:rounded-[2.5rem]">
        {/* Soft brand-tinted glows. Decorative only, behind everything. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-24 -top-24 size-72 rounded-full bg-accent/8 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 top-40 size-80 rounded-full bg-sage/12 blur-3xl"
        />

        <SocialRail
          instagramUrl={instagramUrl}
          whatsappUrl={whatsappUrl}
          tagline="Any treat you need, baked to order"
        />

        <div className="relative grid items-center gap-6 px-5 py-6 sm:gap-8 sm:px-8 sm:py-8 lg:grid-cols-[1fr_1.08fr] lg:gap-10 lg:py-8 lg:pl-20 lg:pr-8">
          <div className="flex min-w-0 flex-col items-start gap-3 sm:gap-4 lg:gap-5">
            <Reveal variant="scale" className="[@media(max-height:720px)]:hidden">
              <span className="inline-flex items-center gap-2 rounded-(--radius-pill) border border-accent/25 bg-cream/70 px-4 py-1 font-script text-xl font-semibold text-accent-deep">
                <Float distance={3} duration={4}>
                  <Sparkles className="size-3.5" aria-hidden="true" />
                </Float>
                Baked to order in Tricity
              </span>
            </Reveal>

            {/*
              One <h1> with a coloured span rather than two headings — the page
              must expose a single top-level heading, and this keeps the whole
              sentence together for screen readers.
            */}
            <Reveal variant="up" delay={0.05}>
              <h1 className="max-w-xl text-[1.85rem] leading-[1.08] sm:text-4xl md:text-5xl lg:text-[3.4rem] xl:text-6xl">
                {headStart}
                {headEnd ? (
                  <>
                    {" "}
                    <span className="font-script text-[1.35em] font-bold leading-[0.95] text-accent">
                      {headEnd}
                    </span>
                  </>
                ) : null}
              </h1>
            </Reveal>

            <Reveal variant="up" delay={0.15}>
              <p className="clamp-3 max-w-lg text-sm leading-relaxed text-ink-muted sm:text-base md:[-webkit-line-clamp:none] lg:text-[1.05rem]">
                {content.description}
              </p>
            </Reveal>

            <Reveal variant="up" delay={0.25}>
              <div className="flex flex-row flex-wrap gap-3">
                <ButtonLink href="#treats" size="md" className="lg:h-13 lg:px-8 lg:text-base">
                  <Cookie className="size-4" aria-hidden="true" />
                  {content.primaryButton}
                </ButtonLink>

                {instagramUrl ? (
                  <ButtonLink
                    href={instagramUrl}
                    external
                    variant="secondary"
                    size="md"
                    className="lg:h-13 lg:px-8 lg:text-base"
                  >
                    <InstagramIcon className="size-4" aria-hidden="true" />
                    {content.secondaryButton}
                  </ButtonLink>
                ) : (
                  <EnquireButton variant="secondary" size="lg" ctaLocation="hero">
                    {content.secondaryButton}
                  </EnquireButton>
                )}
              </div>
            </Reveal>

            {content.badges.length > 0 ? (
              <RevealGroup
                as="ul"
                className="scroll-rail mt-1 w-full max-w-full gap-x-5 md:flex md:flex-wrap md:gap-y-2 md:overflow-visible"
                delayChildren={0.35}
                stagger={0.07}
              >
                {content.badges.map((badge) => {
                  const Icon = badgeIcon(badge);
                  return (
                    <RevealItem
                      as="li"
                      key={badge}
                      variant="fade"
                      className="flex shrink-0 items-center gap-2 whitespace-nowrap text-xs font-medium text-cocoa-soft sm:text-sm"
                    >
                      <Icon className="size-4 text-accent" aria-hidden="true" />
                      {badge}
                    </RevealItem>
                  );
                })}
              </RevealGroup>
            ) : null}
          </div>

          <HeroSlider
            slides={slides}
            logoUrl={logoUrl}
            bakeryName={bakeryName}
            rating={rating}
          />
        </div>
      </div>
    </section>
  );
}
