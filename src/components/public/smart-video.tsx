"use client";

import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";

import { VideoLoadingBadge } from "@/components/ui/loaders";

import { cn } from "@/lib/utils";
import { BrokenBakeryIcon } from "@/components/ui/loaders";

/**
 * Viewport-aware video.
 *
 * Bakery reels are the heaviest thing on the page, so:
 *   - `preload="none"` until the element is near the viewport — nothing is
 *     downloaded for videos the visitor never scrolls to.
 *   - playback starts only while visible and pauses on the way out, which
 *     stops a dozen off-screen videos decoding at once on a phone.
 *   - muted + playsInline, because autoplay with sound is both blocked by
 *     browsers and hostile to the visitor. Sound is opt-in via the control.
 */
export function SmartVideo({
  src,
  poster,
  className,
  label,
  showSoundToggle = false,
  loop = true,
  onEnded,
  fit = "cover",
}: {
  src: string;
  poster?: string | null;
  className?: string;
  label: string;
  /**
   * `cover` fills the box and crops, which is what tiles and reels want.
   * `contain` letterboxes instead — use it wherever the visitor has asked to
   * see the video properly, such as the gallery lightbox, where cropping a
   * portrait reel into a landscape box hides most of the frame.
   */
  fit?: "cover" | "contain";
  /** Off by default: the reels carry no narration worth unmuting for. */
  showSoundToggle?: boolean;
  /** Set false when the caller wants `onEnded` — a looping video never ends. */
  loop?: boolean;
  onEnded?: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [muted, setMuted] = useState(true);
  const [started, setStarted] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const element = videoRef.current;
    if (!element) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setIsVisible(true);
            // Autoplaying reels is motion the visitor did not ask for.
            if (!prefersReducedMotion) {
              void element.play().then(
                () => setStarted(true),
                () => undefined, // Autoplay can still be refused; the poster stays.
              );
            }
          } else {
            element.pause();
          }
        }
      },
      { threshold: 0.4 },
    );

    /*
      The failure listener is attached to the element directly rather than
      through React's `onError` prop.

      A media element's `error` event does not bubble, and it can fire while
      React is still committing the update that set `src` in the first place.
      Verified against a real 404: `video.error.code` was 4 and
      `networkState` was NETWORK_NO_SOURCE, yet the React handler never ran and
      the visitor was left looking at an empty black box.
    */
    const onFailure = () => setFailed(true);
    element.addEventListener("error", onFailure);

    // A src that is already broken when this effect runs has missed its event.
    if (element.error) setFailed(true);

    observer.observe(element);
    return () => {
      observer.disconnect();
      element.removeEventListener("error", onFailure);
    };
  }, []);

  /*
    `src` is attached only once the element is near the viewport, so the error
    for a broken source arrives after that. Re-checking on each visibility
    change catches it without another listener.
  */
  useEffect(() => {
    const element = videoRef.current;
    if (isVisible && element?.error) setFailed(true);
  }, [isVisible]);

  return (
    <div className={cn("relative overflow-hidden bg-cocoa/8", className)}>
      <video
        ref={videoRef}
        // Only attach the source once the element has been seen.
        src={isVisible ? src : undefined}
        data-src={src}
        poster={poster ?? undefined}
        muted={muted}
        loop={loop}
        playsInline
        onEnded={onEnded}
        onError={() => setFailed(true)}
        /*
          With a poster image, nothing needs downloading until the element is
          near the viewport. Without one, "metadata" lets the browser paint the
          first frame as a stand-in — otherwise the tile is a flat colour until
          playback starts, which looks broken.
        */
        preload={poster ? "none" : "metadata"}
        aria-label={label}
        className={cn("size-full", fit === "contain" ? "object-contain" : "object-cover")}
      />

      {failed ? (
        /*
          Same bakery language as a broken photograph. A <video> that fails
          renders as an empty black box, which looks like the page is still
          loading rather than like something went wrong.
        */
        <div className="absolute inset-0 grid place-items-center bg-cream p-4 text-center">
          <span className="flex max-w-[15rem] flex-col items-center">
            <BrokenBakeryIcon className="h-14 w-16" />
            <span className="mt-3 text-sm font-semibold text-cocoa">
              This reel needs another bake.
            </span>
            <span className="mt-1 text-xs text-ink-muted">We could not play this video.</span>
          </span>
        </div>
      ) : null}

      {!started && !failed ? (
        // Pulsing bite behind the play icon: the reel is fetching, and a
        // static icon looks like a video that refuses to start.
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <VideoLoadingBadge />
        </div>
      ) : null}

      {showSoundToggle && started ? (
        <button
          type="button"
          onClick={() => {
            const element = videoRef.current;
            if (!element) return;
            const next = !muted;
            element.muted = next;
            setMuted(next);
            if (!next) void element.play().catch(() => undefined);
          }}
          aria-label={muted ? `Unmute ${label}` : `Mute ${label}`}
          className="absolute bottom-3 left-3 grid size-9 place-items-center rounded-full bg-ink/55 text-cream backdrop-blur-sm transition-colors duration-200 hover:bg-ink/75"
        >
          {muted ? (
            <VolumeX className="size-4" aria-hidden="true" />
          ) : (
            <Volume2 className="size-4" aria-hidden="true" />
          )}
        </button>
      ) : null}
    </div>
  );
}
