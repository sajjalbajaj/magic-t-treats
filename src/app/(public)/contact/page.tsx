import type { Metadata } from "next";
import { Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { InstagramIcon } from "@/components/ui/brand-icons";

import { ButtonLink } from "@/components/ui/button";
import { EnquireButton } from "@/components/public/enquire-button";
import { SectionHeading } from "@/components/ui/primitives";
import { getAllContent, getAllSettings, getSocialLinks } from "@/lib/data/content";

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getAllSettings();
  return {
    title: "Contact",
    description: `Get in touch with ${settings.general.bakeryName} for orders, custom treats and corporate gifting across ${settings.general.serviceArea}.`,
    alternates: { canonical: "/contact" },
  };
}

export default async function ContactPage() {
  const [settings, content, links] = await Promise.all([
    getAllSettings(),
    getAllContent(),
    getSocialLinks(),
  ]);

  const { general, fulfilment } = settings;

  return (
    <div className="container-page section-y flex flex-col gap-10">
      <SectionHeading
        align="left"
        eyebrow="Say hello"
        heading="Get in touch"
        description="The fastest way to reach us is Instagram. That is where orders are confirmed."
        level={1}
      />

      <div className="grid gap-5 md:grid-cols-2">
        <div className="flex flex-col gap-4 rounded-(--radius-card) border border-line bg-surface p-6">
          <h2 className="font-display text-2xl text-cocoa">Message us</h2>
          <p className="text-sm leading-relaxed text-ink-muted">
            Send an enquiry through the site and we will prepare the message for you, or start a
            chat directly.
          </p>
          <div className="mt-1 flex flex-col gap-2 sm:flex-row">
            <EnquireButton ctaLocation="contact_page">Send an enquiry</EnquireButton>
            {links.instagramUrl ? (
              <ButtonLink href={links.instagramUrl} external variant="secondary">
                <InstagramIcon className="size-4" aria-hidden="true" />
                Instagram
              </ButtonLink>
            ) : null}
            {links.whatsappUrl ? (
              <ButtonLink href={links.whatsappUrl} external variant="secondary">
                <MessageCircle className="size-4" aria-hidden="true" />
                WhatsApp
              </ButtonLink>
            ) : null}
          </div>
        </div>

        <div className="flex flex-col gap-4 rounded-(--radius-card) border border-line bg-surface p-6">
          <h2 className="font-display text-2xl text-cocoa">Details</h2>
          <ul className="flex flex-col gap-3 text-sm text-ink-muted">
            {general.serviceArea ? (
              <li className="flex items-start gap-2.5">
                <MapPin className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden="true" />
                {general.serviceArea}
              </li>
            ) : null}
            {general.phone ? (
              <li className="flex items-start gap-2.5">
                <Phone className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden="true" />
                <a
                  href={`tel:${general.phone.replace(/\s/g, "")}`}
                  className="transition-colors duration-200 hover:text-cocoa"
                >
                  {general.phone}
                </a>
              </li>
            ) : null}
            {general.email ? (
              <li className="flex items-start gap-2.5">
                <Mail className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden="true" />
                <a
                  href={`mailto:${general.email}`}
                  className="transition-colors duration-200 hover:text-cocoa"
                >
                  {general.email}
                </a>
              </li>
            ) : null}
          </ul>

          <div className="mt-1 flex flex-col gap-2 border-t border-line pt-4 text-sm text-ink-muted">
            <p>{fulfilment.deliveryText}</p>
            <p>{fulfilment.pickupText}</p>
          </div>
        </div>
      </div>

      <p className="text-sm text-ink-muted">{content["footer.content"].note}</p>
    </div>
  );
}
