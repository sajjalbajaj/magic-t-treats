import { SectionHeading } from "@/components/ui/primitives";
import { Hero } from "@/components/public/sections/hero";
import { TrustHighlights } from "@/components/public/sections/trust-highlights";
import { FeaturedPromo } from "@/components/public/sections/featured-promo";
import { CategoryGrid } from "@/components/public/sections/category-grid";
import { ProductRail } from "@/components/public/sections/product-rail";
import { FestiveCollections } from "@/components/public/sections/festive-collections";
import { CustomOrders } from "@/components/public/sections/custom-orders";
import { MeetTheBaker } from "@/components/public/sections/meet-the-baker";
import { TestimonialsSection } from "@/components/public/sections/testimonials-section";
import { InstagramGallery } from "@/components/public/sections/instagram-gallery";
import { DeliveryPickup } from "@/components/public/sections/delivery-pickup";
import { FinalCta } from "@/components/public/sections/final-cta";
import { ProductExplorer } from "@/components/product/product-explorer";
import { getAllContent, getAllSettings, getSocialLinks } from "@/lib/data/content";
import {
  getAvailableToday,
  getBestsellers,
  getCategories,
  getFeaturedCollections,
  getHomepagePosts,
  getProducts,
  getReels,
  getTestimonials,
} from "@/lib/data/public";
import { jsonLdScript, localBusinessSchema, organizationSchema } from "@/lib/seo/structured-data";

/**
 * Statically rendered and refreshed every five minutes, with admin mutations
 * calling revalidatePath("/") for anything that should appear immediately.
 * Visitors get a cached HTML document; the baker still gets fast updates.
 */
export const revalidate = 300;

export default async function HomePage() {
  const [
    content,
    settings,
    links,
    categories,
    products,
    bestsellers,
    availableToday,
    collections,
    reels,
    posts,
    testimonials,
  ] = await Promise.all([
    getAllContent(),
    getAllSettings(),
    getSocialLinks(),
    getCategories(),
    getProducts(),
    getBestsellers(4),
    getAvailableToday(),
    getFeaturedCollections(),
    getReels(8),
    getHomepagePosts(8),
    getTestimonials(),
  ]);

  const schema = [
    organizationSchema(settings.general, links.instagramUrl),
    localBusinessSchema(settings.general, settings.seo, links.instagramUrl, testimonials),
  ];

  return (
    <>
      <script
        type="application/ld+json"
        // Serialised through jsonLdScript, which escapes "<" to prevent any
        // stray markup in database copy from closing this tag.
        dangerouslySetInnerHTML={{ __html: jsonLdScript(schema) }}
      />

      <Hero
        content={content["home.hero"]}
        instagramUrl={links.instagramUrl}
        whatsappUrl={links.whatsappUrl}
        logoUrl={settings.general.logoUrl}
        bakeryName={settings.general.bakeryName}
        reels={reels}
        testimonials={testimonials}
      />

      <TrustHighlights content={content["home.trust"]} />

      {/* Seasonal campaign, placed high — it is the thing being pushed right
          now, and it earns its place above the full menu. */}
      <FeaturedPromo content={content["home.featured"]} />

      <CategoryGrid categories={categories} />

      <ProductRail
        eyebrow="Customer favourites"
        heading={content["home.bestsellers"].heading}
        description={content["home.bestsellers"].description}
        products={bestsellers}
        ctaLocation="homepage_bestsellers"
        tone="warm"
      />

      {products.length > 0 ? (
        <section id="treats" className="section-y" aria-label="All treats">
          <div className="container-page flex flex-col gap-9">
            <SectionHeading
              eyebrow="The full menu"
              heading="Every treat we bake"
              description="Filter by category, or narrow down to sugar-free and eggless options."
            />
            <ProductExplorer products={products} categories={categories} />
          </div>
        </section>
      ) : null}

      {/* Hidden automatically on days with nothing marked available. */}
      <ProductRail
        eyebrow="Fresh from the oven"
        heading={content["home.available_today"].heading}
        description={content["home.available_today"].description}
        note={content["home.available_today"].note}
        products={availableToday}
        ctaLocation="homepage_available_today"
        tone="warm"
      />

      <FestiveCollections collections={collections} />

      <CustomOrders content={content["home.custom_orders"]} />

      <MeetTheBaker content={content["about.story"]} maxParagraphs={2} />

      <TestimonialsSection content={content["home.testimonials"]} testimonials={testimonials} />

      <InstagramGallery
        content={content["home.instagram"]}
        posts={posts}
        instagramUrl={links.instagramUrl}
        instagramUsername={links.instagramUsername}
      />

      <DeliveryPickup
        content={content["home.delivery"]}
        serviceAreas={settings.fulfilment.serviceAreas}
      />

      <FinalCta content={content["home.final_cta"]} instagramUrl={links.instagramUrl} />
    </>
  );
}
