import { describe, expect, it } from "vitest";

import { normaliseInstagramUrl } from "@/lib/instagram/url";

/**
 * URL normalisation is the part that must be exactly right: it is both the
 * duplicate-import key and the link shown to customers, so a stray tracking
 * parameter would make the same post look like two different products.
 */
describe("normaliseInstagramUrl", () => {
  it("accepts posts, reels and TV links", () => {
    expect(normaliseInstagramUrl("https://www.instagram.com/p/ABC123/")).toBe(
      "https://www.instagram.com/p/ABC123/",
    );
    expect(normaliseInstagramUrl("https://instagram.com/reel/XyZ_9-8/")).toBe(
      "https://www.instagram.com/reel/XyZ_9-8/",
    );
    expect(normaliseInstagramUrl("https://www.instagram.com/tv/Abc123/")).toBe(
      "https://www.instagram.com/tv/Abc123/",
    );
  });

  it("strips share tracking so the same post is not imported twice", () => {
    const a = normaliseInstagramUrl("https://www.instagram.com/p/ABC123/?igsh=abcdef&img_index=2");
    const b = normaliseInstagramUrl("https://instagram.com/p/ABC123");
    expect(a).toBe("https://www.instagram.com/p/ABC123/");
    expect(a).toBe(b);
  });

  it("normalises the plural /reels/ form to /reel/", () => {
    expect(normaliseInstagramUrl("https://www.instagram.com/reels/ABC123/")).toBe(
      "https://www.instagram.com/reel/ABC123/",
    );
  });

  it("rejects profile links, which are not a single post", () => {
    expect(normaliseInstagramUrl("https://www.instagram.com/magicttreats_/")).toBeNull();
    expect(normaliseInstagramUrl("https://www.instagram.com/")).toBeNull();
  });

  it("rejects other hosts, including lookalikes", () => {
    expect(normaliseInstagramUrl("https://instagram.com.evil.test/p/ABC123/")).toBeNull();
    expect(normaliseInstagramUrl("https://notinstagram.com/p/ABC123/")).toBeNull();
    expect(normaliseInstagramUrl("https://example.com/p/ABC123/")).toBeNull();
  });

  it("rejects junk", () => {
    expect(normaliseInstagramUrl("")).toBeNull();
    expect(normaliseInstagramUrl("   ")).toBeNull();
    expect(normaliseInstagramUrl("not a url")).toBeNull();
    expect(normaliseInstagramUrl("javascript:alert(1)")).toBeNull();
  });
});
