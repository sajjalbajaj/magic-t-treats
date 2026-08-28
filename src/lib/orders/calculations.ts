/**
 * Order money maths.
 *
 * Kept pure and in one module because these numbers appear in three places —
 * the conversion form, the order detail screen and the revenue KPIs — and they
 * must agree everywhere. Rounded to 2 decimals at every step to match the
 * numeric(10,2) columns, so the UI can never show a total that the database
 * would store differently.
 */

export type OrderLineInput = {
  quantity: number;
  unitPrice: number;
};

export type OrderTotalsInput = {
  items: OrderLineInput[];
  discount?: number;
  deliveryCharge?: number;
  advanceAmount?: number;
};

export type OrderTotals = {
  subtotal: number;
  discount: number;
  deliveryCharge: number;
  totalAmount: number;
  advanceAmount: number;
  balanceDue: number;
};

/** Half-up to 2dp, guarding against float drift like 0.1 + 0.2. */
export function round2(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function nonNegative(value: number | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return 0;
  return value;
}

export function calculateLineTotal(quantity: number, unitPrice: number): number {
  return round2(nonNegative(quantity) * nonNegative(unitPrice));
}

export function calculateOrderTotals(input: OrderTotalsInput): OrderTotals {
  const subtotal = round2(
    input.items.reduce(
      (sum, item) => sum + calculateLineTotal(item.quantity, item.unitPrice),
      0,
    ),
  );

  const deliveryCharge = round2(nonNegative(input.deliveryCharge));

  // A discount cannot exceed the goods it applies to; delivery is charged
  // regardless. Clamping here means a typo in the admin form produces a
  // sensible total instead of a negative one the CHECK constraint rejects.
  const discount = round2(Math.min(nonNegative(input.discount), subtotal));

  const totalAmount = round2(subtotal - discount + deliveryCharge);

  // Likewise: you cannot take more in advance than the order is worth.
  const advanceAmount = round2(Math.min(nonNegative(input.advanceAmount), totalAmount));
  const balanceDue = round2(totalAmount - advanceAmount);

  return { subtotal, discount, deliveryCharge, totalAmount, advanceAmount, balanceDue };
}

/**
 * Payment status derived from the money, not set by hand — it cannot then
 * drift out of step with the amounts shown next to it.
 */
export function derivePaymentStatus(
  totalAmount: number,
  advanceAmount: number,
): "pending" | "partial" | "paid" {
  const total = round2(nonNegative(totalAmount));
  const paid = round2(nonNegative(advanceAmount));

  if (total > 0 && paid >= total) return "paid";
  if (paid > 0) return "partial";
  return "pending";
}

/** Order lifecycle transitions the dashboard is allowed to offer. */
const ORDER_TRANSITIONS: Record<string, string[]> = {
  confirmed: ["preparing", "cancelled"],
  preparing: ["ready", "cancelled"],
  ready: ["out_for_delivery", "delivered", "cancelled"],
  out_for_delivery: ["delivered", "cancelled"],
  delivered: [],
  cancelled: [],
};

export function nextOrderStatuses(current: string): string[] {
  return ORDER_TRANSITIONS[current] ?? [];
}

export function canTransitionOrder(from: string, to: string): boolean {
  return nextOrderStatuses(from).includes(to);
}
