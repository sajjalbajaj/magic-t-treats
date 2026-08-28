/**
 * Fallback copy for every editable content block and setting.
 *
 * The database is the source of truth; this is what renders when a key has not
 * been seeded yet, or when the database is briefly unreachable. Keeping the
 * fallbacks in one typed module — rather than sprinkling `?? "some string"`
 * through components — means the site never renders an empty section and the
 * baker can still see what a block is for before editing it.
 *
 * These values mirror `supabase/seed.sql`.
 */

import type { SiteContentMap, SiteSettingsMap } from "@/types/domain";

export const contentDefaults: SiteContentMap = {
  "home.hero": {
    heading: "Freshly Baked. Thoughtfully Made.",
    description:
      "Healthy homemade treats, handcrafted chocolates and thoughtful gift boxes prepared in small batches for everyday cravings, celebrations and gifting.",
    primaryButton: "Explore Treats",
    secondaryButton: "Enquire on Instagram",
    badges: [
      "Homemade",
      "Custom Orders",
      "Sugar-Free Options",
      "Tricity Delivery",
      "Pickup Available",
    ],
    mediaType: "image",
    mediaUrl: null,
  },
  "home.trust": {
    heading: "Why people keep coming back",
    items: [
      {
        title: "Baked to order",
        description: "Nothing sits on a shelf. Every batch is baked after your order is confirmed.",
      },
      {
        title: "Honest ingredients",
        description: "Jaggery, whole grains and cold-pressed ghee. No preservatives, no palm oil.",
      },
      {
        title: "Made by one pair of hands",
        description: "A home kitchen, not a factory line. Every box is packed personally.",
      },
      {
        title: "Built around your occasion",
        description: "Sugar-free, eggless or custom-shaped. Tell us what you need.",
      },
    ],
  },
  "home.available_today": {
    heading: "Baking Today",
    description: "Ready from the kitchen right now, while stocks last.",
    note: "Limited batches available",
  },
  "home.featured": {
    eyebrow: "This season",
    heading: "The Viral Scoopable Cookies",
    description:
      "Big, gooey and unapologetically indulgent, baked in a tin and meant to be scooped warm, straight from the box. Made to order in four flavours.",
    points: [
      "Classic, Rich Chocolate, Nutella or Half & Half",
      "Baked fresh the day it reaches you",
      "Gift-ready tins, perfect for festivals and celebrations",
    ],
    ctaLabel: "Order Scoopable Cookies",
    note: "Please order a day in advance",
    imageUrl: "/media/viral-scoopable-cookies-molten-chocolate.webp",
    imageAlt:
      "A spoon lifting a warm, gooey scoop from a tin of chocolate chip cookie, melted chocolate stretching away from it.",
  },
  "home.bestsellers": {
    heading: "Most Loved Treats",
    description: "The ones our customers order again and again.",
  },
  "home.custom_orders": {
    heading: "Made For Your Occasion",
    description:
      "Birthdays, weddings, corporate hampers or a box put together exactly the way you want it. Tell us the occasion and we will build around it.",
    bullets: [
      "Custom shapes, flavours and fillings",
      "Sugar-free and eggless options across the menu",
      "Personalised packaging, notes and branding",
      "Bulk orders for celebrations and corporate gifting",
    ],
    ctaLabel: "Start a Custom Order",
  },
  "home.testimonials": {
    heading: "Kind Words",
    description: "From the people who order again.",
  },
  "home.instagram": {
    heading: "From the Kitchen",
    description: "Fresh bakes, behind the scenes and what is coming next.",
  },
  "home.delivery": {
    heading: "Delivery & Pickup",
    description: "Wherever you are in Tricity, we will get your box to you.",
    cards: [
      {
        title: "Tricity Delivery",
        description:
          "Delivery available across Chandigarh, Mohali and Panchkula. Charges are confirmed when you order.",
      },
      {
        title: "Pickup",
        description: "Prefer to collect? Pickup is available by appointment once your order is ready.",
      },
      {
        title: "Bulk & Gifting",
        description:
          "Advance orders for celebrations, wedding favours and corporate gifting. Please allow lead time.",
      },
    ],
  },
  "home.final_cta": {
    heading: "Something to celebrate?",
    description:
      "Send us a message with the occasion and the date. We will take it from there.",
    primaryButton: "Enquire Now",
  },
  "about.story": {
    heading: "Meet the Heart Behind Magic T Treats",
    bakerName: "The baker behind Magic T-treats",
    paragraphs: [
      "For her, food has always been more than something made in the kitchen. It has been a way of bringing people closer, creating small moments of happiness, and turning ordinary days into memories worth keeping.",
      "Some of her fondest memories began with cooking for the people around her and watching their faces light up after the very first bite. That feeling of making someone happy through food slowly became something deeply meaningful to her.",
      "A big part of that love came from home.",
      "Growing up, she watched her mother bake cakes and prepare treats for the family. The warmth of the kitchen, the aroma of something baking in the oven, and the excitement of everyone waiting to taste it stayed with her. Years later, she found herself doing the same thing, only this time with her own ideas, her own flavours, and her own little style.",
      "What started as curiosity slowly turned into creativity.",
      "She began experimenting with recipes, adding her personal touch, making treats healthier where possible, playing with chocolates, cookies, brownies, cakes and gifting combinations, and creating something that felt uniquely hers.",
      "And somewhere between all the experimenting, tasting, laughter and a little Panda Chef inspiration, Magic T Treats was born.",
      "The name has its own little mystery too.",
      "The T in Magic T Treats represents a secret ingredient. It is something that remains part of the magic behind every recipe. Maybe it is an ingredient. Maybe it is a feeling. Maybe it is simply the love and thought that goes into making every batch special.",
      "That secret is staying in the kitchen.",
      "For the last five years, she has been serving customers with handmade baked treats created with care, patience and a genuine love for what she does.",
      "Every cookie, brownie, chocolate, cake and gift box carries a little part of that journey. From watching her mother bake, to finding her own style, to seeing customers come back for another box, every step has made Magic T Treats what it is today.",
      "For her, the most rewarding part is still the simplest one.",
      "Seeing someone take a bite, smile, and enjoy something she created.",
      "Because Magic T Treats was never just about baking.",
      "It is about sharing happiness, one treat at a time.",
    ],
    signature: "Made with memories. Made with love. Made with a little magic.",
    photoUrl: "/media/tavishi-manohar-home-baker-tricity.webp",
    photoAlt:
      "The baker behind Magic T-treats, in a chef's hat and apron, holding a plate of handmade chocolate truffles.",
  },
  "about.philosophy": {
    heading: "How we bake",
    values: [
      {
        title: "Small batches, always",
        description: "Volume is capped on purpose. Quality is easier to hold when the tray is small.",
      },
      {
        title: "Ingredients you can name",
        description:
          "Whole grains, jaggery, real butter and couverture chocolate. Nothing that needs explaining.",
      },
      {
        title: "Made for real diets",
        description:
          "Sugar-free and eggless are not afterthoughts here. They are half of what we bake.",
      },
      {
        title: "Packed like a gift",
        description:
          "Every box is packed by hand, because most of them are going to someone who matters.",
      },
    ],
  },
  "footer.content": {
    tagline:
      "Small-batch bakes, handmade chocolates and thoughtful gifting across Tricity.",
    note: "Baked fresh to order in a home kitchen.",
  },
};

