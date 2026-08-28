"use client";

import { useState } from "react";
import Image from "next/image";
import { CakeSlice, RefreshCcw } from "lucide-react";

import { BrokenBakeryIcon } from "@/components/ui/loaders";
import { cn } from "@/lib/utils";

/**
 * Every photograph on the public site goes through here.
 *
 * Four states, all of which happen in practice:
 *
 *   no URL     -> "Add a little sweetness here". The bakery launches before all
 *                 its photography exists, and an empty slot should read as
 *                 something waiting to be filled rather than something broken.
 *   loading    -> cream shimmer underneath, so the card has weight and the
 *                 layout does not jump.
 *   loaded     -> the shimmer is unmounted, not just hidden. An animation left
 *                 running behind every product image costs compositor work for
 *                 something invisible.
 *   failed     -> chef hat with a bitten choco bite, "This treat is still in
 *                 the oven." The browser's broken-image glyph is the one piece
 *                 of the page we would otherwise not have designed.
 *
 * Two sizing modes, because the site needs both:
 *   - `fill` (default)   -> the parent sets the box and the photo covers it.
 *   - intrinsic          -> pass `width` and `height` and the photo keeps its
 *                           own proportions. Those numbers do not have to be
 *                           the file's real pixel size; they are the ratio the
 *                           browser uses to reserve space before the bytes
 *                           arrive, which is what stops the page jumping.
 */
export function MediaFrame({
  src,
  alt,
  className,
  sizes = "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw",
  priority = false,
  fill = true,
  width,
  height,
  rounded = true,
  imageClassName,
  showRetry = false,
  compact = false,
  errorMessage = "This treat is still in the oven.",
  emptyMessage = "Add a little sweetness here",
}: {
  src: string | null | undefined;
  alt: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
  /** Set false and pass width + height to keep the photo's own proportions. */
  fill?: boolean;
  width?: number;
  height?: number;
  rounded?: boolean;
  imageClassName?: string;
  /** Offer a retry button on failure. Off in grids, where a row of buttons is noise. */
  showRetry?: boolean;
  /** Icon only, no copy. For thumbnails too small to read a sentence in. */
  compact?: boolean;
  errorMessage?: string;
  emptyMessage?: string;
}) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const intrinsic = !fill && width != null && height != null;

  const shell = cn(
    "relative overflow-hidden bg-blush/50",
    intrinsic ? "block" : undefined,
    rounded && "rounded-(--radius-card)",
    className,
  );

  /**
   * Retry re-mounts the <img>, which re-issues the request.
   *
   * It deliberately does NOT cache-bust by appending to the URL. An earlier
   * version added `?retry=1` to the src; Next's image optimizer rejects a local
   * path carrying a query string with a 400, so the button failed every single
   * time it was pressed. Verified with a direct request to `/_next/image`.
   *
   * A plain remount is enough: the browser does not cache 4xx/5xx responses
   * without explicit headers, so the retry really does hit the network again.
   */
  const retry = () => {
    setFailed(false);
    setLoaded(false);
    setAttempt((n) => n + 1);
  };

  // An intrinsic frame has no height of its own until the image lays out, so
  // the fallback states need a ratio to occupy or they collapse to nothing.
  const fallbackShell = cn(shell, intrinsic && "aspect-4/5");

  if (!src) {
    return (
      <div className={fallbackShell} role="img" aria-label={alt}>
        <div className="absolute inset-0 grid place-items-center bg-gradient-to-br from-blush/70 via-cream to-blush/40 p-4 text-center">
          <span className="flex flex-col items-center gap-2">
            {/*
              A cake slice here, and the bitten hat only for a genuine failure.
              Two reasons. A grid of products awaiting photography shows this
              state on every card at once, and four identical chef hats in a row
              reads as a fault rather than as empty slots. It also tells the
              baker two different things apart at a glance: "no photo uploaded
              yet" versus "the photo is there but would not load".
            */}
            <CakeSlice
              className={compact ? "size-5 text-accent/50" : "size-9 text-accent/50"}
              aria-hidden="true"
            />
            {!compact ? (
              <span className="font-script text-lg text-cocoa/70">{emptyMessage}</span>
            ) : null}
          </span>
        </div>
      </div>
    );
  }

  if (failed) {
    return (
      <div className={fallbackShell} role="img" aria-label={`${alt} (image unavailable)`}>
        <div className="absolute inset-0 overflow-hidden bg-cream">
          {/* Decorative blobs, clipped by the shell. */}
          <span
            aria-hidden="true"
            className="absolute -left-12 -top-12 size-32 rounded-full bg-blush/50"
          />
          <span
            aria-hidden="true"
            className="absolute -bottom-12 -right-12 size-36 rounded-full bg-sage/15"
          />

          <div className="relative grid size-full place-items-center p-4">
            <div className="flex max-w-[15rem] flex-col items-center text-center">
              <BrokenBakeryIcon className={compact ? "h-10 w-12" : "h-16 w-20"} />

              {compact ? (
                <p className="mt-2 text-xs font-medium text-cocoa">Image unavailable</p>
              ) : (
                <>
                  <p className="mt-3 text-sm font-semibold text-cocoa">{errorMessage}</p>
                  <p className="mt-1 text-xs text-ink-muted">We could not load this image.</p>
                </>
              )}

              {showRetry && !compact ? (
                <button
                  type="button"
                  onClick={retry}
                  className="mt-4 inline-flex items-center gap-2 rounded-(--radius-pill) border border-line bg-surface/80 px-4 py-2 text-xs font-medium text-cocoa transition-colors duration-200 hover:bg-surface"
                >
                  <RefreshCcw className="size-3.5" aria-hidden="true" />
                  Try again
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={shell}>
      {!loaded ? (
        <div aria-hidden="true" className="absolute inset-0 overflow-hidden bg-blush/45">
          <div className="bakery-shimmer absolute inset-0" />
        </div>
      ) : null}

      <Image
        key={attempt}
        src={src}
        alt={alt}
        {...(intrinsic ? { width, height } : { fill: true })}
        sizes={sizes}
        priority={priority}
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
        className={cn(
          "transition-opacity duration-500 ease-(--ease-gentle)",
          intrinsic ? "relative h-auto w-full" : "object-cover",
          loaded ? "opacity-100" : "opacity-0",
          imageClassName,
        )}
      />
    </div>
  );
}
