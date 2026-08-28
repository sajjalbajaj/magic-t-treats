"use server";

import { redirect } from "next/navigation";

import {
  actionError,
  describeDatabaseError,
  logActivity,
  revalidateAdmin,
  withAdmin,
} from "@/lib/admin/actions";
import {
  calculateLineTotal,
  calculateOrderTotals,
  canTransitionOrder,
  derivePaymentStatus,
} from "@/lib/orders/calculations";
import { enquiryStatusSchema, orderSchema, orderStatusSchema } from "@/lib/validation/admin";
import type { ActionResult } from "@/types/domain";
import type { OrderItemInput } from "@/lib/validation/admin";

/**
 * Lead and order operations.
 *
 * Money is never taken from the form as-is: totals are recomputed server-side
 * from the line items, because the numbers the browser sends are a suggestion
 * and the numbers in the database are the business record.
 */

// --- Enquiries --------------------------------------------------------------
export async function updateEnquiryStatusAction(
  id: string,
  status: string,
): Promise<ActionResult<undefined>> {
  return withAdmin(async ({ supabase, user }) => {
    const parsed = enquiryStatusSchema.safeParse({ id, status });
    if (!parsed.success) {
      return actionError("VALIDATION_ERROR", "That status is not recognised.");
    }

    const { error } = await supabase
      .from("enquiries")
      .update({ status: parsed.data.status })
      .eq("id", parsed.data.id);

    if (error) return actionError("DB_ERROR", describeDatabaseError(error, "enquiry"));

    await logActivity(user.id, "enquiry.status", "enquiry", id, { status: parsed.data.status });

    revalidateAdmin("/admin/enquiries");
    revalidateAdmin(`/admin/enquiries/${id}`);
    revalidateAdmin("/admin");
    return { success: true, data: undefined };
  });
}

// --- Orders -----------------------------------------------------------------

/** Pulls the repeated `items[n][field]` inputs out of FormData. */
function parseItems(formData: FormData): OrderItemInput[] {
  const items: OrderItemInput[] = [];

  const names = formData.getAll("item_name").map(String);
  const skus = formData.getAll("item_sku").map(String);
  const productIds = formData.getAll("item_product_id").map(String);
  const quantities = formData.getAll("item_quantity").map(String);
  const prices = formData.getAll("item_price").map(String);
  const customizations = formData.getAll("item_customization").map(String);

  for (let index = 0; index < names.length; index += 1) {
    const name = (names[index] ?? "").trim();
    // Blank rows are the form's empty template; skip rather than reject.
    if (!name) continue;

    items.push({
      product_name: name,
      product_sku: (skus[index] ?? "").trim() || null,
      product_id: (productIds[index] ?? "").trim() || null,
      quantity: Number(quantities[index] ?? 1) || 1,
      unit_price: Number(prices[index] ?? 0) || 0,
      customization: (customizations[index] ?? "").trim() || null,
    });
  }

  return items;
}

