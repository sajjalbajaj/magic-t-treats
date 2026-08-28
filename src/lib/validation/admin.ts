import { z } from "zod";

import { mediaFolders } from "@/config/site";

/**
 * Admin input validation.
 *
 * Server actions accept FormData, so most fields arrive as strings. These
 * schemas coerce and constrain them before anything reaches the database —
 * the CHECK constraints are the last line of defence, not the first.
 */

const trimmed = (max: number) => z.string().trim().max(max);
const optional = (max: number) =>
  trimmed(max)
    .optional()
    .transform((value) => (value && value.length > 0 ? value : null));

/** HTML number inputs submit "" when cleared; treat that as null, not 0. */
const optionalNumber = z
  .union([z.string(), z.number()])
  .optional()
  .transform((value) => {
    if (value === undefined || value === "" || value === null) return null;
    const parsed = typeof value === "number" ? value : Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  })
  .refine((value) => value === null || value >= 0, "Must be zero or more.");

const requiredNumber = z
  .union([z.string(), z.number()])
  .transform((value) => {
    const parsed = typeof value === "number" ? value : Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  })
  .refine((value) => value >= 0, "Must be zero or more.");

/** Unchecked checkboxes are simply absent from FormData. */
const checkbox = z
  .union([z.string(), z.boolean()])
  .optional()
  .transform((value) => value === true || value === "on" || value === "true");

const slugSchema = z
  .string()
  .trim()
  .min(1, "A slug is required.")
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and hyphens only.");

const optionalDate = z
  .string()
  .optional()
  .transform((value) => (value && value.length > 0 ? value : null))
  .refine(
    (value) => value === null || /^\d{4}-\d{2}-\d{2}$/.test(value),
    "Please choose a valid date.",
  );

// --- Catalogue --------------------------------------------------------------
export const categorySchema = z.object({
  id: z.uuid().optional(),
  name: trimmed(80).min(2, "Please enter a category name."),
  slug: slugSchema,
  description: optional(400),
  image_url: optional(600),
  sort_order: requiredNumber.default(0),
  is_active: checkbox,
});

export const productSchema = z.object({
  id: z.uuid().optional(),
  sku: trimmed(40)
    .min(2, "Please enter a product code.")
    .regex(/^[A-Za-z0-9-]+$/, "Use letters, numbers and hyphens only."),
  category_id: z
    .string()
    .optional()
    .transform((value) => (value && value.length > 0 ? value : null))
    .refine(
      (value) => value === null || z.uuid().safeParse(value).success,
      "Please choose a valid category.",
    ),
  name: trimmed(160).min(2, "Please enter a product name."),
  slug: slugSchema,
  short_description: optional(300),
  description: optional(4000),
  starting_price: optionalNumber,
  price_label: optional(80),
  // Submitted as a comma-separated string from the form.
  highlight_tags: z
    .string()
    .optional()
    .transform((value) =>
      (value ?? "")
        .split(",")
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0)
        .slice(0, 6),
    ),
  instagram_url: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value && value.length > 0 ? value : null))
    .refine(
      (value) => value === null || /^https:\/\/(www\.)?instagram\.com\/(p|reel|tv)\//.test(value),
      "Paste a full Instagram post or reel link.",
    ),
  is_sugar_free: checkbox,
  is_eggless: checkbox,
  is_customizable: checkbox,
  is_bestseller: checkbox,
  is_seasonal: checkbox,
  available_today: checkbox,
  is_active: checkbox,
  sort_order: requiredNumber.default(0),
});

export const productMediaSchema = z.object({
  product_id: z.uuid(),
  type: z.enum(["image", "video"]),
  storage_path: trimmed(500).min(1),
  media_url: optional(700),
  thumbnail_url: optional(700),
  alt_text: optional(300),
  is_primary: checkbox,
  sort_order: requiredNumber.default(0),
});

export const collectionSchema = z.object({
  id: z.uuid().optional(),
  name: trimmed(120).min(2, "Please enter a collection name."),
  slug: slugSchema,
  description: optional(600),
  cover_image: optional(600),
  available_from: optionalDate,
  available_until: optionalDate,
  featured: checkbox,
  active: checkbox,
  sort_order: requiredNumber.default(0),
});

// --- Content ----------------------------------------------------------------
export const postSchema = z.object({
  id: z.uuid().optional(),
  title: optional(160),
  caption: optional(1000),
  type: z.enum(["image", "video"]),
  storage_path: optional(500),
  media_url: optional(700),
  thumbnail_url: optional(700),
  instagram_url: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value && value.length > 0 ? value : null))
    .refine(
      (value) => value === null || /^https:\/\/(www\.)?instagram\.com\//.test(value),
      "Please paste a full https://instagram.com/… link.",
    ),
  show_on_homepage: checkbox,
  published: checkbox,
  sort_order: requiredNumber.default(0),
});

