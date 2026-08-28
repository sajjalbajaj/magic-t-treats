/**
 * Central, non-database configuration.
 *
 * Anything here is either structural (navigation, routes) or a build-time
 * environment concern. Business copy lives in the `site_content` table and
 * business settings in `site_settings` — both editable from the dashboard.
 */

export const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
).replace(/\/$/, "");

export const brandConfig = {
  name: "Magic T-treats",
  shortName: "Magic T-treats",
  locality: "Chandigarh",
  region: "Chandigarh",
  country: "IN",
  serviceAreas: ["Chandigarh", "Mohali", "Panchkula", "Zirakpur"],
} as const;

/**
 * Enquiry destinations. The enquiry flow is written against this object rather
 * than against Instagram directly, so adding WhatsApp later is a config change
 * plus a button, not a rewrite of the enquiry pipeline.
 */
export const socialConfig = {
  instagramUsername: process.env.NEXT_PUBLIC_INSTAGRAM_USERNAME ?? "",
  instagramProfileUrl:
    process.env.NEXT_PUBLIC_INSTAGRAM_URL || "https://www.instagram.com/",
  whatsappNumber: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "",
} as const;

export type EnquiryChannel = "instagram" | "whatsapp";

export const gaMeasurementId = process.env.NEXT_PUBLIC_GA_ID ?? "";

export const publicNavItems = [
  { label: "Home", href: "/" },
  { label: "Treats", href: "/#treats" },
  { label: "Festive", href: "/#festive" },
  { label: "Custom Orders", href: "/#custom-orders" },
  { label: "About", href: "/about" },
  { label: "Gallery", href: "/gallery" },
] as const;

export const adminNavItems = [
  { label: "Dashboard", href: "/admin", icon: "LayoutDashboard" },
  { label: "Enquiries", href: "/admin/enquiries", icon: "MessageSquare" },
  { label: "Orders", href: "/admin/orders", icon: "ClipboardList" },
  { label: "Products", href: "/admin/products", icon: "Cookie" },
  { label: "Categories", href: "/admin/categories", icon: "LayoutGrid" },
  { label: "Available Today", href: "/admin/available-today", icon: "Sun" },
  { label: "Posts & Reels", href: "/admin/posts", icon: "Clapperboard" },
  { label: "Festive Collections", href: "/admin/collections", icon: "Gift" },
  { label: "Testimonials", href: "/admin/testimonials", icon: "Quote" },
  { label: "Website Content", href: "/admin/content", icon: "FileText" },
  { label: "Media Library", href: "/admin/media", icon: "Images" },
  { label: "Analytics", href: "/admin/analytics", icon: "BarChart3" },
  { label: "Settings", href: "/admin/settings", icon: "Settings" },
] as const;

/**
 * Upload constraints. The database bucket enforces a hard ceiling; these are
 * the friendlier, type-aware limits applied before an upload starts. They are
 * overridden at runtime by the `uploads` row in site_settings.
 */
export const uploadDefaults = {
  maxImageBytes: 10 * 1024 * 1024,
  maxVideoBytes: 100 * 1024 * 1024,
  imageMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/avif"],
  videoMimeTypes: ["video/mp4", "video/webm", "video/quicktime"],
  imageExtensions: ["jpg", "jpeg", "png", "webp", "avif"],
  videoExtensions: ["mp4", "webm", "mov"],
} as const;

export const mediaBucket = "media";

export const mediaFolders = [
  "products",
  "posts",
  "festive",
  "about",
  "testimonials",
  "branding",
] as const;

/** Cache tags used with revalidateTag() when admin changes published data. */
export const cacheTags = {
  catalog: "catalog",
  content: "content",
  posts: "posts",
  collections: "collections",
  testimonials: "testimonials",
  settings: "settings",
} as const;

export const enquirySources = {
  productModal: "website",
  customOrder: "custom_order",
} as const;
