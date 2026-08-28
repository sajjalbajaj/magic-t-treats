import { brandConfig, siteUrl } from "@/config/site";
import { formatProductPrice, getProductPoster, getProductSummary } from "@/lib/products/display";
import type { GeneralSettings, Product, SeoSettings, Testimonial } from "@/types/domain";

/**
 * JSON-LD builders.
 *
 * Everything is generated from real database values. Structured data that
 * claims ratings or prices the site does not actually show is a manual-action
 * risk, so `aggregateRating` is emitted only when published testimonials with
 * real ratings exist, and `offers` only when a price is set.
 */

type JsonLd = Record<string, unknown>;

/**
 * Structured data consumers require absolute URLs, but the dashboard stores
 * bundled assets as site-relative paths ("/brand/logo.png"). Resolve them here
 * rather than forcing every stored value to be absolute.
 */
function absolute(url: string | null | undefined): string | null {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  return `${siteUrl}${url.startsWith("/") ? "" : "/"}${url}`;
}

export function organizationSchema(general: GeneralSettings, instagramUrl: string): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: general.bakeryName,
    url: siteUrl,
    description: general.tagline,
    ...(absolute(general.logoUrl) ? { logo: absolute(general.logoUrl) } : {}),
    ...(instagramUrl ? { sameAs: [instagramUrl] } : {}),
  };
}

export function localBusinessSchema(
  general: GeneralSettings,
  seo: SeoSettings,
  instagramUrl: string,
  testimonials: Testimonial[],
): JsonLd {
  const rated = testimonials.filter((item) => typeof item.rating === "number");
  const average =
    rated.length > 0
      ? rated.reduce((sum, item) => sum + (item.rating ?? 0), 0) / rated.length
      : null;

  return {
    "@context": "https://schema.org",
    "@type": "Bakery",
    "@id": `${siteUrl}/#bakery`,
    name: general.bakeryName,
    url: siteUrl,
    description: seo.defaultDescription,
    ...(absolute(general.logoUrl) ? { image: absolute(general.logoUrl) } : {}),
    ...(general.phone ? { telephone: general.phone } : {}),
    ...(general.email ? { email: general.email } : {}),
    priceRange: "₹₹",
    address: {
      "@type": "PostalAddress",
      addressLocality: brandConfig.locality,
      addressRegion: brandConfig.region,
      addressCountry: brandConfig.country,
    },
    areaServed: brandConfig.serviceAreas.map((area) => ({ "@type": "City", name: area })),
    ...(instagramUrl ? { sameAs: [instagramUrl] } : {}),
    ...(average !== null
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: average.toFixed(1),
            reviewCount: rated.length,
          },
        }
      : {}),
  };
}

export function productSchema(product: Product): JsonLd {
  const poster = getProductPoster(product);

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    sku: product.sku,
    description: getProductSummary(product),
    url: `${siteUrl}/products/${product.slug}`,
    ...(absolute(poster?.url) ? { image: [absolute(poster?.url)] } : {}),
    ...(product.category?.name ? { category: product.category.name } : {}),
    brand: { "@type": "Brand", name: brandConfig.name },
    ...(product.starting_price
      ? {
          offers: {
            "@type": "Offer",
            price: product.starting_price,
            priceCurrency: "INR",
            // Enquiry-led, so the price is a starting point, not a checkout price.
            availability: product.is_active
              ? "https://schema.org/InStock"
              : "https://schema.org/OutOfStock",
            url: `${siteUrl}/products/${product.slug}`,
            description: formatProductPrice(product),
          },
        }
      : {}),
  };
}

export function breadcrumbSchema(items: { name: string; path: string }[]): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: `${siteUrl}${item.path}`,
    })),
  };
}

/**
 * Serialises JSON-LD for injection.
 *
 * `<` is escaped so a stray "</script>" inside user-entered content (a product
 * description, say) cannot break out of the script tag.
 */
export function jsonLdScript(schema: JsonLd | JsonLd[]): string {
  return JSON.stringify(schema).replace(/</g, "\\u003c");
}
