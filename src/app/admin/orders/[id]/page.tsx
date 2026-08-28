import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { AdminTable, DefinitionList, Td } from "@/components/admin/admin-ui";
import { ActionButton } from "@/components/admin/action-controls";
import { OrderPaymentForm } from "@/components/admin/order-payment-form";
import { Card, OrderStatusBadge, PageHeader } from "@/components/ui/primitives";
import { updateOrderStatusAction } from "@/app/actions/leads";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getOrderWithItems } from "@/lib/data/admin";
import { nextOrderStatuses } from "@/lib/orders/calculations";
import { formatCurrency, formatDate, formatDateTime, titleCase } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = { title: "Order" };

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { supabase } = await requireAdmin();
  const { id } = await params;

  const order = await getOrderWithItems(supabase, id);
  if (!order) notFound();

  const balance = order.total_amount - order.advance_amount;
  const transitions = nextOrderStatuses(order.status);

  return (
    <>
      <Link
        href="/admin/orders"
        className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-admin-muted transition-colors duration-200 hover:text-admin-ink"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to orders
      </Link>

      <PageHeader
        title={order.order_number}
        description={`Created ${formatDateTime(order.created_at)}`}
        action={<OrderStatusBadge status={order.status} />}
      />

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-5">
          <Card className="flex flex-col gap-4">
            <h2 className="font-sans text-base font-bold text-admin-ink">Customer</h2>
            <DefinitionList
              items={[
                { label: "Name", value: order.customer_name },
                {
                  label: "Phone",
                  value: order.phone ? (
                    <a
                      href={`tel:${order.phone.replace(/\s/g, "")}`}
                      className="text-admin-accent hover:underline"
                    >
                      {order.phone}
                    </a>
                  ) : (
                    "-"
                  ),
                },
                { label: "Email", value: order.email ?? "-" },
                { label: "Required date", value: formatDate(order.required_date) },
                {
                  label: "Delivery / pickup",
                  value: order.fulfilment_type ? titleCase(order.fulfilment_type) : "-",
                },
                { label: "Address", value: order.delivery_address ?? "-" },
              ]}
            />
          </Card>

          <Card className="flex flex-col gap-4 p-0">
            <h2 className="px-5 pt-5 font-sans text-base font-bold text-admin-ink">Items</h2>
            <AdminTable headers={["Item", "Qty", "Unit", "Total"]} caption="Order items">
              {order.items.map((item) => (
                <tr key={item.id}>
                  <Td>
                    <span className="font-medium">{item.product_name}</span>
                    {item.product_sku ? (
                      <span className="block text-xs text-admin-muted">{item.product_sku}</span>
                    ) : null}
                    {item.customization ? (
                      <span className="mt-0.5 block text-xs italic text-admin-muted">
                        {item.customization}
                      </span>
                    ) : null}
                  </Td>
                  <Td className="tabular-nums">{item.quantity}</Td>
                  <Td className="tabular-nums">{formatCurrency(item.unit_price)}</Td>
                  <Td className="tabular-nums font-medium">{formatCurrency(item.line_total)}</Td>
                </tr>
              ))}
            </AdminTable>

            <dl className="flex flex-col gap-1.5 border-t border-admin-line px-5 py-4 text-sm">
              <Row label="Subtotal" value={formatCurrency(order.subtotal)} />
              {order.discount > 0 ? (
                <Row label="Discount" value={`− ${formatCurrency(order.discount)}`} />
              ) : null}
              {order.delivery_charge > 0 ? (
                <Row label="Delivery" value={formatCurrency(order.delivery_charge)} />
              ) : null}
              <Row label="Total" value={formatCurrency(order.total_amount)} strong />
              <Row label="Advance received" value={formatCurrency(order.advance_amount)} />
              <Row label="Balance due" value={formatCurrency(balance)} strong />
            </dl>
          </Card>

          {order.notes ? (
            <Card className="flex flex-col gap-2">
              <h2 className="font-sans text-base font-bold text-admin-ink">Notes</h2>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-admin-ink">
                {order.notes}
              </p>
            </Card>
          ) : null}
        </div>

        <aside className="flex flex-col gap-3">
          <Card className="flex flex-col gap-3">
            <h2 className="font-sans text-base font-bold text-admin-ink">Move this order on</h2>

            {transitions.length === 0 ? (
              <p className="text-sm text-admin-muted">
                This order is {order.status.replace(/_/g, " ")}. No further changes are needed.
              </p>
            ) : (
              transitions.map((status) => {
                const cancelling = status === "cancelled";
                return (
                  <ActionButton
                    key={status}
                    variant={cancelling ? "adminGhost" : "admin"}
                    className={cancelling ? "w-full text-danger" : "w-full"}
                    action={updateOrderStatusAction.bind(null, order.id, status)}
                    successMessage={`Order marked ${status.replace(/_/g, " ")}.`}
                    confirm={
                      cancelling
                        ? "Cancel this order? It stays in your records but is excluded from revenue."
                        : undefined
                    }
                    confirmTitle="Cancel order"
                    confirmLabel="Cancel order"
                  >
                    Mark {status.replace(/_/g, " ")}
                  </ActionButton>
                );
              })
            )}
          </Card>

          <Card className="flex flex-col gap-3">
            <h2 className="font-sans text-base font-bold text-admin-ink">Payment</h2>
            <p className="text-xs text-admin-muted">
              Payment status:{" "}
              <span className="font-semibold text-admin-ink">
                {titleCase(order.payment_status)}
              </span>
            </p>
            <OrderPaymentForm
              orderId={order.id}
              advanceAmount={order.advance_amount}
              notes={order.notes}
            />
          </Card>

          {order.enquiry_id ? (
            <Card>
              <Link
                href={`/admin/enquiries/${order.enquiry_id}`}
                className="text-sm font-semibold text-admin-accent hover:underline"
              >
                View the original enquiry
              </Link>
            </Card>
          ) : null}
        </aside>
      </div>
    </>
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
          strong ? "font-semibold tabular-nums text-admin-ink" : "tabular-nums text-admin-muted"
        }
      >
        {value}
      </dd>
    </div>
  );
}
