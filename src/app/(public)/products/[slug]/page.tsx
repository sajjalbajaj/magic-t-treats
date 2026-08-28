import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { ProductDetailPanel } from "@/components/product/product-detail-panel";
import { ProductRail } from "@/components/public/sections/product-rail";
import { getProductBySlug, getProducts } from "@/lib/data/public";
import { getProductPoster, getProductSummary } from "@/lib/products/display";
import { breadcrumbSchema, jsonLdScript, productSchema } from "@/lib/seo/structured-data";

/**
 * Shareable product page.
 *
 * The primary browsing experience is the modal, but every product still needs
 * a real URL — for search engines, for the Share button, and for links pasted
 * into a chat. Pre-rendered per product at build time.
 */
export const revalidate = 300;

export async function generateStaticParams() {
  const products = await getProducts();
  return products.map((product) => ({ slug: product.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
    return { title: "Treat not found" };
  }

  const poster = getProductPoster(product);
  const description = getProductSummary(product);

  return {
    title: product.name,
    description,
    alternates: { canonical: `/products/${product.slug}` },
    openGraph: {
      type: "website",
      title: product.name,
      description,
      url: `/products/${product.slug}`,
      images: poster?.url ? [{ url: poster.url, alt: poster.alt }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: product.name,
      description,
      images: poster?.url ? [poster.url] : undefined,
    },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) notFound();

  const all = await getProducts();
  const related = all
    .filter(
      (candidate) =>
        candidate.id !== product.id && candidate.category_id === product.category_id,
    )
    .slice(0, 4);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript([
            productSchema(product),
            breadcrumbSchema([
              { name: "Home", path: "/" },
              { name: "Gallery", path: "/gallery" },
              { name: product.name, path: `/products/${product.slug}` },
            ]),
          ]),
        }}
      />

      <div className="container-page pt-8">
        <nav aria-label="Breadcrumb">
          <ol className="flex flex-wrap items-center gap-1.5 text-xs text-ink-muted">
            <li>
              <Link href="/" className="transition-colors duration-200 hover:text-cocoa">
                Home
              </Link>
            </li>
            <ChevronRight className="size-3" aria-hidden="true" />
            <li>
              <Link href="/gallery" className="transition-colors duration-200 hover:text-cocoa">
                Treats
              </Link>
            </li>
            <ChevronRight className="size-3" aria-hidden="true" />
            <li aria-current="page" className="font-medium text-cocoa">
              {product.name}
            </li>
          </ol>
        </nav>
      </div>

      <div className="container-page py-10">
        <h1 className="mb-6 text-3xl sm:text-4xl">{product.name}</h1>
        <ProductDetailPanel product={product} />
      </div>

      <ProductRail
        heading="You might also like"
        products={related}
        ctaLocation="product_page_related"
        tone="warm"
      />
    </>
  );
}
