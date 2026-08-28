"use client";

import { useState } from "react";
import Image from "next/image";
import { motion, useReducedMotion } from "motion/react";

import { cn } from "@/lib/utils";

/**
 * The circular brand badge, with its entrance animation.
 *
 * On first load it zooms in from small with a soft settle. The spring is
 * deliberately low-bounce — a logo that wobbles reads as a toy, not a bakery.
 *
 * `priority` is set because this is above the fold on every page; letting it
 * lazy-load would mean the header visibly pops in after first paint.
 */
export function BrandMark({
  src,
  alt,
  size,
  className,
  animateOnLoad = false,
  /** Slow ambient rotation. Off by default — only the hero mark uses it. */
  spin = false,
}: {
  src: string;
  alt: string;
  size: number;
  className?: string;
  animateOnLoad?: boolean;
  spin?: boolean;
}) {
  const reduceMotion = useReducedMotion();
  const [failed, setFailed] = useState(false);

  /*
    A logo that fails to load renders nothing at all, rather than the bakery
    error card the photographs use. The wordmark sits directly beside it in the
    header and the footer, so the brand is still named; a chef hat standing in
    for the logo would read as a broken logo, which is worse than no logo.
  */
  const image = failed ? null : (
    <Image
      src={src}
      alt={alt}
      width={size}
      height={size}
      priority
      sizes={`${size}px`}
      onError={() => setFailed(true)}
      className="size-full object-contain"
    />
  );

  if (reduceMotion || !animateOnLoad) {
    return (
      <span className={cn("relative block shrink-0", className)} style={{ width: size, height: size }}>
        {image}
      </span>
    );
  }

  return (
    <motion.span
      className={cn("relative block shrink-0", className)}
      style={{ width: size, height: size }}
      initial={{ opacity: 0, scale: 0.55 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{
        type: "spring",
        stiffness: 140,
        damping: 16,
        mass: 0.9,
        // Just enough delay that the zoom is seen rather than missed during
        // the browser's own first paint.
        delay: 0.12,
      }}
    >
      {spin ? (
        <motion.span
          className="block size-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 90, repeat: Infinity, ease: "linear" }}
        >
          {image}
        </motion.span>
      ) : (
        image
      )}
    </motion.span>
  );
}