export const testimonialSchema = z.object({
  id: z.uuid().optional(),
  customer_name: trimmed(120).min(2, "Please enter the customer's name."),
  message: trimmed(1200).min(5, "Please enter the testimonial."),
  rating: z
    .union([z.string(), z.number()])
    .optional()
    .transform((value) => {
      if (value === undefined || value === "") return null;
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    })
    .refine(
      (value) => value === null || (value >= 1 && value <= 5),
      "Rating must be between 1 and 5.",
    ),
  source: optional(60),
  screenshot_url: optional(600),
  published: checkbox,
  sort_order: requiredNumber.default(0),
});

// --- Orders & enquiries -----------------------------------------------------
export const enquiryStatusSchema = z.object({
  id: z.uuid(),
  status: z.enum(["new", "contacted", "converted", "closed", "spam"]),
});

export const orderItemSchema = z.object({
  product_id: z
    .string()
    .optional()
    .transform((value) => (value && value.length > 0 ? value : null)),
  product_name: trimmed(160).min(1, "Please name the item."),
  product_sku: optional(40),
  quantity: requiredNumber.refine((value) => value > 0, "Quantity must be more than zero."),
  unit_price: requiredNumber,
  customization: optional(600),
});

export const orderSchema = z.object({
  id: z.uuid().optional(),
  enquiry_id: z.uuid().optional().nullable(),
  customer_name: trimmed(120).min(2, "Please enter the customer's name."),
  phone: optional(30),
  email: optional(160),
  required_date: optionalDate,
  fulfilment_type: z.enum(["delivery", "pickup"]).optional(),
  delivery_address: optional(600),
  discount: requiredNumber.default(0),
  delivery_charge: requiredNumber.default(0),
  advance_amount: requiredNumber.default(0),
  notes: optional(1500),
  items: z.array(orderItemSchema).min(1, "Add at least one item to the order."),
});

export const orderStatusSchema = z.object({
  id: z.uuid(),
  status: z.enum([
    "confirmed",
    "preparing",
    "ready",
    "out_for_delivery",
    "delivered",
    "cancelled",
  ]),
});

// --- Media ------------------------------------------------------------------
export const mediaAssetSchema = z.object({
  id: z.uuid().optional(),
  folder: z.enum(mediaFolders),
  alt_text: optional(300),
});

// --- Settings ---------------------------------------------------------------
export const generalSettingsSchema = z.object({
  bakeryName: trimmed(80).min(1, "Please enter the bakery name."),
  tagline: trimmed(160),
  phone: trimmed(30),
  email: z.union([z.email(), z.literal("")]),
  serviceArea: trimmed(200),
  logoUrl: optional(600),
  faviconUrl: optional(600),
});

export const socialSettingsSchema = z.object({
  instagramUrl: z.union([z.url("Please enter a full URL."), z.literal("")]),
  instagramUsername: trimmed(60),
  // Digits only; wa.me rejects anything else.
  whatsappNumber: z
    .string()
    .trim()
    .transform((value) => value.replace(/\D/g, ""))
    .refine(
      (value) => value.length === 0 || (value.length >= 10 && value.length <= 15),
      "Include the country code, digits only.",
    ),
});

export const fulfilmentSettingsSchema = z.object({
  deliveryText: trimmed(400),
  pickupText: trimmed(400),
  serviceAreas: z
    .string()
    .optional()
    .transform((value) =>
      (value ?? "")
        .split(",")
        .map((area) => area.trim())
        .filter((area) => area.length > 0),
    ),
});

export const seoSettingsSchema = z.object({
  defaultTitle: trimmed(120),
  defaultDescription: trimmed(320),
  ogImageUrl: optional(600),
  keywords: z
    .string()
    .optional()
    .transform((value) =>
      (value ?? "")
        .split(",")
        .map((keyword) => keyword.trim())
        .filter((keyword) => keyword.length > 0)
        .slice(0, 20),
    ),
});

export const uploadSettingsSchema = z.object({
  maxImageMb: requiredNumber.refine((v) => v >= 1 && v <= 50, "Between 1 and 50 MB."),
  maxVideoMb: requiredNumber.refine((v) => v >= 5 && v <= 500, "Between 5 and 500 MB."),
});

export const loginSchema = z.object({
  email: z.email("Please enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

export type ProductInput = z.infer<typeof productSchema>;
export type CategoryInput = z.infer<typeof categorySchema>;
export type CollectionInput = z.infer<typeof collectionSchema>;
export type PostInput = z.infer<typeof postSchema>;
export type TestimonialInput = z.infer<typeof testimonialSchema>;
export type OrderInput = z.infer<typeof orderSchema>;
export type OrderItemInput = z.infer<typeof orderItemSchema>;
