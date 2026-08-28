/**
 * Application-facing domain types.
 *
 * These are the shapes components consume. They are composed from the raw
 * database rows so that a component never has to know about join tables or
 * nullable columns that the data layer has already resolved.
 */

import type {
  CategoryRow,
  CollectionRow,
  EnquiryRow,
  MediaType,
  OrderItemRow,
  OrderRow,
  PostRow,
  ProductMediaRow,
  ProductRow,
  TestimonialRow,
} from "@/types/database";

export type Category = CategoryRow;
export type Post = PostRow;
export type Testimonial = TestimonialRow;
export type Enquiry = EnquiryRow;
export type Order = OrderRow;
export type OrderItem = OrderItemRow;
export type ProductMedia = ProductMediaRow;

/** A product with its media and category name resolved. */
export type Product = ProductRow & {
  category: Pick<CategoryRow, "id" | "name" | "slug"> | null;
  media: ProductMedia[];
};

export type Collection = CollectionRow & {
  products: Product[];
};

export type OrderWithItems = Order & {
  items: OrderItem[];
};

/** Display badge derived from a product's flags. */
export type ProductTag = {
  label: string;
  tone: "cocoa" | "sage" | "accent" | "blush";
};

/** The resolved primary visual for a product, or null when none is uploaded. */
export type ProductPoster = {
  url: string;
  alt: string;
  type: MediaType;
} | null;

// --- Editable website copy -------------------------------------------------
// One type per site_content key. The admin content forms and the public
// components both read these, which is what keeps them in agreement.

export type HeroContent = {
  heading: string;
  description: string;
  primaryButton: string;
  secondaryButton: string;
  badges: string[];
  mediaType: MediaType;
  mediaUrl: string | null;
};

export type TitledItem = { title: string; description: string };

export type TrustContent = { heading: string; items: TitledItem[] };

export type SectionIntro = { heading: string; description: string };

export type AvailableTodayContent = SectionIntro & { note: string };

export type CustomOrdersContent = {
  heading: string;
  description: string;
  bullets: string[];
  ctaLabel: string;
};

export type DeliveryContent = SectionIntro & { cards: TitledItem[] };

export type FeaturedContent = {
  eyebrow: string;
  heading: string;
  description: string;
  points: string[];
  ctaLabel: string;
  note: string;
  imageUrl: string | null;
  imageAlt: string;
};

export type FinalCtaContent = {
  heading: string;
  description: string;
  primaryButton: string;
};

export type AboutStoryContent = {
  heading: string;
  bakerName: string;
  /**
   * The story, one entry per paragraph.
   *
   * A list rather than two fixed fields: the full story runs long, the
   * homepage only shows the opening of it, and the baker needs to be able to
   * add a paragraph from the dashboard without a developer changing a type.
   */
  paragraphs: string[];
  signature: string;
  photoUrl: string | null;
  /** Editable alt text — the baker should describe her own portrait. */
  photoAlt: string;
};

export type AboutPhilosophyContent = { heading: string; values: TitledItem[] };

export type FooterContent = { tagline: string; note: string };

/** Every editable content block, keyed exactly as stored in site_content. */
export type SiteContentMap = {
  "home.hero": HeroContent;
  "home.trust": TrustContent;
  "home.available_today": AvailableTodayContent;
  "home.featured": FeaturedContent;
  "home.bestsellers": SectionIntro;
  "home.custom_orders": CustomOrdersContent;
  "home.testimonials": SectionIntro;
  "home.instagram": SectionIntro;
  "home.delivery": DeliveryContent;
  "home.final_cta": FinalCtaContent;
  "about.story": AboutStoryContent;
  "about.philosophy": AboutPhilosophyContent;
  "footer.content": FooterContent;
};

export type SiteContentKey = keyof SiteContentMap;

// --- Editable settings -----------------------------------------------------
export type GeneralSettings = {
  bakeryName: string;
  tagline: string;
  phone: string;
  email: string;
  serviceArea: string;
  logoUrl: string | null;
  faviconUrl: string | null;
};

export type SocialSettings = {
  instagramUrl: string;
  instagramUsername: string;
  whatsappNumber: string;
};

export type FulfilmentSettings = {
  deliveryText: string;
  pickupText: string;
  serviceAreas: string[];
};

export type SeoSettings = {
  defaultTitle: string;
  defaultDescription: string;
  ogImageUrl: string | null;
  keywords: string[];
};

export type UploadSettings = {
  maxImageMb: number;
  maxVideoMb: number;
};

export type SiteSettingsMap = {
  general: GeneralSettings;
  social: SocialSettings;
  fulfilment: FulfilmentSettings;
  seo: SeoSettings;
  uploads: UploadSettings;
};

export type SiteSettingKey = keyof SiteSettingsMap;

// --- Analytics -------------------------------------------------------------
export type DashboardKpis = {
  new_enquiries: number;
  active_orders: number;
  orders_due_today: number;
  monthly_orders: number;
  monthly_revenue: number;
  conversion_rate: number;
  active_products: number;
  available_today: number;
  published_posts: number;
};

export type MostEnquiredRow = {
  product_name: string;
  product_sku: string | null;
  enquiry_count: number;
};

export type LeadSourceRow = {
  source: string;
  lead_count: number;
  share: number;
};

export type EnquiryFunnel = {
  enquiry_clicks: number;
  submitted: number;
  contacted: number;
  converted: number;
  delivered: number;
};

export type RevenueSummary = {
  today: number;
  this_week: number;
  this_month: number;
  outstanding: number;
  custom: number | null;
};

/** Consistent envelope returned by every route handler and server action. */
export type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string } };
