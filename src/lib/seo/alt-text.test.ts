import { describe, expect, it } from "vitest";

import { altText } from "@/lib/seo/alt-text";

const SUFFIX = "Magic T-treats, Magic t treats, Tashu, tavishi, Tavishi manohar";

describe("altText", () => {
  it("appends the house suffix to a description", () => {
    expect(altText("Chocolate truffles in a pink gift box")).toBe(
      `Chocolate truffles in a pink gift box, ${SUFFIX}`,
    );
  });

  it("is idempotent, so a formatted value can be passed back through", () => {
    const once = altText("Diwali gift box");
    expect(altText(once)).toBe(once);
  });

  it("returns the brand terms alone rather than a leading comma", () => {
    // Happens when a product has no alt text and no usable name to fall back on.
    expect(altText("")).toBe(SUFFIX);
    expect(altText(null)).toBe(SUFFIX);
    expect(altText(undefined)).toBe(SUFFIX);
    expect(altText("   ")).toBe(SUFFIX);
  });

  it("does not double up punctuation from a description that already ends in a comma", () => {
    expect(altText("Almond tea cake,")).toBe(`Almond tea cake, ${SUFFIX}`);
  });
});
