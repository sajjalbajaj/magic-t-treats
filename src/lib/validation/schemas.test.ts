import { describe, expect, it } from "vitest";

import {
  analyticsEventSchema,
  customOrderSchemaWithContact,
  enquiryPayloadSchema,
} from "@/lib/validation/enquiry";
import { orderSchema, productSchema } from "@/lib/validation/admin";

/**
 * These schemas are the boundary between untrusted input and the database, so
 * the tests cover both directions: valid input must survive coercion intact,
 * and invalid input must be rejected rather than silently normalised.
 */

describe("productEnquirySchema", () => {
  const base = { kind: "product" as const };

  it("accepts a minimal enquiry", () => {
    const result = enquiryPayloadSchema.safeParse(base);
    expect(result.success).toBe(true);
  });

  it("normalises empty optional strings to undefined rather than storing ''", () => {
    const result = enquiryPayloadSchema.safeParse({
      ...base,
      customerName: "  ",
      quantity: "",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.customerName).toBeUndefined();
      expect(result.data.quantity).toBeUndefined();
    }
  });

  it("rejects an invalid date", () => {
    const result = enquiryPayloadSchema.safeParse({ ...base, requiredDate: "12-09-2026" });
    expect(result.success).toBe(false);
  });

  it("accepts Indian phone formats", () => {
    for (const phone of ["+91 98765 43210", "9876543210", "0172-2345678"]) {
      const result = enquiryPayloadSchema.safeParse({ ...base, phone });
      expect(result.success, phone).toBe(true);
    }
  });

  it("rejects a phone number that is really free text", () => {
    const result = enquiryPayloadSchema.safeParse({ ...base, phone: "call me maybe" });
    expect(result.success).toBe(false);
  });

  it("caps a very long message instead of accepting unbounded input", () => {
    const result = enquiryPayloadSchema.safeParse({ ...base, message: "x".repeat(5000) });
    expect(result.success).toBe(false);
  });

  it("rejects an unknown fulfilment type", () => {
    const result = enquiryPayloadSchema.safeParse({ ...base, fulfilmentType: "teleport" });
    expect(result.success).toBe(false);
  });
});

describe("customOrderSchemaWithContact", () => {
  const base = { kind: "custom" as const, customerName: "Priya" };

  it("requires a name", () => {
    const result = customOrderSchemaWithContact.safeParse({
      kind: "custom",
      customerName: "",
      phone: "9876543210",
    });
    expect(result.success).toBe(false);
  });

  it("requires at least one way to reply", () => {
    const result = customOrderSchemaWithContact.safeParse(base);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(["phone"]);
    }
  });

  it("accepts either phone or email", () => {
    expect(customOrderSchemaWithContact.safeParse({ ...base, phone: "9876543210" }).success).toBe(
      true,
    );
    expect(
      customOrderSchemaWithContact.safeParse({ ...base, email: "priya@example.com" }).success,
    ).toBe(true);
  });

  it("rejects a malformed email", () => {
    const result = customOrderSchemaWithContact.safeParse({ ...base, email: "priya@" });
    expect(result.success).toBe(false);
  });
});

describe("analyticsEventSchema", () => {
  it("accepts an allow-listed event", () => {
    const result = analyticsEventSchema.safeParse({
      event_type: "product_enquiry_click",
      product_sku: "CB-004",
      cta_location: "product_modal",
    });
    expect(result.success).toBe(true);
  });

  it("rejects arbitrary event names, so the table cannot be filled with junk", () => {
    expect(analyticsEventSchema.safeParse({ event_type: "anything_goes" }).success).toBe(false);
  });

  it("rejects a product id that is not a UUID", () => {
    const result = analyticsEventSchema.safeParse({
      event_type: "product_view",
      product_id: "42",
    });
    expect(result.success).toBe(false);
  });
});

describe("productSchema", () => {
  const valid = {
    sku: "CB-004",
    name: "Signature Choco Bites",
    slug: "signature-choco-bites",
    sort_order: "3",
  };

  it("coerces form strings into the right types", () => {
    const result = productSchema.safeParse({
      ...valid,
      starting_price: "420",
      is_bestseller: "on",
      highlight_tags: "Handmade, Limited Batch",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.starting_price).toBe(420);
      expect(result.data.sort_order).toBe(3);
      expect(result.data.is_bestseller).toBe(true);
      expect(result.data.highlight_tags).toEqual(["Handmade", "Limited Batch"]);
    }
  });

  it("treats an absent checkbox as false", () => {
    const result = productSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.is_bestseller).toBe(false);
      expect(result.data.is_active).toBe(false);
    }
  });

  it("treats a cleared price as null, not zero", () => {
    const result = productSchema.safeParse({ ...valid, starting_price: "" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.starting_price).toBeNull();
  });

  it("rejects a slug with spaces or capitals", () => {
    expect(productSchema.safeParse({ ...valid, slug: "Choco Bites" }).success).toBe(false);
    expect(productSchema.safeParse({ ...valid, slug: "Choco-Bites" }).success).toBe(false);
  });

  it("rejects a SKU containing separators that would break the message format", () => {
    expect(productSchema.safeParse({ ...valid, sku: "CB 004" }).success).toBe(false);
  });

  it("rejects a negative price", () => {
    expect(productSchema.safeParse({ ...valid, starting_price: "-10" }).success).toBe(false);
  });

  it("caps the number of extra badges", () => {
    const result = productSchema.safeParse({
      ...valid,
      highlight_tags: "a,b,c,d,e,f,g,h,i",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.highlight_tags).toHaveLength(6);
  });
});

describe("orderSchema", () => {
  const item = { product_name: "Brownies", quantity: "2", unit_price: "480" };

  it("accepts an order with at least one item", () => {
    const result = orderSchema.safeParse({
      customer_name: "Priya",
      discount: "0",
      delivery_charge: "60",
      advance_amount: "500",
      items: [item],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.items[0]?.quantity).toBe(2);
      expect(result.data.delivery_charge).toBe(60);
    }
  });

  it("rejects an order with no items", () => {
    const result = orderSchema.safeParse({ customer_name: "Priya", items: [] });
    expect(result.success).toBe(false);
  });

  it("rejects a zero quantity line", () => {
    const result = orderSchema.safeParse({
      customer_name: "Priya",
      items: [{ ...item, quantity: "0" }],
    });
    expect(result.success).toBe(false);
  });

  it("requires a customer name", () => {
    expect(orderSchema.safeParse({ customer_name: "P", items: [item] }).success).toBe(false);
  });
});
