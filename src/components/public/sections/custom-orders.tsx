import { Check } from "lucide-react";

import { Reveal, RevealGroup, RevealItem } from "@/components/public/motion-primitives";
import { ButtonLink } from "@/components/ui/button";
import type { CustomOrdersContent } from "@/types/domain";

export function CustomOrders({ content }: { content: CustomOrdersContent }) {
  return (
    <section id="custom-orders" className="section-y" aria-labelledby="custom-orders-heading">
      <div className="container-page">
        <Reveal variant="rise" className="grid gap-8 rounded-(--radius-card) border border-line bg-gradient-to-br from-blush/45 via-cream to-surface-warm p-7 md:p-12 lg:grid-cols-2 lg:items-center lg:gap-14">
          <div className="flex flex-col gap-4">
            <span className="font-script text-xl font-semibold text-accent">
              Custom orders
            </span>
            <h2 id="custom-orders-heading" className="text-3xl sm:text-4xl">
              {content.heading}
            </h2>
            <p className="max-w-lg text-base leading-relaxed text-ink-muted">
              {content.description}
            </p>
            <div className="mt-2">
              <ButtonLink href="/custom-order" size="lg">
                {content.ctaLabel}
              </ButtonLink>
            </div>
          </div>

          <RevealGroup as="ul" className="flex flex-col gap-3" delayChildren={0.1}>
            {content.bullets.map((bullet) => (
              <RevealItem as="li" key={bullet} variant="left" className="flex items-start gap-3">
                <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-accent/12">
                  <Check className="size-3 text-accent" aria-hidden="true" />
                </span>
                <span className="text-sm leading-relaxed text-cocoa">{bullet}</span>
              </RevealItem>
            ))}
          </RevealGroup>
        </Reveal>
      </div>
    </section>
  );
}
