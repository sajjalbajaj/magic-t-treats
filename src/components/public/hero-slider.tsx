"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowLeft, ArrowRight, Pause, Play, Star } from "lucide-react";

import { BrandMark } from "@/components/public/brand-mark";
import { MediaFrame } from "@/components/ui/media-frame";
import { SmartVideo } from "@/components/public/smart-video";
import { cn } from "@/lib/utils";

export type HeroSlide = {
  id: string;
  type: "image" | "video";
  src: string;
  poster: string | null;
  label: string;
  caption: string | null;
};

/**
 * Arch-framed hero slider.
 *
 * Each piece of media is its own slide — the bakery's reels work far better
 * shown one at a time at size than shrunk into a grid further down the page.
 *
 * Advances when the current video *finishes*, rather than on a timer — a timer
 * would cut a 10-second reel off at 6. Image slides have no "ended" event, so
 * those fall back to a fixed dwell.
 *
 * Auto-rotation is paused under `prefers-reduced-motion`, and there is an
 * explicit pause control: WCAG 2.2.2 requires a way to stop content that moves
 * automatically for more than five seconds.
 */
export function HeroSlider({
  slides,
  logoUrl,
  bakeryName,
  rating,
}: {
  slides: HeroSlide[];
  logoUrl: string | null;
  bakeryName: string;
  rating: { value: number; count: number } | null;
}) {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [paused, setPaused] = useState(false);
  const reduceMotion = useReducedMotion();

  const count = slides.length;

  const go = useCallback(
    (step: number) => {
      setDirection(step);
      setIndex((current) => (current + step + count) % count);
    },
    [count],
  );

  const active = slides[index] ?? slides[0];

  // Rotation is on unless the visitor stopped it or asked for reduced motion.
  const autoRotate = count > 1 && !paused && !reduceMotion;

  const advance = useCallback(() => {
    if (autoRotate) go(1);
  }, [autoRotate, go]);

  // Images have no completion event, so they get a fixed dwell instead.
  // `advance` is memoised, so listing it as a dependency does not restart the
  // timer on every render — only when rotation is toggled or the slide changes.
  useEffect(() => {
    if (!autoRotate || active?.type !== "image") return;
    const timer = window.setTimeout(advance, 6000);
    return () => window.clearTimeout(timer);
  }, [autoRotate, active?.type, index, advance]);

  if (count === 0 || !active) return null;

  return (
    <div className="relative min-w-0">
      <div className="flex min-w-0 items-center justify-center gap-4">
        {/* The arch: a full dome on top, softly squared below.

            Sized by HEIGHT with the aspect ratio deriving the width, rather
            than the other way round. The hero has to fit the fold, and height
            is the constrained axis — letting the grid column dictate width
            would push the arch past the bottom of the viewport on laptops.
            `svh` keeps it honest on mobile, where the browser chrome is
            counted in. */}
        <div className="relative">
          <div className="relative aspect-4/5 h-[clamp(8.5rem,calc(100svh-32rem),19rem)] w-auto overflow-hidden rounded-t-full rounded-b-3xl bg-blush/40 ring-1 ring-accent/15 sm:h-[clamp(12rem,calc(100svh-31rem),25rem)] lg:h-[clamp(19rem,calc(100svh-16rem),46rem)]">
            <AnimatePresence initial={false} mode="popLayout" custom={direction}>
              <motion.div
                key={active.id}
                className="absolute inset-0"
                custom={direction}
                initial={
                  reduceMotion ? { opacity: 0 } : { opacity: 0, x: direction * 60, scale: 1.04 }
                }
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: direction * -60 }}
                transition={{ duration: reduceMotion ? 0.15 : 0.6, ease: [0.22, 1, 0.36, 1] }}
              >
                {active.type === "video" ? (
                  <SmartVideo
                    // Keyed on the slide so a repeat visit to the same slide
                    // remounts and plays from the start rather than resuming.
                    key={active.id}
                    src={active.src}
                    poster={active.poster}
                    label={active.label}
                    className="size-full"
                    loop={!autoRotate}
                    onEnded={autoRotate ? advance : undefined}
                  />
                ) : (
                  <MediaFrame
                    src={active.src}
                    alt={active.label}
                    priority={index === 0}
                    rounded={false}
                    className="size-full"
                    sizes="(min-width: 1024px) 44vw, 90vw"
                  />
                )}
              </motion.div>
            </AnimatePresence>

            {rating ? (
              <div className="absolute bottom-0 right-0 flex items-center gap-2 rounded-tl-2xl bg-ink px-4 py-2.5">
                <span className="flex gap-0.5" aria-hidden="true">
                  {Array.from({ length: 5 }, (_, star) => (
                    <Star
                      key={star}
                      className={cn(
                        "size-3.5",
                        star < Math.round(rating.value)
                          // Gold reads as a rating; the brand pink would not.
                          ? "fill-[#f6b73c] text-[#f6b73c]"
                          : "text-cream/30",
                      )}
                    />
                  ))}
                </span>
                <span className="text-sm font-bold text-cream">{rating.value.toFixed(1)}</span>
                <span className="sr-only">
                  average rating from {rating.count} reviews
                </span>
              </div>
            ) : null}
          </div>

          {/* The brand badge, straddling the arch edge and turning slowly. */}
          {logoUrl ? (
            <div className="absolute -left-4 top-[34%] z-10 sm:-left-6 lg:-left-10">
              <BrandMark
                src={logoUrl}
                alt={bakeryName}
                size={72}
                animateOnLoad
                spin
                className="rounded-full bg-cream/80 p-1 shadow-(--shadow-lift) backdrop-blur-sm lg:size-28"
              />
            </div>
          ) : null}
        </div>

        {/* Slide counter — a vertical rule that fills as you advance. */}
        {slides.length > 1 ? (
          <div className="hidden w-8 shrink-0 flex-col items-center justify-center gap-3 lg:flex">
            <span className="text-xs font-bold tabular-nums text-cocoa">
              {String(index + 1).padStart(2, "0")}
            </span>
            <span className="relative h-28 w-px bg-accent/20 xl:h-36">
              <motion.span
                className="absolute inset-x-0 top-0 bg-accent"
                animate={{ height: `${((index + 1) / slides.length) * 100}%` }}
                transition={{ duration: reduceMotion ? 0 : 0.45, ease: [0.22, 1, 0.36, 1] }}
              />
            </span>
            <span className="text-xs font-bold tabular-nums text-ink-muted">
              {String(slides.length).padStart(2, "0")}
            </span>
          </div>
        ) : null}
      </div>

      {slides.length > 1 ? (
        <div className="absolute bottom-1 right-0 z-10 flex items-center gap-2 lg:static lg:mt-4 lg:justify-center lg:gap-3">
          <button
            type="button"
            onClick={() => go(-1)}
            aria-label="Previous slide"
            className="grid size-9 place-items-center rounded-full border border-accent/40 bg-cream/85 text-accent backdrop-blur-sm transition-colors duration-200 hover:bg-accent hover:text-white lg:size-11 lg:bg-transparent"
          >
            <ArrowLeft className="size-4.5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            aria-label="Next slide"
            className="grid size-9 place-items-center rounded-full bg-accent text-white transition-colors duration-200 hover:bg-accent-deep lg:size-11"
          >
            <ArrowRight className="size-4.5" aria-hidden="true" />
          </button>

          {!reduceMotion ? (
            <button
              type="button"
              onClick={() => setPaused((current) => !current)}
              aria-pressed={paused}
              aria-label={paused ? "Resume automatic slideshow" : "Pause automatic slideshow"}
              className="grid size-9 place-items-center rounded-full border border-accent/40 bg-cream/85 text-accent backdrop-blur-sm transition-colors duration-200 hover:bg-accent hover:text-white lg:size-11 lg:bg-transparent"
            >
              {paused ? (
                <Play className="ml-0.5 size-4" aria-hidden="true" />
              ) : (
                <Pause className="size-4" aria-hidden="true" />
              )}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
