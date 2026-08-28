
import { Reveal } from "@/components/public/motion-primitives";
import { InstagramIcon } from "@/components/ui/brand-icons";
import { ButtonLink } from "@/components/ui/button";
import { EnquireButton } from "@/components/public/enquire-button";
import type { FinalCtaContent } from "@/types/domain";

export function FinalCta({
  content,
  instagramUrl,
}: {
  content: FinalCtaContent;
  instagramUrl: string;
}) {
  return (
    <section className="section-y" aria-labelledby="final-cta-heading">
      <div className="container-page">
        <Reveal variant="rise" className="flex flex-col items-center gap-5 rounded-(--radius-card) bg-cocoa px-6 py-14 text-center md:py-20">
          <h2 id="final-cta-heading" className="max-w-2xl text-3xl text-cream sm:text-4xl">
            {content.heading}
          </h2>
          <p className="max-w-lg text-base leading-relaxed text-cream/75">
            {content.description}
          </p>

          <div className="mt-2 flex flex-col gap-3 sm:flex-row">
            <EnquireButton
              size="lg"
              ctaLocation="final_cta"
              className="bg-cream text-cocoa hover:bg-blush"
            >
              {content.primaryButton}
            </EnquireButton>

            {instagramUrl ? (
              <ButtonLink
                href={instagramUrl}
                external
                size="lg"
                variant="secondary"
                className="border-cream/35 text-cream hover:bg-cream/10"
              >
                <InstagramIcon className="size-4" aria-hidden="true" />
                Message on Instagram
              </ButtonLink>
            ) : null}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
