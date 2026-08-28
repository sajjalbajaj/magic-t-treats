import { Gift, MapPin, ShoppingBag, Truck } from "lucide-react";

import { Reveal, RevealGroup, RevealItem } from "@/components/public/motion-primitives";
import { SectionHeading } from "@/components/ui/primitives";
import type { DeliveryContent } from "@/types/domain";

const icons = [MapPin, ShoppingBag, Gift];

export function DeliveryPickup({
  content,
  serviceAreas,
}: {
  content: DeliveryContent;
  serviceAreas: string[];
}) {
  return (
    <section className="section-y bg-surface-warm" aria-label={content.heading}>
      <div className="container-page flex flex-col gap-9">
        <Reveal variant="up">
          <SectionHeading
            eyebrow="Getting it to you"
            eyebrowIcon={Truck}
            heading={content.heading}
            description={content.description}
            animate
          />
        </Reveal>

        <RevealGroup as="ul" className="grid gap-5 md:grid-cols-3">
          {content.cards.map((card, index) => {
            const Icon = icons[index % icons.length] ?? MapPin;
            return (
              <RevealItem as="li" key={card.title}>
                <div className="flex h-full flex-col gap-3 rounded-(--radius-card) border border-line bg-surface p-6 transition-all duration-300 hover:-translate-y-1 hover:border-accent/25 hover:shadow-(--shadow-lift)">
                  <span className="grid size-11 place-items-center rounded-full bg-accent-soft">
                    <Icon className="size-5 text-accent" aria-hidden="true" />
                  </span>
                  <h3 className="font-display text-xl text-cocoa">{card.title}</h3>
                  <p className="text-sm leading-relaxed text-ink-muted">{card.description}</p>
                </div>
              </RevealItem>
            );
          })}
        </RevealGroup>

        {serviceAreas.length > 0 ? (
          <p className="text-center text-sm text-ink-muted">
            Currently delivering to{" "}
            <span className="font-semibold text-cocoa">{serviceAreas.join(", ")}</span>.
          </p>
        ) : null}
      </div>
    </section>
  );
}
