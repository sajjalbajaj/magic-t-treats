import Link from "next/link";
import { ClipboardList } from "lucide-react";

import { AdminTable, FilterTabs, SearchForm, Td } from "@/components/admin/admin-ui";
import {
  Card,
  EmptyState,
  OrderStatusBadge,
  PageHeader,
  Pagination,
} from "@/components/ui/primitives";
import { ButtonLink } from "@/components/ui/button";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getOrders } from "@/lib/data/admin";
import { formatCurrency, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = { title: "Orders" };

const STATUS_OPTIONS = [
  { label: "All", value: "all" },
  { label: "Confirmed", value: "confirmed" },
  { label: "Preparing", value: "preparing" },
  { label: "Ready", value: "ready" },
  { label: "Out for delivery", value: "out_for_delivery" },
  { label: "Delivered", value: "delivered" },
  { label: "Cancelled", value: "cancelled" },
];

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; search?: string; page?: string }>;
}) {
  const { supabase } = await requireAdmin();
  const params = await searchParams;

  const page = Number(params.page ?? "1") || 1;
  const status = params.status ?? "all";

  const { rows, total, pageCount } = await getOrders(supabase, {
    page,
    status,
    search: params.search,
  });

  return (
    <>
      <PageHeader
        title="Orders"
        description={`${total} order${total === 1 ? "" : "s"} matching this view.`}
        action={
          <ButtonLink href="/admin/orders/new" variant="admin">
            New order
          </ButtonLink>
        }
      />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <FilterTabs
          options={STATUS_OPTIONS}
          active={status}
          basePath="/admin/orders"
          extraParams={{ search: params.search }}
        />
        <SearchForm
          action="/admin/orders"
          defaultValue={params.search}
          placeholder="Search customer, phone or order no."
          hiddenFields={{ status: status !== "all" ? status : undefined }}
        />
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title="No orders yet"
          description="Convert an enquiry, or create an order directly."
          icon={<ClipboardList className="size-6" aria-hidden="true" />}
          action={
            <ButtonLink href="/admin/orders/new" variant="admin">
              Create an order
            </ButtonLink>
          }
        />
      ) : (
        <Card className="flex flex-col gap-4 p-0">
          <AdminTable
            headers={["Order", "Customer", "Needed", "Total", "Balance", "Status", ""]}
            caption="Orders"
          >
            {rows.map((order) => {
              const balance = order.total_amount - order.advance_amount;
              return (
                <tr key={order.id} className="hover:bg-admin-bg/50">
                  <Td className="whitespace-nowrap font-mono text-xs font-semibold">
                    {order.order_number}
                  </Td>
                  <Td className="font-medium">
                    {order.customer_name}
                    {order.phone ? (
                      <span className="block text-xs text-admin-muted">{order.phone}</span>
                    ) : null}
                  </Td>
                  <Td className="whitespace-nowrap text-admin-muted">
                    {formatDate(order.required_date)}
                  </Td>
                  <Td className="whitespace-nowrap tabular-nums">
                    {formatCurrency(order.total_amount)}
                  </Td>
                  <Td className="whitespace-nowrap tabular-nums">
                    {balance > 0 ? (
                      <span className="font-semibold text-warning">
                        {formatCurrency(balance)}
                      </span>
                    ) : (
                      <span className="text-success">Paid</span>
                    )}
                  </Td>
                  <Td>
                    <OrderStatusBadge status={order.status} />
                  </Td>
                  <Td>
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="whitespace-nowrap text-xs font-semibold text-admin-accent hover:underline"
                    >
                      Open
                    </Link>
                  </Td>
                </tr>
              );
            })}
          </AdminTable>

          <div className="px-4 pb-4">
            <Pagination
              page={page}
              pageCount={pageCount}
              basePath="/admin/orders"
              searchParams={{
                status: status !== "all" ? status : undefined,
                search: params.search,
              }}
            />
          </div>
        </Card>
      )}
    </>
  );
}