export async function createOrderAction(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  const result = await withAdmin<{ id: string }>(async ({ supabase, user }) => {
    const parsed = orderSchema.safeParse({
      enquiry_id: formData.get("enquiry_id") || undefined,
      customer_name: formData.get("customer_name"),
      phone: formData.get("phone"),
      email: formData.get("email"),
      required_date: formData.get("required_date"),
      fulfilment_type: formData.get("fulfilment_type") || undefined,
      delivery_address: formData.get("delivery_address"),
      discount: formData.get("discount") ?? 0,
      delivery_charge: formData.get("delivery_charge") ?? 0,
      advance_amount: formData.get("advance_amount") ?? 0,
      notes: formData.get("notes"),
      items: parseItems(formData),
    });

    if (!parsed.success) {
      return actionError(
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "Please check the order details.",
      );
    }

    const input = parsed.data;

    const totals = calculateOrderTotals({
      items: input.items.map((item) => ({
        quantity: item.quantity,
        unitPrice: item.unit_price,
      })),
      discount: input.discount,
      deliveryCharge: input.delivery_charge,
      advanceAmount: input.advance_amount,
    });

    const { data: order, error } = await supabase
      .from("orders")
      .insert({
        enquiry_id: input.enquiry_id ?? null,
        customer_name: input.customer_name,
        phone: input.phone,
        email: input.email,
        required_date: input.required_date,
        fulfilment_type: input.fulfilment_type ?? null,
        delivery_address: input.delivery_address,
        subtotal: totals.subtotal,
        discount: totals.discount,
        delivery_charge: totals.deliveryCharge,
        total_amount: totals.totalAmount,
        advance_amount: totals.advanceAmount,
        payment_status: derivePaymentStatus(totals.totalAmount, totals.advanceAmount),
        notes: input.notes,
      })
      .select("id, order_number")
      .single();

    if (error || !order) {
      return actionError("DB_ERROR", describeDatabaseError(error!, "order"));
    }

    const { error: itemsError } = await supabase.from("order_items").insert(
      input.items.map((item) => ({
        order_id: order.id,
        product_id: item.product_id,
        product_name: item.product_name,
        product_sku: item.product_sku,
        quantity: item.quantity,
        unit_price: item.unit_price,
        line_total: calculateLineTotal(item.quantity, item.unit_price),
        customization: item.customization,
      })),
    );

    if (itemsError) {
      // Postgres has no transaction across separate PostgREST calls, so an
      // order whose items failed to insert is rolled back by hand — a
      // zero-item order would corrupt every revenue figure that follows.
      await supabase.from("orders").delete().eq("id", order.id);
      return actionError("DB_ERROR", describeDatabaseError(itemsError, "order items"));
    }

    // Converting is the point of the conversion flow; mark the source enquiry.
    if (input.enquiry_id) {
      await supabase.from("enquiries").update({ status: "converted" }).eq("id", input.enquiry_id);
      revalidateAdmin(`/admin/enquiries/${input.enquiry_id}`);
    }

    await logActivity(user.id, "order.create", "order", order.id, {
      order_number: order.order_number,
      total: totals.totalAmount,
      from_enquiry: input.enquiry_id ?? null,
    });

    revalidateAdmin("/admin/orders");
    revalidateAdmin("/admin/enquiries");
    revalidateAdmin("/admin");
    return { success: true, data: { id: order.id } };
  });

  if (result.success) {
    redirect(`/admin/orders/${result.data.id}?created=1`);
  }

  return result;
}

export async function updateOrderStatusAction(
  id: string,
  status: string,
): Promise<ActionResult<undefined>> {
  return withAdmin(async ({ supabase, user }) => {
    const parsed = orderStatusSchema.safeParse({ id, status });
    if (!parsed.success) {
      return actionError("VALIDATION_ERROR", "That status is not recognised.");
    }

    const { data: current } = await supabase
      .from("orders")
      .select("status, order_number")
      .eq("id", id)
      .maybeSingle();

    if (!current) return actionError("NOT_FOUND", "That order no longer exists.");

    // Enforced here as well as in the UI: a stale tab could otherwise post a
    // transition that no longer makes sense, e.g. delivered -> preparing.
    if (!canTransitionOrder(current.status, parsed.data.status)) {
      return actionError(
        "INVALID_TRANSITION",
        `An order that is ${current.status.replace(/_/g, " ")} cannot move to ${parsed.data.status.replace(/_/g, " ")}.`,
      );
    }

    const { error } = await supabase
      .from("orders")
      .update({ status: parsed.data.status })
      .eq("id", id);

    if (error) return actionError("DB_ERROR", describeDatabaseError(error, "order"));

    await logActivity(user.id, "order.status", "order", id, {
      order_number: current.order_number,
      from: current.status,
      to: parsed.data.status,
    });

    revalidateAdmin("/admin/orders");
    revalidateAdmin(`/admin/orders/${id}`);
    revalidateAdmin("/admin");
    return { success: true, data: undefined };
  });
}

/** Payment and notes, edited from the order detail screen. */
export async function updateOrderPaymentAction(
  _prev: ActionResult<undefined> | null,
  formData: FormData,
): Promise<ActionResult<undefined>> {
  return withAdmin(async ({ supabase, user }) => {
    const id = String(formData.get("id") ?? "");
    if (!id) return actionError("VALIDATION_ERROR", "Missing order.");

    const { data: order } = await supabase
      .from("orders")
      .select("total_amount")
      .eq("id", id)
      .maybeSingle();

    if (!order) return actionError("NOT_FOUND", "That order no longer exists.");

    const advanceRaw = Number(formData.get("advance_amount") ?? 0);
    const advance = Number.isFinite(advanceRaw) && advanceRaw >= 0 ? advanceRaw : 0;
    const capped = Math.min(advance, order.total_amount);

    const { error } = await supabase
      .from("orders")
      .update({
        advance_amount: capped,
        payment_status: derivePaymentStatus(order.total_amount, capped),
        notes: (formData.get("notes") as string)?.trim() || null,
      })
      .eq("id", id);

    if (error) return actionError("DB_ERROR", describeDatabaseError(error, "order"));

    await logActivity(user.id, "order.payment", "order", id, { advance: capped });

    revalidateAdmin(`/admin/orders/${id}`);
    revalidateAdmin("/admin/orders");
    return { success: true, data: undefined };
  });
}
