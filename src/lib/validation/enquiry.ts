import { z } from "zod";

/**
 * Public-facing input validation.
 *
 * Everything a browser sends is untrusted, so these schemas run server-side in
 * the route handler regardless of what the client already checked. Strings are
 * trimmed and length-capped: an unbounded `text` column plus an open endpoint
 * is a storage-exhaustion vector.
 */

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Please keep this under ${max} characters.`)
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined));

/** Deliberately permissive: Indian mobiles, landlines, +91 or not, spaces ok. */
const phoneSchema = z
  .string()
  .trim()
  .regex(/^[+]?[\d\s()-]{7,20}$/, "Please enter a valid phone number.")
  .optional()
  .or(z.literal("").transform(() => undefined));

const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Please choose a valid date.")
  .refine((value) => !Number.isNaN(Date.parse(value)), "Please choose a valid date.")
  .optional()
  .or(z.literal("").transform(() => undefined));

export const fulfilmentSchema = z.enum(["delivery", "pickup"]);

/** Campaign attribution, captured from the URL and carried through the session. */
export const utmSchema = z.object({
  utm_source: optionalText(120),
  utm_medium: optionalText(120),
  utm_campaign: optionalText(120),
  utm_content: optionalText(120),
  utm_term: optionalText(120),
  referrer: optionalText(500),
  device_type: z.enum(["mobile", "tablet", "desktop"]).optional(),
});

export const productEnquirySchema = z.object({
  kind: z.literal("product"),
  productId: z.uuid().optional(),
  productSku: optionalText(40),
  productName: optionalText(160),
  customerName: optionalText(120),
  phone: phoneSchema,
  email: z.email("Please enter a valid email address.").optional().or(
    z.literal("").transform(() => undefined),
  ),
  quantity: optionalText(80),
  requiredDate: isoDateSchema,
  fulfilmentType: fulfilmentSchema.optional(),
  customization: optionalText(600),
  message: optionalText(1500),
  ...utmSchema.shape,
});

export const customOrderSchema = z.object({
  kind: z.literal("custom"),
  customerName: z
    .string()
    .trim()
    .min(2, "Please tell us your name.")
    .max(120, "Please keep your name under 120 characters."),
  // One contact route is required, but the customer chooses which.
  phone: phoneSchema,
  email: z.email("Please enter a valid email address.").optional().or(
    z.literal("").transform(() => undefined),
  ),
  requiredDate: isoDateSchema,
  occasion: optionalText(160),
  quantity: optionalText(80),
  productsInterested: optionalText(400),
  sugarFreeRequired: z.boolean().optional(),
  packaging: optionalText(400),
  budget: optionalText(80),
  fulfilmentType: fulfilmentSchema.optional(),
  message: optionalText(1500),
  ...utmSchema.shape,
});

export const enquiryPayloadSchema = z.discriminatedUnion("kind", [
  productEnquirySchema,
  customOrderSchema,
]);

export type ProductEnquiryInput = z.infer<typeof productEnquirySchema>;
export type CustomOrderInput = z.infer<typeof customOrderSchema>;
export type EnquiryPayload = z.infer<typeof enquiryPayloadSchema>;

/** Analytics intake. Event names are allow-listed so the table cannot be filled with junk. */
export const analyticsEventSchema = z.object({
  event_type: z.enum([
    "product_view",
    "product_enquiry_click",
    "enquiry_submitted",
    "instagram_opened",
    "whatsapp_opened",
    "product_shared",
    "category_view",
    "custom_order_started",
    "custom_order_submitted",
  ]),
  product_id: z.uuid().optional(),
  product_sku: optionalText(40),
  source: optionalText(60),
  cta_location: optionalText(60),
  ...utmSchema.shape,
});

export type AnalyticsEventInput = z.infer<typeof analyticsEventSchema>;

/**
 * Custom orders must reach the customer somehow. Enforced as a refinement so
 * the error attaches to the phone field rather than the whole form.
 */
export const customOrderSchemaWithContact = customOrderSchema.refine(
  (value) => Boolean(value.phone || value.email),
  { message: "Please add a phone number or an email so we can reply.", path: ["phone"] },
);