export const settingsDefaults: SiteSettingsMap = {
  general: {
    bakeryName: "Magic T-treats",
    // The brand's own descriptor, taken from the logo.
    tagline: "Homemade Chocolates and Cakes",
    phone: "",
    email: "",
    serviceArea: "Chandigarh, Mohali & Panchkula",
    // Bundled in /public so the mark renders before anything is uploaded.
    // Replacing it from Settings → Bakery details overrides this.
    logoUrl: "/brand/logo.png",
    faviconUrl: null,
  },
  social: {
    instagramUrl: "https://www.instagram.com/magicttreats_/",
    instagramUsername: "magicttreats_",
    whatsappNumber: "",
  },
  fulfilment: {
    deliveryText: "Delivery available across Chandigarh, Mohali and Panchkula.",
    pickupText: "Pickup available by appointment once your order is ready.",
    serviceAreas: ["Chandigarh", "Mohali", "Panchkula", "Zirakpur"],
  },
  seo: {
    defaultTitle: "Magic T-treats | Home Bakery in Tricity",
    defaultDescription:
      "Healthy homemade cookies, brownies, handmade chocolates and festive gift boxes, baked in small batches and delivered across Chandigarh, Mohali and Panchkula.",
    ogImageUrl: "/brand/og.png",
    keywords: [
      "homemade bakery Tricity",
      "healthy cookies Chandigarh",
      "brownies Chandigarh",
      "handmade chocolates Chandigarh",
      "sugar-free bakery Tricity",
      "custom chocolate gifts Chandigarh",
      "festive gift boxes",
      "home bakery Panchkula",
      "bakery Mohali",
    ],
  },
  uploads: {
    maxImageMb: 10,
    maxVideoMb: 100,
  },
};

/**
 * Bundled starter reels.
 *
 * `posts` is the real source for the video sections, but a brand-new install
 * has none, and "Watch Them Being Made" is one of the strongest things on the
 * page — leaving it hidden until someone uploads is a poor first impression.
 *
 * These render only when the table returns nothing. The moment the baker
 * publishes a real post, these disappear entirely; nothing merges them.
 */
export const starterReels = [
  {
    id: "starter-scoopable",
    title: "Scoopable cookies, fresh from the tin",
    caption: "Big, gooey and best eaten warm.",
    mediaUrl: "/media/scoopable-cookies-baking-reel.mp4",
  },
  {
    id: "starter-kitchen",
    title: "A batch coming together",
    caption: "Small batches, mixed and packed by hand.",
    mediaUrl: "/media/home-bakery-kitchen-reel.mp4",
  },
] as const;

/** Labels shown in the admin content editor, so forms are self-describing. */
export const contentBlockLabels: Record<
  keyof SiteContentMap,
  { title: string; description: string }
> = {
  "home.hero": { title: "Homepage hero", description: "The first thing visitors read." },
  "home.trust": { title: "Trust highlights", description: "Four reasons to order from you." },
  "home.available_today": {
    title: "Baking Today heading",
    description: "Intro copy above today's available treats.",
  },
  "home.featured": {
    title: "Featured promotion",
    description: "The seasonal campaign banner near the top of the homepage.",
  },
  "home.bestsellers": {
    title: "Most Loved Treats heading",
    description: "Intro copy above your bestsellers.",
  },
  "home.custom_orders": {
    title: "Custom orders section",
    description: "Pitch for personalised and bulk orders.",
  },
  "home.testimonials": {
    title: "Testimonials heading",
    description: "Intro copy above customer reviews.",
  },
  "home.instagram": {
    title: "Instagram gallery heading",
    description: "Intro copy above your Instagram posts.",
  },
  "home.delivery": {
    title: "Delivery & pickup",
    description: "How customers receive their order.",
  },
  "home.final_cta": {
    title: "Closing call to action",
    description: "The last nudge before the footer.",
  },
  "about.story": { title: "Meet the baker", description: "Your story on the About page." },
  "about.philosophy": {
    title: "Baking philosophy",
    description: "The values behind how you bake.",
  },
  "footer.content": { title: "Footer", description: "Tagline and small print." },
};
