"use client";

import { useActionState, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Card } from "@/components/ui/primitives";
import { createOrderAction } from "@/app/actions/leads";
import { calculateOrderTotals } from "@/lib/orders/calculations";
import { formatCurrency } from "@/lib/utils";
import type { ActionResult, Enquiry } from "@/types/domain";

type ProductOption = {
  id: string;
  name: string;
  sku: string;
  starting_price: number | null;
};

type LineItem = {
  key: number;
  productId: string;
  name: string;
  sku: string;
  quantity: string;
  unitPrice: string;
  customization: string;
};

let nextKey = 0;
const blankItem = (): LineItem => ({
  key: nextKey++,
  productId: "",
  name: "",
  sku: "",
  quantity: "1",
  unitPrice: "",
  customization: "",
});

/**
 * Order creation, also used as the enquiry conversion form.
 *
 * When an enquiry is passed in, its details are pre-filled — including a first
 * line item for the product enquired about — so converting is a matter of
 * adding a price rather than retyping the customer's request.
 *
 * Totals are previewed here with the same pure function the server uses, so
 * the figure the baker sees before saving is the figure that gets stored.
 */
export function OrderForm({
  enquiry,
  products,
}: {
  enquiry: Enquiry | null;
  products: ProductOption[];
}) {
  const [state, formAction, pending] = useActionState<
    ActionResult<{ id: string }> | null,
    FormData
  >(createOrderAction, null);

  const [items, setItems] = useState<LineItem[]>(() => {
    if (enquiry?.product_name) {
      const matched = products.find((product) => product.sku === enquiry.product_sku);
      return [
        {
          ...blankItem(),
          productId: matched?.id ?? "",
          name: enquiry.product_name,
          sku: enquiry.product_sku ?? "",
          quantity: "1",
          unitPrice: matched?.starting_price ? String(matched.starting_price) : "",
          customization: enquiry.customization ?? "",
        },
      ];
    }
    return [blankItem()];
  });

  const [discount, setDiscount] = useState("0");
  const [deliveryCharge, setDeliveryCharge] = useState("0");
  const [advance, setAdvance] = useState("0");

  const totals = useMemo(
    () =>
      calculateOrderTotals({
        items: items.map((item) => ({
          quantity: Number(item.quantity) || 0,
          unitPrice: Number(item.unitPrice) || 0,
        })),
        discount: Number(discount) || 0,
        deliveryCharge: Number(deliveryCharge) || 0,
        advanceAmount: Number(advance) || 0,
      }),
    [items, discount, deliveryCharge, advance],
  );

  const updateItem = (key: number, patch: Partial<LineItem>) =>
    setItems((current) =>
      current.map((item) => (item.key === key ? { ...item, ...patch } : item)),
    );

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {enquiry ? <input type="hidden" name="enquiry_id" value={enquiry.id} /> : null}

      <Card className="flex flex-col gap-4">
        <h2 className="font-sans text-base font-bold text-admin-ink">Customer</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Customer name" required>
            {({ id }) => (
              <Input
                id={id}
                name="customer_name"
                required
                defaultValue={enquiry?.customer_name ?? ""}
              />
            )}
          </Field>

          <Field label="Phone">
            {({ id }) => <Input id={id} name="phone" defaultValue={enquiry?.phone ?? ""} />}
          </Field>

          <Field label="Email">
            {({ id }) => (
              <Input id={id} name="email" type="email" defaultValue={enquiry?.email ?? ""} />
            )}
          </Field>

          <Field label="Required date">
            {({ id }) => (
              <Input
                id={id}
                name="required_date"
                type="date"
                defaultValue={enquiry?.required_date ?? ""}
              />
            )}
          </Field>

          <Field label="Delivery or pickup">
            {({ id }) => (
              <Select id={id} name="fulfilment_type" defaultValue={enquiry?.fulfilment_type ?? ""}>
                <option value="">Not set</option>
                <option value="delivery">Delivery</option>
                <option value="pickup">Pickup</option>
              </Select>
            )}
          </Field>

          <Field label="Delivery address" className="sm:col-span-2">
            {({ id }) => <Textarea id={id} name="delivery_address" rows={2} />}
          </Field>
        </div>
      </Card>

      <Card className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-sans text-base font-bold text-admin-ink">Items</h2>
          <Button
            variant="adminGhost"
            size="sm"
            onClick={() => setItems((current) => [...current, blankItem()])}
          >
            <Plus className="size-4" aria-hidden="true" />
            Add item
          </Button>
        </div>

        <ul className="flex flex-col gap-4">
          {items.map((item, index) => (
            <li
              key={item.key}
              className="grid gap-3 rounded-lg border border-admin-line p-3 sm:grid-cols-12"
            >
              <div className="sm:col-span-5">
                <Field label={`Item ${index + 1}`}>
                  {({ id }) => (
                    <>
                      {/* Choosing a product fills the name, code and price;
                          the fields stay editable for one-off variations. */}
                      <Select
                        id={id}
                        value={item.productId}
                        onChange={(event) => {
                          const product = products.find((p) => p.id === event.target.value);
                          updateItem(item.key, {
                            productId: event.target.value,
                            name: product?.name ?? item.name,
                            sku: product?.sku ?? item.sku,
                            unitPrice: product?.starting_price
                              ? String(product.starting_price)
                              : item.unitPrice,
                          });
                        }}
                      >
                        <option value="">Custom item…</option>
                        {products.map((product) => (
                          <option key={product.id} value={product.id}>
                            {product.name} ({product.sku})
                          </option>
                        ))}
                      </Select>
                      <input type="hidden" name="item_product_id" value={item.productId} />
                    </>
                  )}
                </Field>
              </div>

              <div className="sm:col-span-4">
                <Field label="Description">
                  {({ id }) => (
                    <Input
                      id={id}
                      name="item_name"
                      value={item.name}
                      onChange={(event) => updateItem(item.key, { name: event.target.value })}
                      placeholder="What is being made"
                    />
                  )}
                </Field>
                <input type="hidden" name="item_sku" value={item.sku} />
              </div>

              <div className="sm:col-span-1">
                <Field label="Qty">
                  {({ id }) => (
                    <Input
                      id={id}
                      name="item_quantity"
                      type="number"
                      min="0.5"
                      step="0.5"
                      value={item.quantity}
                      onChange={(event) => updateItem(item.key, { quantity: event.target.value })}
                    />
                  )}
                </Field>
              </div>

              <div className="sm:col-span-2">
                <Field label="Unit price">
                  {({ id }) => (
                    <Input
                      id={id}
                      name="item_price"
                      type="number"
                      min="0"
                      step="1"
                      value={item.unitPrice}
                      onChange={(event) =>
                        updateItem(item.key, { unitPrice: event.target.value })
                      }
                    />
                  )}
                </Field>
              </div>

              <div className="sm:col-span-11">
                <Field label="Customization">
                  {({ id }) => (
                    <Input
                      id={id}
                      name="item_customization"
                      value={item.customization}
                      onChange={(event) =>
                        updateItem(item.key, { customization: event.target.value })
                      }
                    />
                  )}
                </Field>
              </div>

              <div className="flex items-end sm:col-span-1">
                <Button
                  variant="adminGhost"
                  size="sm"
                  aria-label={`Remove item ${index + 1}`}
                  disabled={items.length === 1}
                  onClick={() =>
                    setItems((current) => current.filter((entry) => entry.key !== item.key))
                  }
                >
                  <Trash2 className="size-4 text-danger" aria-hidden="true" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </Card>

      <Card className="flex flex-col gap-4">
        <h2 className="font-sans text-base font-bold text-admin-ink">Totals</h2>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Discount">
            {({ id }) => (
              <Input
                id={id}
                name="discount"
                type="number"
                min="0"
                step="1"
                value={discount}
                onChange={(event) => setDiscount(event.target.value)}
              />
            )}
          </Field>

          <Field label="Delivery charge">
            {({ id }) => (
              <Input
                id={id}
                name="delivery_charge"
                type="number"
                min="0"
                step="1"
                value={deliveryCharge}
                onChange={(event) => setDeliveryCharge(event.target.value)}
              />
            )}
          </Field>

          <Field label="Advance received">
            {({ id }) => (
              <Input
                id={id}
                name="advance_amount"
                type="number"
                min="0"
                step="1"
                value={advance}
                onChange={(event) => setAdvance(event.target.value)}
              />
            )}
          </Field>
        </div>

        <dl className="flex flex-col gap-1.5 border-t border-admin-line pt-4 text-sm">
          <Row label="Subtotal" value={formatCurrency(totals.subtotal)} />
          <Row label="Discount" value={`− ${formatCurrency(totals.discount)}`} />
          <Row label="Delivery" value={formatCurrency(totals.deliveryCharge)} />
          <Row label="Total" value={formatCurrency(totals.totalAmount)} strong />
          <Row label="Advance" value={formatCurrency(totals.advanceAmount)} />
          <Row label="Balance due" value={formatCurrency(totals.balanceDue)} strong />
        </dl>

        <Field label="Internal notes">
          {({ id }) => (
            <Textarea
              id={id}
              name="notes"
              rows={3}
              defaultValue={enquiry?.message ?? ""}
              placeholder="Anything you need to remember when making this."
            />
          )}
        </Field>
      </Card>

      {state && !state.success ? (
        <p role="alert" className="text-sm font-medium text-danger">
          {state.error.message}
        </p>
      ) : null}

      <div className="flex justify-end gap-2">
        <Button
          type="submit"
          variant="admin"
          loading={pending}
          loadingLabel="Creating order…"
        >
          Create order
        </Button>
      </div>
    </form>
  );
}

function Row({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className={strong ? "font-semibold text-admin-ink" : "text-admin-muted"}>{label}</dt>
      <dd
        className={
          strong
            ? "font-semibold tabular-nums text-admin-ink"
            : "tabular-nums text-admin-muted"
        }
      >
        {value}
      </dd>
    </div>
  );
}
