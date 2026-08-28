"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion, type Variants } from "motion/react";

import { cn } from "@/lib/utils";

/* ---------------------------------------------------------------------------
   Motion vocabulary for the public site.

   One module so the whole site shares a single set of timings and easings —
   a bakery should feel unhurried, so everything here is a slow ease-out with
   a small travel distance. Nothing bounces, nothing loops in the periphery.

   Every primitive checks `useReducedMotion()` and renders the final state
   immediately when it is set. That is a real branch, not a shorter duration:
   motion sickness is not solved by going faster.
--------------------------------------------------------------------------- */

/** Slow, settling ease. Used by everything so nothing feels out of step. */
const EASE = [0.22, 1, 0.36, 1] as const;

export type RevealVariant = "up" | "fade" | "scale" | "left" | "right" | "rise";

const variants: Record<RevealVariant, Variants> = {
  // Standard section entrance.
  up: {
    hidden: { opacity: 0, y: 26 },
    show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
  },
  fade: {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { duration: 0.7, ease: EASE } },
  },
  // For badges and round marks.
  scale: {
    hidden: { opacity: 0, scale: 0.9 },
    show: { opacity: 1, scale: 1, transition: { duration: 0.55, ease: EASE } },
  },
  left: {
    hidden: { opacity: 0, x: -28 },
    show: { opacity: 1, x: 0, transition: { duration: 0.6, ease: EASE } },
  },
  right: {
    hidden: { opacity: 0, x: 28 },
    show: { opacity: 1, x: 0, transition: { duration: 0.6, ease: EASE } },
  },
  /**
   * "Rise" — the house entrance. A slight lift and swell, like dough proving.
   * Used for cards and imagery where a plain slide would feel mechanical.
   */
  rise: {
    hidden: { opacity: 0, y: 34, scale: 0.97 },
    show: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { duration: 0.7, ease: EASE },
    },
  },
};

type Tag = "div" | "section" | "li" | "ul" | "ol" | "article" | "span" | "figure";

/**
 * Merges a delay into a variant.
 *
 * A `transition` prop on the motion component does NOT win over a transition
 * defined inside a variant — Framer Motion gives the variant precedence. So a
 * delay has to be folded into the variant itself, or it is silently dropped.
 */
function withDelay(variant: RevealVariant, delay: number): Variants {
  if (!delay) return variants[variant];

  const base = variants[variant];
  const show = base.show as { transition?: object };

  return {
    ...base,
    show: { ...show, transition: { ...show.transition, delay } },
  };
}

/** Reveals its children once, when scrolled into view. */
export function Reveal({
  children,
  variant = "up",
  delay = 0,
  className,
  as = "div",
  amount = 0.15,
}: {
  children: ReactNode;
  variant?: RevealVariant;
  delay?: number;
  className?: string;
  as?: Tag;
  amount?: number;
}) {
  const reduceMotion = useReducedMotion();
  const Component = motion[as];

  if (reduceMotion) {
    const Static = as;
    return <Static className={className}>{children}</Static>;
  }

  return (
    <Component
      data-reveal=""
      className={className}
      variants={withDelay(variant, delay)}
      initial="hidden"
      whileInView="show"
      // `once` matters: re-animating on every scroll-past is what makes a
      // marketing site feel restless rather than crafted.
      viewport={{ once: true, amount, margin: "0px 0px -80px 0px" }}
    >
      {children}
    </Component>
  );
}

/**
 * Staggers its direct children.
 *
 * Children must be <RevealItem>. Using a parent container for the stagger
 * (rather than a delay prop on each child) keeps the rhythm correct no matter
 * how many items the baker adds.
 */
export function RevealGroup({
  children,
  className,
  as = "div",
  stagger = 0.08,
  delayChildren = 0,
  amount = 0.1,
}: {
  children: ReactNode;
  className?: string;
  as?: Tag;
  stagger?: number;
  delayChildren?: number;
  amount?: number;
}) {
  const reduceMotion = useReducedMotion();
  const Component = motion[as];

  if (reduceMotion) {
    const Static = as;
    return <Static className={className}>{children}</Static>;
  }

  return (
    <Component
      data-reveal=""
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount, margin: "0px 0px -60px 0px" }}
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: stagger, delayChildren } },
      }}
    >
      {children}
    </Component>
  );
}

