import { describe, expect, it } from "vitest";

import {
  detectDeviceType,
  extractUtm,
  inferSourceFromReferrer,
  normaliseUtmValue,
  resolveAttribution,
} from "@/lib/analytics/normalize";

/**
 * Attribution decides what the lead-source report says, so the important
 * property is that equivalent traffic lands in one bucket rather than three.
 */

describe("normaliseUtmValue", () => {
  it("lowercases and trims", () => {
    expect(normaliseUtmValue("  Instagram ")).toBe("instagram");
    expect(normaliseUtmValue("INSTAGRAM")).toBe("instagram");
  });

  it("treats blank as absent so it never lands in the report as an empty bucket", () => {
    expect(normaliseUtmValue("")).toBeUndefined();
    expect(normaliseUtmValue("   ")).toBeUndefined();
    expect(normaliseUtmValue(null)).toBeUndefined();
  });

  it("caps length to fit the column", () => {
    expect(normaliseUtmValue("x".repeat(300))).toHaveLength(120);
  });
});

describe("extractUtm", () => {
  it("pulls the campaign parameters out of a URL query", () => {
    const params = new URLSearchParams(
      "utm_source=Instagram&utm_medium=Bio&utm_campaign=Diwali2026&unrelated=1",
    );

    expect(extractUtm(params)).toEqual({
      utm_source: "instagram",
      utm_medium: "bio",
      utm_campaign: "diwali2026",
    });
  });

  it("returns nothing for an untagged URL", () => {
    expect(extractUtm(new URLSearchParams("page=2"))).toEqual({});
  });

  it("supports the QR campaign shape from the spec", () => {
    const params = new URLSearchParams("utm_source=qr&utm_medium=offline&utm_campaign=packaging");
    expect(extractUtm(params).utm_source).toBe("qr");
  });
});

describe("inferSourceFromReferrer", () => {
  it("recognises the platforms that actually send traffic", () => {
    expect(inferSourceFromReferrer("https://www.instagram.com/")).toBe("instagram");
    expect(inferSourceFromReferrer("https://l.instagram.com/?u=x")).toBe("instagram");
    expect(inferSourceFromReferrer("https://www.google.com/search?q=bakery")).toBe("google");
    expect(inferSourceFromReferrer("https://api.whatsapp.com/")).toBe("whatsapp");
  });

  it("returns undefined for unknown or malformed referrers", () => {
    expect(inferSourceFromReferrer("https://example.com")).toBeUndefined();
    expect(inferSourceFromReferrer("not a url")).toBeUndefined();
    expect(inferSourceFromReferrer("")).toBeUndefined();
  });
});

describe("resolveAttribution", () => {
  it("prefers an explicit campaign tag over the referrer", () => {
    const resolved = resolveAttribution({
      utm_source: "QR",
      referrer: "https://www.instagram.com/",
    });
    expect(resolved.utm_source).toBe("qr");
  });

  it("falls back to the referrer when no tag is present", () => {
    const resolved = resolveAttribution({ referrer: "https://www.instagram.com/p/abc" });
    expect(resolved.utm_source).toBe("instagram");
  });

  it("labels genuinely unattributed traffic as direct, never blank", () => {
    expect(resolveAttribution({}).utm_source).toBe("direct");
    expect(resolveAttribution({ utm_source: "  " }).utm_source).toBe("direct");
  });

  it("truncates an over-long referrer to fit the column", () => {
    const long = `https://example.com/${"a".repeat(900)}`;
    expect(resolveAttribution({ referrer: long }).referrer).toHaveLength(500);
  });
});

describe("detectDeviceType", () => {
  it("identifies phones", () => {
    expect(
      detectDeviceType(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148",
      ),
    ).toBe("mobile");
    expect(detectDeviceType("Mozilla/5.0 (Linux; Android 14; Pixel 8) Mobile Safari/537.36")).toBe(
      "mobile",
    );
  });

  it("identifies tablets, including Android tablets without the Mobile token", () => {
    expect(detectDeviceType("Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)")).toBe("tablet");
    expect(detectDeviceType("Mozilla/5.0 (Linux; Android 14; SM-X200) Safari/537.36")).toBe(
      "tablet",
    );
  });

  it("defaults to desktop, including when the header is missing", () => {
    expect(detectDeviceType("Mozilla/5.0 (Windows NT 10.0; Win64; x64)")).toBe("desktop");
    expect(detectDeviceType(null)).toBe("desktop");
    expect(detectDeviceType("")).toBe("desktop");
  });
});
