import type { Metadata } from "next";

import { CustomOrderForm } from "@/components/forms/custom-order-form";
import { SectionHeading } from "@/components/ui/primitives";
import { getAllContent, getSettings, getSocialLinks } from "@/lib/data/content";
import { breadcrumbSchema, jsonLdScript } from "@/lib/seo/structured-data";

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const general = await getSettings("general");
  return {
    title: "Custom Orders",
    description: `Custom cakes, chocolates, gift boxes and corporate hampers from ${general.bakeryName}. Tell us the occasion and we'll build around it.`,
    alternates: { canonical: "/custom-order" },
  };
}

export default async function CustomOrderPage() {
  const [content, links] = await Promise.all([getAllContent(), getSocialLinks()]);
  const custom = content["home.custom_orders"];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript(
            breadcrumbSchema([
              { name: "Home", path: "/" },
              { name: "Custom Orders", path: "/custom-order" },
            ]),
          ),
        }}
      />

      <div className="container-page section-y grid gap-10 lg:grid-cols-[0.8fr_1fr] lg:gap-16">
        <div className="flex flex-col gap-5 lg:sticky lg:top-28 lg:self-start">
          <SectionHeading
            align="left"
            eyebrow="Custom orders"
            heading={custom.heading}
            description={custom.description}
            level={1}
          />
          <ul className="flex flex-col gap-2.5">
            {custom.bullets.map((bullet) => (
              <li key={bullet} className="flex items-start gap-2.5 text-sm text-cocoa">
                <span
                  className="mt-1.5 size-1.5 shrink-0 rounded-full bg-accent"
                  aria-hidden="true"
                />
                {bullet}
              </li>
            ))}
          </ul>
          <p className="rounded-xl border border-line bg-surface-warm p-4 text-sm leading-relaxed text-ink-muted">
            Custom and bulk orders need lead time. The more notice you can give, the more we can
            do. Share the date and we will tell you honestly what is possible.
          </p>
        </div>

        <CustomOrderForm
          links={{
            instagramUrl: links.instagramUrl,
            instagramMessageUrl: links.instagramMessageUrl,
            instagramUsername: links.instagramUsername,
            whatsappNumber: links.whatsappNumber,
          }}
        />
      </div>
    </>
  );
}
