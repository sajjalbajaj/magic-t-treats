/**
 * Gallery feed construction.
 *
 * Lives outside the client component on purpose. It used to be exported from
 * `gallery-explorer.tsx`, which carries "use client" — so the server component
 * that called it was invoking a client function from the server. That throws,
 * and the whole gallery page rendered as an error boundary with no images.
 *
 * A pure helper shared across the boundary belongs in its own module.
 */

import type { Post, Product } from "@/types/domain";
import { altText } from "@/lib/seo/alt-text";

export type GalleryItem = {
  id: string;
  type: "image" | "video";
  url: string;
  thumbnail: string | null;
  alt: string;
  categorySlug: string | null;
  caption: string | null;
  productSlug: string | null;
};

/**
 * Flattens products and posts into one gallery feed.
 *
 * Done on the server side of the boundary (this runs in the page) so the
 * client component receives a single flat list rather than having to
 * understand two different content shapes.
 */
export function buildGalleryItems(products: Product[], posts: Post[]): GalleryItem[] {
  const fromProducts = products.flatMap((product) =>
    product.media
      .filter((media) => media.media_url ?? media.thumbnail_url)
      .map<GalleryItem>((media) => ({
        id: media.id,
        type: media.type,
        url: media.media_url ?? media.thumbnail_url ?? "",
        // A video with no poster has NO still. Falling back to the .mp4 here
        // put the video file into an <img src>, which fails to load.
        thumbnail: media.type === "video" ? media.thumbnail_url : (media.media_url ?? media.thumbnail_url),
        alt: altText(media.alt_text ?? product.name),
        categorySlug: product.category?.slug ?? null,
        caption: product.name,
        productSlug: product.slug,
      })),
  );

  const fromPosts = posts
    .filter((post) => post.media_url ?? post.thumbnail_url)
    .map<GalleryItem>((post) => ({
      id: post.id,
      type: post.type,
      url: post.media_url ?? post.thumbnail_url ?? "",
      thumbnail: post.type === "video" ? post.thumbnail_url : (post.media_url ?? post.thumbnail_url),
      // Caption stays as written; only the alt carries the brand suffix.
      alt: altText(post.title ?? post.caption),
      categorySlug: null,
      caption: post.title ?? post.caption,
      productSlug: null,
    }));

  return [...fromProducts, ...fromPosts];
}
