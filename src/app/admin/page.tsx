import Link from "next/link";
import {
  BarChart3,
  Clapperboard,
  ClipboardList,
  Cookie,
  Gift,
  IndianRupee,
  MessageSquare,
  Quote,
  Sun,
  TrendingUp,
} from "lucide-react";

import { AdminTable, BarList, MetricCard, Td } from "@/components/admin/admin-ui";
import {
  Card,
  EmptyState,
  EnquiryStatusBadge,
  OrderStatusBadge,
  PageHeader,
} from "@/components/ui/primitives";
import { requireAdmin } from "@/lib/auth/require-admin";
import {
  getDashboardKpis,
  getMostEnquired,
  getOrdersDueToday,
  getRecentEnquiries,
} from "@/lib/data/admin";
import { formatCurrency, formatRelativeDay } from "@/lib/utils";

export const dynamic = "force-dynamic";

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default async function AdminDashboardPage() {
  const { supabase, fullName } = await requireAdmin();

  const [kpis, dueToday, recentEnquiries, mostEnquired] = await Promise.all([
    getDashboardKpis(supabase),
    getOrdersDueToday(supabase),
    getRecentEnquiries(supabase, 6),
    getMostEnquired(supabase, 30, 5),
  ]);

  const firstName = fullName?.split(" ")[0];

  return (
    <>
      <PageHeader
        title={`${greeting()}${firstName ? `, ${firstName}` : ""}`}
        description="Here's what's happening with your bakery."
      />

      {kpis ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <MetricCard
            label="New enquiries"
            value={kpis.new_enquiries}
            icon={MessageSquare}
            href="/admin/enquiries"
            tone={kpis.new_enquiries > 0 ? "attention" : "default"}
            hint={kpis.new_enquiries > 0 ? "Waiting for a reply" : "All caught up"}
          />
          <MetricCard
            label="Active orders"
            value={kpis.active_orders}
            icon={ClipboardList}
            href="/admin/orders"
            hint={`${kpis.orders_due_today} due today`}
          />
          <MetricCard
            label="Revenue this month"
            value={formatCurrency(kpis.monthly_revenue)}
            icon={IndianRupee}
            href="/admin/analytics"
            hint={`${kpis.monthly_orders} orders`}
          />
          <MetricCard
            label="Conversion"
            value={`${kpis.conversion_rate}%`}
            icon={TrendingUp}
            href="/admin/analytics"
            hint="Enquiries that became orders"
          />
          <MetricCard
            label="Active products"
            value={kpis.active_products}
            icon={Cookie}
            href="/admin/products"
          />
          <MetricCard
            label="Available today"
            value={kpis.available_today}
            icon={Sun}
            href="/admin/available-today"
            hint={kpis.available_today === 0 ? "Section hidden on site" : "Showing on homepage"}
          />
          <MetricCard
            label="Published posts"
            value={kpis.published_posts}
            icon={Clapperboard}
            href="/admin/posts"
          />
          <MetricCard
            label="Orders due today"
            value={kpis.orders_due_today}
            icon={ClipboardList}
            href="/admin/orders"
            tone={kpis.orders_due_today > 0 ? "attention" : "default"}
          />
        </div>
      ) : (
        <Card>
          <p className="text-sm text-admin-muted">
            Could not load your numbers just now. Refresh the page to try again.
          </p>
        </Card>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-sans text-base font-bold text-admin-ink">Orders due today</h2>
            <Link
              href="/admin/orders"
              className="text-xs font-semibold text-admin-accent hover:underline"
            >
              View all
            </Link>
          </div>

          {dueToday.length === 0 ? (
            <p className="py-6 text-center text-sm text-admin-muted">
              Nothing due today. Enjoy the quiet.
            </p>
          ) : (
            <ul className="flex flex-col divide-y divide-admin-line">
              {dueToday.map((order) => (
                <li key={order.id}>
                  <Link
                    href={`/admin/orders/${order.id}`}
                    className="flex items-center justify-between gap-3 py-2.5 transition-opacity duration-200 hover:opacity-75"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-admin-ink">
                        {order.customer_name}
                      </p>
                      <p className="truncate text-xs text-admin-muted">
                        {order.order_number} · {formatCurrency(order.total_amount)}
                      </p>
                    </div>
                    <OrderStatusBadge status={order.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-sans text-base font-bold text-admin-ink">
              Most enquired (30 days)
            </h2>
            <Link
              href="/admin/analytics"
              className="text-xs font-semibold text-admin-accent hover:underline"
            >
              Analytics
            </Link>
          </div>

          <BarList
            items={mostEnquired.map((row) => ({
              label: row.product_name,
              value: Number(row.enquiry_count),
            }))}
            emptyLabel="No enquiries in the last 30 days yet."
          />
        </Card>
      </div>

      <Card className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-sans text-base font-bold text-admin-ink">Recent enquiries</h2>
          <Link
            href="/admin/enquiries"
            className="text-xs font-semibold text-admin-accent hover:underline"
          >
            View all
          </Link>
        </div>

        {recentEnquiries.length === 0 ? (
          <EmptyState
            title="No enquiries yet"
            description="When someone sends an enquiry from the website, it will appear here."
            icon={<MessageSquare className="size-6" aria-hidden="true" />}
          />
        ) : (
          <AdminTable
            headers={["Name", "Product", "Source", "Received", "Status", ""]}
            caption="Recent enquiries"
          >
            {recentEnquiries.map((enquiry) => (
              <tr key={enquiry.id} className="hover:bg-admin-bg/50">
                <Td className="font-medium">{enquiry.customer_name ?? "Not given"}</Td>
                <Td>{enquiry.product_name ?? "General"}</Td>
                <Td className="capitalize text-admin-muted">{enquiry.utm_source ?? "direct"}</Td>
                <Td className="text-admin-muted">{formatRelativeDay(enquiry.created_at)}</Td>
                <Td>
                  <EnquiryStatusBadge status={enquiry.status} />
                </Td>
                <Td>
                  <Link
                    href={`/admin/enquiries/${enquiry.id}`}
                    className="text-xs font-semibold text-admin-accent hover:underline"
                  >
                    Open
                  </Link>
                </Td>
              </tr>
            ))}
          </AdminTable>
        )}
      </Card>

      <Card className="flex flex-col gap-3">
        <h2 className="font-sans text-base font-bold text-admin-ink">Quick actions</h2>
        <div className="flex flex-wrap gap-2">
          <QuickAction href="/admin/products/new" icon={Cookie} label="Add product" />
          <QuickAction href="/admin/posts" icon={Clapperboard} label="Add post" />
          <QuickAction href="/admin/available-today" icon={Sun} label="Today's kitchen" />
          <QuickAction href="/admin/content" icon={BarChart3} label="Edit homepage" />
          <QuickAction href="/admin/collections" icon={Gift} label="Festive collection" />
          <QuickAction href="/admin/testimonials" icon={Quote} label="Add testimonial" />
        </div>
      </Card>
    </>
  );
}

function QuickAction({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: typeof Cookie;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 rounded-lg border border-admin-line bg-admin-surface px-3.5 py-2 text-sm font-medium text-admin-ink transition-colors duration-200 hover:bg-admin-bg"
    >
      <Icon className="size-4 text-admin-muted" aria-hidden="true" />
      {label}
    </Link>
  );
}
