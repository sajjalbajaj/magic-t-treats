import {
  Cake,
  CakeSlice,
  Candy,
  Cookie,
  Croissant,
  Gift,
  Heart,
  Leaf,
  type LucideIcon,
} from "lucide-react";

/**
 * Icon per category, matched on the slug.
 *
 * Keyed by slug rather than stored on the row on purpose: the baker should be
 * naming categories, not picking icon identifiers. Anything unrecognised falls
 * back to a neutral mark, so adding a category never renders a broken tile.
 */
const BY_SLUG: Record<string, LucideIcon> = {
  cookies: Cookie,
  "dry-cakes": Cake,
  brownies: CakeSlice,
  "choco-bites": Candy,
  chocolates: Candy,
  muffins: Croissant,
  "sugar-free": Leaf,
  "gift-boxes": Gift,
};

/** Loose keyword match, so "Festive Cookies" still gets the cookie icon. */
const BY_KEYWORD: [RegExp, LucideIcon][] = [
  [/cookie|biscuit/i, Cookie],
  [/brownie/i, CakeSlice],
  [/cake|loaf/i, Cake],
  [/chocolate|choco|bite/i, Candy],
  [/muffin|cupcake|bun/i, Croissant],
  [/sugar|healthy|vegan/i, Leaf],
  [/gift|hamper|box|combo/i, Gift],
];

export function getCategoryIcon(slug: string, name?: string): LucideIcon {
  const direct = BY_SLUG[slug];
  if (direct) return direct;

  const haystack = `${slug} ${name ?? ""}`;
  for (const [pattern, icon] of BY_KEYWORD) {
    if (pattern.test(haystack)) return icon;
  }

  return Heart;
}
