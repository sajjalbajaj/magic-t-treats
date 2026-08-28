import type { Metadata } from "next";

import { SectionHeading } from "@/components/ui/primitives";
import { GalleryExplorer } from "@/components/public/gallery-explorer";
import { buildGalleryItems } from "@/lib/gallery/items";
import { getCategories, getPosts, getProducts } from "@/lib/data/public";
import { getSettings } from "@/lib/data/content";
import { breadcrumbSchema, jsonLdScript } from "@/lib/seo/structured-data";

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const general = await getSettings("general");
  return {
    title: "Gallery",
    description: `Photos and videos of cookies, brownies, handmade chocolates and gift boxes baked by ${general.bakeryName} in ${general.serviceArea}.`,
    alternates: { canonical: "/gallery" },
  };
}

export default async function GalleryPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const [{ category }, products, posts, categories] = await Promise.all([
    searchParams,
    getProducts(),
    getPosts(),
    getCategories(),
  ]);

  const items = buildGalleryItems(products, posts);
  const initialFilter =
    category && categories.some((entry) => entry.slug === category) ? category : "all";

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript(
            breadcrumbSchema([
              { name: "Home", path: "/" },
              { name: "Gallery", path: "/gallery" },
            ]),
          ),
        }}
      />

      <div className="container-page section-y flex flex-col gap-10">
        <SectionHeading
          align="left"
          eyebrow="Gallery"
          heading="Every bake, up close"
          description="Photographs and short films from the kitchen. Tap any image to see it larger."
          level={1}
        />

        <GalleryExplorer
          items={items}
          categories={categories}
          products={products}
          initialFilter={initialFilter}
        />
      </div>
    </>
  );
}
