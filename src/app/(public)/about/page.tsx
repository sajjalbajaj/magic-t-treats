import { Camera, HeartHandshake } from "lucide-react";

import type { Metadata } from "next";

import { MeetTheBaker } from "@/components/public/sections/meet-the-baker";
import { FinalCta } from "@/components/public/sections/final-cta";
import { Reveal, RevealGroup, RevealItem } from "@/components/public/motion-primitives";
import { MediaFrame } from "@/components/ui/media-frame";
import { SectionHeading } from "@/components/ui/primitives";
import { getAllContent, getSettings, getSocialLinks } from "@/lib/data/content";
import { getPosts } from "@/lib/data/public";
import { breadcrumbSchema, jsonLdScript } from "@/lib/seo/structured-data";

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const general = await getSettings("general");
  return {
    title: "About",
    description: `The story behind ${general.bakeryName}, a home bakery in ${general.serviceArea} baking healthy treats, handmade chocolates and gift boxes in small batches.`,
    alternates: { canonical: "/about" },
  };
}

export default async function AboutPage() {
  const [content, links, posts] = await Promise.all([
    getAllContent(),
    getSocialLinks(),
    getPosts(),
  ]);

  const philosophy = content["about.philosophy"];
  const photos = posts.filter((post) => post.type === "image").slice(0, 6);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript(
            breadcrumbSchema([
              { name: "Home", path: "/" },
              { name: "About", path: "/about" },
            ]),
          ),
        }}
      />

      <MeetTheBaker content={content["about.story"]} showCta={false} level={1} />

      <section className="section-y bg-surface-warm" aria-label={philosophy.heading}>
        <div className="container-page flex flex-col gap-9">
          <Reveal variant="up">
            <SectionHeading
              eyebrow="Our approach"
              eyebrowIcon={HeartHandshake}
              heading={philosophy.heading}
              description="The handful of rules that decide what gets baked and what does not."
              animate
            />
          </Reveal>

          <RevealGroup as="ul" className="grid gap-5 sm:grid-cols-2">
            {philosophy.values.map((value, index) => (
              <RevealItem as="li" key={value.title}>
                <div className="flex h-full flex-col gap-2 rounded-(--radius-card) border border-line bg-surface p-6">
                  <span className="font-display text-3xl text-accent/70">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <h3 className="font-display text-xl text-cocoa">{value.title}</h3>
                  <p className="text-sm leading-relaxed text-ink-muted">{value.description}</p>
                </div>
              </RevealItem>
            ))}
          </RevealGroup>
        </div>
      </section>

      {photos.length > 0 ? (
        <section className="section-y" aria-label="From the kitchen">
          <div className="container-page flex flex-col gap-8">
            <Reveal variant="up">
              <SectionHeading
                eyebrow="Moments"
                eyebrowIcon={Camera}
                heading="From the kitchen"
                animate
              />
            </Reveal>
            <RevealGroup as="ul" className="grid grid-cols-2 gap-4 md:grid-cols-3" stagger={0.06}>
              {photos.map((photo) => (
                <RevealItem as="li" key={photo.id} variant="scale">
                  <MediaFrame
                    src={photo.thumbnail_url ?? photo.media_url}
                    alt={photo.title ?? photo.caption ?? "Magic T-treats kitchen"}
                    className="aspect-square w-full"
                    sizes="(min-width: 768px) 30vw, 45vw"
                  />
                </RevealItem>
              ))}
            </RevealGroup>
          </div>
        </section>
      ) : null}

      <FinalCta content={content["home.final_cta"]} instagramUrl={links.instagramUrl} />
    </>
  );
}
