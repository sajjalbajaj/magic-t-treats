/**
 * Enquiry message generation.
 *
 * The customer never types this message themselves — we compose it, copy it to
 * their clipboard and hand them off to Instagram or WhatsApp. It therefore has
 * to read like something a person would actually send: no empty labels, no
 * placeholder text, no leftover punctuation when a field was skipped.
 *
 * Pure and dependency-free so it can be unit tested and reused by any future
 * enquiry destination.
 */

export type EnquiryMessageInput = {
  productName?: string | null;
  productSku?: string | null;
  /** Source Instagram post, so the baker knows exactly which item is meant. */
  postUrl?: string | null;
  quantity?: string | null;
  requiredDate?: string | null;
  fulfilmentType?: "delivery" | "pickup" | null;
  customization?: string | null;
  message?: string | null;
  customerName?: string | null;
  occasion?: string | null;
  budget?: string | null;
  sugarFreeRequired?: boolean;
  packaging?: string | null;
};

function clean(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().replace(/\s+/g, " ");
  return trimmed.length > 0 ? trimmed : null;
}

/** "2026-09-12" -> "12 September". Falls back to the raw string if unparseable. */
export function formatRequiredDate(value: string | null | undefined): string | null {
  const raw = clean(value);
  if (!raw) return null;

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (!match) return raw;

  const [, year, month, day] = match;
  // Constructed in UTC and read back in UTC so the day never shifts by timezone.
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  if (Number.isNaN(date.getTime())) return raw;

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(date);
}

function fulfilmentLabel(value: EnquiryMessageInput["fulfilmentType"]): string | null {
  if (value === "delivery") return "Delivery";
  if (value === "pickup") return "Pickup";
  return null;
}

/** Product enquiry — sent from a product card or the product detail modal. */
export function buildProductEnquiryMessage(input: EnquiryMessageInput): string {
  const productName = clean(input.productName);

  const opening = productName
    ? `Hi! I'm interested in your ${productName}.`
    : "Hi! I'd like to enquire about your treats.";

  const details: [string, string | null][] = [
    ["Product Code", clean(input.productSku)],
    // Placed high: on a phone the baker often reads only the first lines, and
    // the post is the fastest way to identify the item.
    ["Post", clean(input.postUrl)],
    ["Quantity", clean(input.quantity)],
    ["Required Date", formatRequiredDate(input.requiredDate)],
    ["Preference", fulfilmentLabel(input.fulfilmentType)],
    ["Customization", clean(input.customization)],
  ];

  const lines = details
    .filter((entry): entry is [string, string] => entry[1] !== null)
    .map(([label, value]) => `${label}: ${value}`);

  const note = clean(input.message);
  const closing = "Could you please share availability and pricing?";

  return [opening, lines.join("\n"), note, closing]
    .filter((block) => block && block.length > 0)
    .join("\n\n");
}

/** Custom / bulk order enquiry — sent from the custom order form. */
export function buildCustomOrderMessage(input: EnquiryMessageInput): string {
  const name = clean(input.customerName);

  const opening = name
    ? `Hi! This is ${name}. I'd like to place a custom order.`
    : "Hi! I'd like to place a custom order.";

  const details: [string, string | null][] = [
    ["Occasion", clean(input.occasion)],
    ["Required Date", formatRequiredDate(input.requiredDate)],
    ["Quantity", clean(input.quantity)],
    ["Products Interested In", clean(input.productName)],
    ["Sugar-Free Required", input.sugarFreeRequired ? "Yes" : null],
    ["Packaging", clean(input.packaging)],
    ["Approximate Budget", clean(input.budget)],
    ["Preference", fulfilmentLabel(input.fulfilmentType)],
  ];

  const lines = details
    .filter((entry): entry is [string, string] => entry[1] !== null)
    .map(([label, value]) => `${label}: ${value}`);

  const note = clean(input.message);
  const closing = "Could you please share availability and pricing?";

  return [opening, lines.join("\n"), note, closing]
    .filter((block) => block && block.length > 0)
    .join("\n\n");
}

/**
 * Instagram's direct-message entry point.
 *
 * `ig.me/m/<handle>` opens a chat thread with the account — in the app on
 * mobile, and via instagram.com on desktop. That is a much better landing spot
 * for an enquiry than the profile grid, where the customer still has to find
 * the Message button.
 *
 * It does require the visitor to be signed in to Instagram; if they are not,
 * Instagram shows its own login and continues afterwards. That is Instagram's
 * flow, not something we can or should work around.
 */
export function buildInstagramMessageUrl(
  username: string | null | undefined,
  profileUrl?: string | null,
): string {
  const handle = (username ?? "").trim().replace(/^@+/, "");
  if (handle) return `https://ig.me/m/${handle}`;
  return profileUrl || "https://www.instagram.com/";
}

/**
 * Where to send the customer once their enquiry is saved.
 *
 * WhatsApp supports a prefilled body, so the composed message is passed
 * straight through. Instagram has no documented way to pre-fill a DM, so the
 * message goes to the clipboard instead and we open the empty chat thread.
 */
export function buildEnquiryHandoffUrl(
  channel: "instagram" | "whatsapp",
  message: string,
  links: {
    instagramUrl: string;
    /** Preferred: opens the DM thread rather than the profile. */
    instagramMessageUrl?: string;
    whatsappNumber: string;
  },
): string {
  if (channel === "whatsapp" && links.whatsappNumber) {
    return `https://wa.me/${links.whatsappNumber}?text=${encodeURIComponent(message)}`;
  }
  return links.instagramMessageUrl || links.instagramUrl || "https://www.instagram.com/";
}
