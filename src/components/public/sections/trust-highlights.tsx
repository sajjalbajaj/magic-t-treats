import { HandHeart, Leaf, Sparkles, Timer } from "lucide-react";

import { AnimatedText } from "@/components/public/motion-primitives";

import { Reveal, RevealGroup, RevealItem } from "@/components/public/motion-primitives";
import type { TrustContent } from "@/types/domain";

// Icons are positional rather than content-driven: the baker edits the copy
// from the dashboard, and we do not want her picking icon names to do it.
const icons = [Timer, Leaf, HandHeart, Sparkles];

export function TrustHighlights({ content }: { content: TrustContent }) {
  if (content.items.length === 0) return null;

  return (
    <section
      className="border-y border-line bg-surface-warm py-12 md:py-16"
      aria-labelledby="trust-heading"
    >
      <div className="container-page flex flex-col gap-8">
        <Reveal variant="up">
          <AnimatedText
            as="h2"
            id="trust-heading"
            text={content.heading}
            className="text-2xl sm:text-3xl"
          />
        </Reveal>

        <RevealGroup as="ul" className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4" stagger={0.08}>
          {content.items.map((item, index) => {
            const Icon = icons[index % icons.length] ?? Sparkles;
            return (
              <RevealItem as="li" key={item.title} variant="rise">
                <div className="flex flex-col gap-2.5">
                  <span className="grid size-11 place-items-center rounded-full bg-cream shadow-(--shadow-soft) transition-transform duration-300 hover:scale-110">
                    <Icon className="size-5 text-accent" aria-hidden="true" />
                  </span>
                  <h3 className="font-display text-lg text-cocoa">{item.title}</h3>
                  <p className="text-sm leading-relaxed text-ink-muted">{item.description}</p>
                </div>
              </RevealItem>
            );
          })}
        </RevealGroup>
      </div>
    </section>
  );
}
