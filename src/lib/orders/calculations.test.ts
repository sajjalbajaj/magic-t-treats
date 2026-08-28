import { describe, expect, it } from "vitest";

import {
  calculateLineTotal,
  calculateOrderTotals,
  canTransitionOrder,
  derivePaymentStatus,
  nextOrderStatuses,
  round2,
} from "@/lib/orders/calculations";

/**
 * These numbers become the business's revenue figures and what the customer is
 * told to pay, so the tests focus on the cases that quietly corrupt a total:
 * float drift, over-large discounts, and negative input.
 */

describe("round2", () => {
  it("avoids binary floating point drift", () => {
    expect(round2(0.1 + 0.2)).toBe(0.3);
    expect(round2(1.005)).toBe(1.01);
  });

  it("treats non-finite values as zero rather than propagating NaN", () => {
    expect(round2(Number.NaN)).toBe(0);
    expect(round2(Number.POSITIVE_INFINITY)).toBe(0);
  });
});

describe("calculateLineTotal", () => {
  it("multiplies quantity by unit price", () => {
    expect(calculateLineTotal(3, 320)).toBe(960);
  });

  it("supports fractional quantities such as half kilos", () => {
    expect(calculateLineTotal(2.5, 480)).toBe(1200);
  });

  it("clamps negative input to zero instead of crediting the customer", () => {
    expect(calculateLineTotal(-2, 320)).toBe(0);
    expect(calculateLineTotal(2, -320)).toBe(0);
  });
});

describe("calculateOrderTotals", () => {
  const items = [
    { quantity: 2, unitPrice: 420 },
    { quantity: 1, unitPrice: 480 },
  ];

  it("adds delivery and subtracts discount", () => {
    const totals = calculateOrderTotals({
      items,
      discount: 100,
      deliveryCharge: 60,
      advanceAmount: 500,
    });

    expect(totals.subtotal).toBe(1320);
    expect(totals.discount).toBe(100);
    expect(totals.deliveryCharge).toBe(60);
    expect(totals.totalAmount).toBe(1280);
    expect(totals.advanceAmount).toBe(500);
    expect(totals.balanceDue).toBe(780);
  });

  it("caps a discount at the subtotal so the total can never go negative", () => {
    const totals = calculateOrderTotals({ items, discount: 99_999, deliveryCharge: 60 });

    expect(totals.discount).toBe(1320);
    // Delivery is still charged; only the goods are discounted away.
    expect(totals.totalAmount).toBe(60);
    expect(totals.totalAmount).toBeGreaterThanOrEqual(0);
  });

  it("caps the advance at the total so the balance is never negative", () => {
    const totals = calculateOrderTotals({ items, advanceAmount: 99_999 });

    expect(totals.advanceAmount).toBe(1320);
    expect(totals.balanceDue).toBe(0);
  });

  it("returns zeroes for an empty order", () => {
    const totals = calculateOrderTotals({ items: [] });

    expect(totals.subtotal).toBe(0);
    expect(totals.totalAmount).toBe(0);
    expect(totals.balanceDue).toBe(0);
  });

  it("ignores negative discounts and charges", () => {
    const totals = calculateOrderTotals({
      items: [{ quantity: 1, unitPrice: 100 }],
      discount: -50,
      deliveryCharge: -20,
    });

    expect(totals.discount).toBe(0);
    expect(totals.deliveryCharge).toBe(0);
    expect(totals.totalAmount).toBe(100);
  });

  it("keeps totals at two decimals to match the numeric(10,2) columns", () => {
    const totals = calculateOrderTotals({
      items: [{ quantity: 3, unitPrice: 33.33 }],
    });
    expect(totals.subtotal).toBe(99.99);
  });
});

describe("derivePaymentStatus", () => {
  it("is pending when nothing has been paid", () => {
    expect(derivePaymentStatus(1000, 0)).toBe("pending");
  });

  it("is partial when some has been paid", () => {
    expect(derivePaymentStatus(1000, 400)).toBe("partial");
  });

  it("is paid when the advance covers the total", () => {
    expect(derivePaymentStatus(1000, 1000)).toBe("paid");
    expect(derivePaymentStatus(1000, 1200)).toBe("paid");
  });

  it("does not mark a zero-value order as paid", () => {
    expect(derivePaymentStatus(0, 0)).toBe("pending");
  });
});

describe("order lifecycle", () => {
  it("offers the expected next steps", () => {
    expect(nextOrderStatuses("confirmed")).toEqual(["preparing", "cancelled"]);
    expect(nextOrderStatuses("ready")).toEqual(["out_for_delivery", "delivered", "cancelled"]);
  });

  it("treats delivered and cancelled as terminal", () => {
    expect(nextOrderStatuses("delivered")).toEqual([]);
    expect(nextOrderStatuses("cancelled")).toEqual([]);
  });

  it("rejects transitions that skip or reverse the lifecycle", () => {
    expect(canTransitionOrder("confirmed", "preparing")).toBe(true);
    expect(canTransitionOrder("confirmed", "delivered")).toBe(false);
    expect(canTransitionOrder("delivered", "preparing")).toBe(false);
    expect(canTransitionOrder("cancelled", "confirmed")).toBe(false);
  });

  it("returns no transitions for an unknown status", () => {
    expect(nextOrderStatuses("not-a-status")).toEqual([]);
  });
});
