import Link from "next/link";
import { MessageSquare } from "lucide-react";

import { AdminTable, FilterTabs, SearchForm, Td } from "@/components/admin/admin-ui";
import {
  Card,
  EmptyState,
  EnquiryStatusBadge,
  PageHeader,
  Pagination,
} from "@/components/ui/primitives";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getEnquiries } from "@/lib/data/admin";
import { formatRelativeDay } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = { title: "Enquiries" };

const STATUS_OPTIONS = [
  { label: "All", value: "all" },
  { label: "New", value: "new" },
  { label: "Contacted", value: "contacted" },
  { label: "Converted", value: "converted" },
  { label: "Closed", value: "closed" },
  { label: "Spam", value: "spam" },
];

export default async function EnquiriesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; search?: string; page?: string }>;
}) {
  const { supabase } = await requireAdmin();
  const params = await searchParams;

  const page = Number(params.page ?? "1") || 1;
  const status = params.status ?? "all";

  const { rows, total, pageCount } = await getEnquiries(supabase, {
    page,
    status,
    search: params.search,
  });

  return (
    <>
      <PageHeader
        title="Enquiries"
        description={`${total} enquir${total === 1 ? "y" : "ies"} matching this view.`}
      />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <FilterTabs
          options={STATUS_OPTIONS}
          active={status}
          basePath="/admin/enquiries"
          extraParams={{ search: params.search }}
        />
        <SearchForm
          action="/admin/enquiries"
          defaultValue={params.search}
          placeholder="Search name, product or phone"
          hiddenFields={{ status: status !== "all" ? status : undefined }}
        />
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title="No enquiries here"
          description={
            params.search
              ? "Nothing matched that search. Try a different name or product."
              : "When someone sends an enquiry from the website, it will land here."
          }
          icon={<MessageSquare className="size-6" aria-hidden="true" />}
        />
      ) : (
        <Card className="flex flex-col gap-4 p-0">
          <AdminTable
            headers={["Name", "Product", "Needed", "Source", "Received", "Status", ""]}
            caption="Enquiries"
          >
            {rows.map((enquiry) => (
              <tr key={enquiry.id} className="hover:bg-admin-bg/50">
                <Td className="font-medium">
                  {enquiry.customer_name ?? <span className="text-admin-muted">Not given</span>}
                  {enquiry.phone ? (
                    <span className="block text-xs text-admin-muted">{enquiry.phone}</span>
                  ) : null}
                </Td>
                <Td>
                  {enquiry.product_name ?? "General"}
                  {enquiry.product_sku ? (
                    <span className="block text-xs text-admin-muted">{enquiry.product_sku}</span>
                  ) : null}
                </Td>
                <Td className="text-admin-muted">{enquiry.quantity ?? "-"}</Td>
                <Td className="capitalize text-admin-muted">{enquiry.utm_source ?? "direct"}</Td>
                <Td className="whitespace-nowrap text-admin-muted">
                  {formatRelativeDay(enquiry.created_at)}
                </Td>
                <Td>
                  <EnquiryStatusBadge status={enquiry.status} />
                </Td>
                <Td>
                  <Link
                    href={`/admin/enquiries/${enquiry.id}`}
                    className="whitespace-nowrap text-xs font-semibold text-admin-accent hover:underline"
                  >
                    Open
                  </Link>
                </Td>
              </tr>
            ))}
          </AdminTable>

          <div className="px-4 pb-4">
            <Pagination
              page={page}
              pageCount={pageCount}
              basePath="/admin/enquiries"
              searchParams={{ status: status !== "all" ? status : undefined, search: params.search }}
            />
          </div>
        </Card>
      )}
    </>
  );
}
