import { describe, expect, it } from "vitest";

import {
  buildCustomOrderMessage,
  buildEnquiryHandoffUrl,
  buildInstagramMessageUrl,
  buildProductEnquiryMessage,
  formatRequiredDate,
} from "@/lib/enquiry/message";

/**
 * The generated message is what the customer actually sends, so these tests
 * are about it reading like a human wrote it: no empty labels, no stray
 * punctuation, no leftover placeholders when fields are skipped.
 */

describe("formatRequiredDate", () => {
  it("formats an ISO date as day and month", () => {
    expect(formatRequiredDate("2026-09-12")).toBe("12 September");
  });

  it("does not shift the day across timezones", () => {
    // Parsed as UTC — a naive `new Date("2026-01-01")` read in IST is fine,
    // but in UTC-5 it would render as 31 December.
    expect(formatRequiredDate("2026-01-01")).toBe("1 January");
    expect(formatRequiredDate("2026-12-31")).toBe("31 December");
  });

  it("returns null for blank input", () => {
    expect(formatRequiredDate("")).toBeNull();
    expect(formatRequiredDate(null)).toBeNull();
    expect(formatRequiredDate(undefined)).toBeNull();
  });

  it("passes through text it cannot parse", () => {
    expect(formatRequiredDate("next Friday")).toBe("next Friday");
  });
});

describe("buildProductEnquiryMessage", () => {
  it("builds the full message from the spec example", () => {
    const message = buildProductEnquiryMessage({
      productName: "Signature Choco Bites",
      productSku: "CB-004",
      quantity: "2 Boxes",
      requiredDate: "2026-09-12",
      fulfilmentType: "delivery",
      customization: "Festive packaging",
    });

    expect(message).toBe(
      [
        "Hi! I'm interested in your Signature Choco Bites.",
        "",
        "Product Code: CB-004",
        "Quantity: 2 Boxes",
        "Required Date: 12 September",
        "Preference: Delivery",
        "Customization: Festive packaging",
        "",
        "Could you please share availability and pricing?",
      ].join("\n"),
    );
  });

  it("includes the source post so the baker can identify the item", () => {
    const message = buildProductEnquiryMessage({
      productName: "Scoopable Cookies",
      productSku: "IG-SCOOPABLE",
      postUrl: "https://www.instagram.com/p/ABC123/",
      quantity: "2 tins",
    });

    const lines = message.split("\n");
    expect(lines).toContain("Post: https://www.instagram.com/p/ABC123/");
    // Directly under the code, where it is read first on a phone.
    expect(lines.indexOf("Post: https://www.instagram.com/p/ABC123/")).toBe(
      lines.indexOf("Product Code: IG-SCOOPABLE") + 1,
    );
  });

  it("omits the post line for treats that did not come from Instagram", () => {
    const message = buildProductEnquiryMessage({
      productName: "Almond Butter Cookies",
      productSku: "CK-002",
      postUrl: null,
    });
    expect(message).not.toContain("Post:");
  });

  it("omits fields that were left blank rather than printing empty labels", () => {
    const message = buildProductEnquiryMessage({
      productName: "Classic Fudge Brownies",
      productSku: "BR-001",
      quantity: "",
      requiredDate: null,
      customization: "   ",
    });

    expect(message).toContain("Product Code: BR-001");
    expect(message).not.toContain("Quantity:");
    expect(message).not.toContain("Required Date:");
    expect(message).not.toContain("Customization:");
  });

  it("still produces a sendable message with no product context", () => {
    const message = buildProductEnquiryMessage({});
    expect(message).toBe(
      "Hi! I'd like to enquire about your treats.\n\nCould you please share availability and pricing?",
    );
  });

  it("collapses runaway whitespace from pasted input", () => {
    const message = buildProductEnquiryMessage({
      productName: "Cookies",
      quantity: "  3    boxes  ",
    });
    expect(message).toContain("Quantity: 3 boxes");
  });

  it("includes the customer's own note between details and closing", () => {
    const message = buildProductEnquiryMessage({
      productName: "Cookies",
      productSku: "CK-001",
      message: "Is it nut free?",
    });

    const lines = message.split("\n\n");
    expect(lines[1]).toBe("Product Code: CK-001");
    expect(lines[2]).toBe("Is it nut free?");
    expect(lines[3]).toBe("Could you please share availability and pricing?");
  });
});

describe("buildCustomOrderMessage", () => {
  it("greets by name and lists only the answered fields", () => {
    const message = buildCustomOrderMessage({
      customerName: "Priya",
      occasion: "Wedding favours",
      requiredDate: "2026-11-20",
      quantity: "80 boxes",
      sugarFreeRequired: true,
      budget: "",
    });

    expect(message).toContain("Hi! This is Priya. I'd like to place a custom order.");
    expect(message).toContain("Occasion: Wedding favours");
    expect(message).toContain("Required Date: 20 November");
    expect(message).toContain("Sugar-Free Required: Yes");
    expect(message).not.toContain("Approximate Budget:");
  });

  it("omits the sugar-free line entirely when not requested", () => {
    const message = buildCustomOrderMessage({
      customerName: "Ankit",
      sugarFreeRequired: false,
    });
    expect(message).not.toContain("Sugar-Free");
  });
});

describe("buildInstagramMessageUrl", () => {
  it("builds the DM entry point from the handle", () => {
    expect(buildInstagramMessageUrl("magicttreats_")).toBe("https://ig.me/m/magicttreats_");
  });

  it("tolerates a handle pasted with a leading @", () => {
    expect(buildInstagramMessageUrl("@magicttreats_")).toBe("https://ig.me/m/magicttreats_");
  });

  it("falls back to the profile URL when no handle is set", () => {
    expect(buildInstagramMessageUrl("", "https://www.instagram.com/magicttreats_/")).toBe(
      "https://www.instagram.com/magicttreats_/",
    );
    expect(buildInstagramMessageUrl(null)).toBe("https://www.instagram.com/");
  });
});

describe("buildEnquiryHandoffUrl", () => {
  const links = {
    instagramUrl: "https://www.instagram.com/magicttreats_/",
    instagramMessageUrl: "https://ig.me/m/magicttreats_",
    whatsappNumber: "919876543210",
  };

  it("prefills the message for WhatsApp", () => {
    const url = buildEnquiryHandoffUrl("whatsapp", "Hi there", links);
    expect(url).toBe("https://wa.me/919876543210?text=Hi%20there");
  });

  it("opens the Instagram chat thread, not the profile grid", () => {
    const url = buildEnquiryHandoffUrl("instagram", "Hi there", links);
    expect(url).toBe("https://ig.me/m/magicttreats_");
  });

  it("falls back to the profile if no DM URL was resolved", () => {
    const url = buildEnquiryHandoffUrl("instagram", "Hi", {
      ...links,
      instagramMessageUrl: undefined,
    });
    expect(url).toBe("https://www.instagram.com/magicttreats_/");
  });

  it("falls back to Instagram when no WhatsApp number is configured", () => {
    const url = buildEnquiryHandoffUrl("whatsapp", "Hi", { ...links, whatsappNumber: "" });
    expect(url).toBe("https://ig.me/m/magicttreats_");
  });
});
