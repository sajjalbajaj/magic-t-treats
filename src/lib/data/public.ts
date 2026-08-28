import "server-only";

import { cache } from "react";

import { starterReels } from "@/config/content-defaults";
import { safeQuery } from "@/lib/data/safe-query";
import { createPublicSupabaseClient } from "@/lib/supabase/public";
import type { Category, Collection, Post, Product, Testimonial } from "@/types/domain";
import type { CategoryRow, ProductMediaRow, ProductRow } from "@/types/database";

/**
 * Read side of the public website.
 *
 * Every function here runs through the anonymous, cookie-free client, so RLS
 * limits results to published rows and the calling page stays statically
 * renderable. Freshness comes from page-level `revalidate` plus the
 * `revalidatePath()` calls in the admin actions.
 */

const PRODUCT_SELECT = `
  id, sku, category_id, name, slug, short_description, description,
  starting_price, price_label, highlight_tags, instagram_url,
  is_sugar_free, is_eggless, is_customizable, is_bestseller, is_seasonal,
  available_today, is_active, sort_order, created_at, updated_at,
  category:categories ( id, name, slug ),
  media:product_media ( id, product_id, type, storage_path, media_url, thumbnail_url, alt_text, is_primary, sort_order, created_at )
` as const;

/** Shape PostgREST returns for the join above. */
type ProductQueryRow = ProductRow & {
  category: Pick<CategoryRow, "id" | "name" | "slug"> | null;
  media: ProductMediaRow[] | null;
};

/** Primary asset first, then explicit ordering — the card and modal rely on it. */
function normaliseProduct(row: ProductQueryRow): Product {
  const media = [...(row.media ?? [])].sort((a, b) => {
    if (a.is_primary !== b.is_primary) return a.is_primary ? -1 : 1;
    if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
    return a.created_at.localeCompare(b.created_at);
  });

  return { ...row, category: row.category ?? null, media };
}

export const getCategories = cache(async (): Promise<Category[]> => {
  return safeQuery("getCategories", [], async () => {
    const supabase = createPublicSupabaseClient();
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });
    if (error) throw error;
    return data ?? [];
  });
});

export const getProducts = cache(async (): Promise<Product[]> => {
  return safeQuery("getProducts", [], async () => {
    const supabase = createPublicSupabaseClient();
    const { data, error } = await supabase
      .from("products")
      .select(PRODUCT_SELECT)
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });
    if (error) throw error;
    return ((data ?? []) as unknown as ProductQueryRow[]).map(normaliseProduct);
  });
});

export async function getBestsellers(limit = 6): Promise<Product[]> {
  const products = await getProducts();
  return products.filter((product) => product.is_bestseller).slice(0, limit);
}

export async function getAvailableToday(): Promise<Product[]> {
  const products = await getProducts();
  return products.filter((product) => product.available_today);
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  const products = await getProducts();
  return products.find((product) => product.slug === slug) ?? null;
}

export const getCollections = cache(async (): Promise<Collection[]> => {
  return safeQuery("getCollections", [], async () => {
    const supabase = createPublicSupabaseClient();
    const { data, error } = await supabase
      .from("collections")
      .select("*, collection_products ( product_id, sort_order )")
      .eq("active", true)
      .order("sort_order", { ascending: true });
    if (error) throw error;

    // Products are already loaded and normalised; resolve ids against that set
    // rather than re-fetching the same rows through a second nested join.
    const products = await getProducts();
    const byId = new Map(products.map((product) => [product.id, product]));

    type CollectionQueryRow = Collection & {
      collection_products: { product_id: string; sort_order: number }[] | null;
    };

    return ((data ?? []) as unknown as CollectionQueryRow[]).map((row) => {
      const links = [...(row.collection_products ?? [])].sort(
        (a, b) => a.sort_order - b.sort_order,
      );
      return {
        ...row,
        products: links
          .map((link) => byId.get(link.product_id))
          .filter((product): product is Product => Boolean(product)),
      };
    });
  });
});

export async function getFeaturedCollections(): Promise<Collection[]> {
  const collections = await getCollections();
  const featured = collections.filter((collection) => collection.featured);
  return featured.length > 0 ? featured : collections;
}

export async function getCollectionBySlug(slug: string): Promise<Collection | null> {
  const collections = await getCollections();
  return collections.find((collection) => collection.slug === slug) ?? null;
}

export const getPosts = cache(async (): Promise<Post[]> => {
  return safeQuery("getPosts", [], async () => {
    const supabase = createPublicSupabaseClient();
    const { data, error } = await supabase
      .from("posts")
      .select("*")
      .eq("published", true)
      .order("sort_order", { ascending: true })
      .order("published_at", { ascending: false, nullsFirst: false });
    if (error) throw error;
    return data ?? [];
  });
});

export async function getHomepagePosts(limit = 8): Promise<Post[]> {
  const posts = await getPosts();
  return posts.filter((post) => post.show_on_homepage).slice(0, limit);
}

/**
 * Vertical video reels for the "Watch Them Being Made" section.
 *
 * Falls back to the bundled starter reels when nothing has been published, so
 * a fresh install still shows the kitchen. Published posts replace them
 * outright rather than being appended to — a half-real, half-stock row would
 * be worse than either.
 */
export async function getReels(limit = 8): Promise<Post[]> {
  const posts = await getPosts();
  const videos = posts.filter((post) => post.type === "video");

  if (videos.length > 0) return videos.slice(0, limit);

  const now = new Date().toISOString();
  return starterReels.slice(0, limit).map<Post>((reel, index) => ({
    id: reel.id,
    title: reel.title,
    caption: reel.caption,
    type: "video",
    storage_path: null,
    media_url: reel.mediaUrl,
    thumbnail_url: null,
    instagram_url: null,
    show_on_homepage: true,
    published: true,
    sort_order: index,
    published_at: now,
    created_at: now,
    updated_at: now,
  }));
}

export const getTestimonials = cache(async (): Promise<Testimonial[]> => {
  return safeQuery("getTestimonials", [], async () => {
    const supabase = createPublicSupabaseClient();
    const { data, error } = await supabase
      .from("testimonials")
      .select("*")
      .eq("published", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  });
});
