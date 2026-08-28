import { Camera } from "lucide-react";

import { Reveal, RevealGroup, RevealItem } from "@/components/public/motion-primitives";
import { InstagramIcon } from "@/components/ui/brand-icons";
import { ButtonLink } from "@/components/ui/button";
import { MediaFrame } from "@/components/ui/media-frame";
import { SectionHeading } from "@/components/ui/primitives";
import type { Post, SectionIntro } from "@/types/domain";

/**
 * Instagram-style grid, fed by posts the baker manages in the dashboard.
 *
 * Deliberately not wired to the Instagram Graph API: tokens expire, the API
 * changes, and a rate limit or a revoked permission would take a whole section
 * of the homepage down with it. Cards link out to the real posts instead.
 */
export function InstagramGallery({
  content,
  posts,
  instagramUrl,
  instagramUsername,
}: {
  content: SectionIntro;
  posts: Post[];
  instagramUrl: string;
  instagramUsername: string;
}) {
  // A video without a cover image has nothing to show in a still grid, so it
  // is skipped rather than rendered as a broken tile.
  const visible = posts
    .filter((post) => (post.type === "video" ? post.thumbnail_url : post.media_url ?? post.thumbnail_url))
    .slice(0, 8);
  if (visible.length === 0) return null;

  return (
    <section className="section-y" aria-label={content.heading}>
      <div className="container-page flex flex-col gap-9">
        <div className="flex flex-col items-center gap-5 text-center">
          <Reveal variant="up">
            <SectionHeading
              eyebrow={instagramUsername ? `@${instagramUsername}` : "Instagram"}
              eyebrowIcon={Camera}
              heading={content.heading}
              description={content.description}
              animate
            />
          </Reveal>
          {instagramUrl ? (
            <ButtonLink href={instagramUrl} external variant="secondary">
              <InstagramIcon className="size-4" aria-hidden="true" />
              Follow along
            </ButtonLink>
          ) : null}
        </div>

        <RevealGroup as="ul" className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4" stagger={0.05}>
          {visible.map((post) => {
            const image =
              post.type === "video" ? post.thumbnail_url : (post.media_url ?? post.thumbnail_url);
            const label = post.title ?? post.caption ?? "Magic T-treats post";

            const tile = (
              <div className="group relative aspect-square overflow-hidden rounded-(--radius-card)">
                <MediaFrame
                  src={image}
                  alt={label}
                  rounded={false}
                  className="size-full [&_img]:group-hover:scale-105"
                  sizes="(min-width: 1024px) 24vw, 45vw"
                />
                {post.instagram_url ? (
                  <span className="absolute inset-0 grid place-items-center bg-ink/0 opacity-0 transition-all duration-300 group-hover:bg-ink/35 group-hover:opacity-100">
                    <InstagramIcon className="size-6 text-cream" aria-hidden="true" />
                  </span>
                ) : null}
              </div>
            );

            return (
              <RevealItem as="li" key={post.id} variant="scale">
                {post.instagram_url ? (
                  <a
                    href={post.instagram_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`View ${label} on Instagram`}
                  >
                    {tile}
                  </a>
                ) : (
                  tile
                )}
              </RevealItem>
            );
          })}
        </RevealGroup>
      </div>
    </section>
  );
}