export function RevealItem({
  children,
  variant = "rise",
  className,
  as = "div",
}: {
  children: ReactNode;
  variant?: RevealVariant;
  className?: string;
  as?: Tag;
}) {
  const reduceMotion = useReducedMotion();
  const Component = motion[as];

  if (reduceMotion) {
    const Static = as;
    return <Static className={className}>{children}</Static>;
  }

  return (
    <Component data-reveal="" className={className} variants={variants[variant]}>
      {children}
    </Component>
  );
}

/**
 * Word-by-word headline reveal.
 *
 * Words are wrapped in inline-block spans so each can transform independently;
 * the spaces are preserved as real text nodes, so the string still reads and
 * copies as one sentence and screen readers announce it normally.
 */
export function AnimatedText({
  text,
  className,
  as: Tag = "h2",
  id,
  delay = 0,
  stagger = 0.045,
}: {
  text: string;
  className?: string;
  as?: "h1" | "h2" | "h3" | "p" | "span";  // h1 for a page lead heading
  id?: string;
  delay?: number;
  stagger?: number;
}) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return (
      <Tag id={id} className={className}>
        {text}
      </Tag>
    );
  }

  const words = text.split(" ");
  const MotionSpan = motion.span;

  return (
    <Tag id={id} className={className}>
      <MotionSpan
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.4 }}
        variants={{ hidden: {}, show: { transition: { staggerChildren: stagger, delayChildren: delay } } }}
        // Without this the wrapper would be an inline box and the words would
        // not wrap the way the heading's own line-height expects.
        style={{ display: "inline" }}
      >
        {words.map((word, index) => (
          <MotionSpan
            key={`${word}-${index}`}
            data-reveal=""
            className="inline-block whitespace-pre"
            variants={{
              hidden: { opacity: 0, y: "0.35em" },
              show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE } },
            }}
          >
            {word}
            {index < words.length - 1 ? " " : ""}
          </MotionSpan>
        ))}
      </MotionSpan>
    </Tag>
  );
}

/**
 * Image reveal: the picture rises into its frame and settles from a slight
 * over-scale. Reads as the photo being "placed" rather than sliding in.
 *
 * This used to wipe the frame open with an animated `clip-path`. It did not
 * work — Framer applied the initial `inset(... 100% ...)` as an inline style
 * and then never animated it, leaving the image permanently clipped to
 * nothing. Two images on the homepage were invisible because of it, which is
 * the worst possible failure mode for a decorative effect.
 *
 * Now it animates only opacity and transform, the same properties every other
 * primitive here uses, with the shell's `overflow-hidden` providing the
 * masking. Less clever, and it actually renders.
 */
export function RevealImage({
  children,
  className,
  delay = 0,
  rounded = true,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  rounded?: boolean;
}) {
  const reduceMotion = useReducedMotion();

  const shell = cn("relative overflow-hidden", rounded && "rounded-(--radius-card)", className);

  if (reduceMotion) {
    return <div className={shell}>{children}</div>;
  }

  return (
    <motion.div
      className={shell}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.2 }}
      variants={{ hidden: {}, show: {} }}
    >
      <motion.div
        data-reveal=""
        className="size-full"
        variants={{
          hidden: { opacity: 0, y: "6%", scale: 1.08 },
          show: {
            opacity: 1,
            y: "0%",
            scale: 1,
            transition: { duration: 0.85, ease: EASE, delay },
          },
        }}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

/**
 * Very slow vertical drift, for small decorative marks only.
 *
 * Deliberately not applied to anything a visitor needs to read or click —
 * persistent motion next to text is a distraction, and next to a button it is
 * a usability problem.
 */
export function Float({
  children,
  className,
  distance = 6,
  duration = 5,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  distance?: number;
  duration?: number;
  delay?: number;
}) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) return <span className={className}>{children}</span>;

  return (
    <motion.span
      className={className}
      animate={{ y: [0, -distance, 0] }}
      transition={{ duration, delay, repeat: Infinity, ease: "easeInOut" }}
    >
      {children}
    </motion.span>
  );
}
