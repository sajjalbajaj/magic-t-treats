import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { DefinitionList } from "@/components/admin/admin-ui";
import { ActionButton } from "@/components/admin/action-controls";
import { Card, EnquiryStatusBadge, PageHeader } from "@/components/ui/primitives";
import { ButtonLink } from "@/components/ui/button";
import { updateEnquiryStatusAction } from "@/app/actions/leads";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getEnquiry } from "@/lib/data/admin";
import { formatDate, formatDateTime, titleCase } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = { title: "Enquiry" };

export default async function EnquiryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { supabase } = await requireAdmin();
  const { id } = await params;

  const enquiry = await getEnquiry(supabase, id);
  if (!enquiry) notFound();

  const alreadyConverted = enquiry.status === "converted";

  return (
    <>
      <Link
        href="/admin/enquiries"
        className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-admin-muted transition-colors duration-200 hover:text-admin-ink"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to enquiries
      </Link>

      <PageHeader
        title={enquiry.customer_name ?? "Enquiry"}
        description={`Received ${formatDateTime(enquiry.created_at)}`}
        action={<EnquiryStatusBadge status={enquiry.status} />}
      />

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-5">
          <Card className="flex flex-col gap-4">
            <h2 className="font-sans text-base font-bold text-admin-ink">Enquiry details</h2>
            <DefinitionList
              items={[
                { label: "Product", value: enquiry.product_name ?? "General enquiry" },
                { label: "Product code", value: enquiry.product_sku ?? "-" },
                { label: "Quantity", value: enquiry.quantity ?? "-" },
                { label: "Required date", value: formatDate(enquiry.required_date) },
                {
                  label: "Delivery / pickup",
                  value: enquiry.fulfilment_type ? titleCase(enquiry.fulfilment_type) : "-",
                },
                { label: "Customization", value: enquiry.customization ?? "-" },
              ]}
            />

            {enquiry.message ? (
              <div className="flex flex-col gap-1.5 border-t border-admin-line pt-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-admin-muted">
                  Message
                </p>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-admin-ink">
                  {enquiry.message}
                </p>
              </div>
            ) : null}
          </Card>

          <Card className="flex flex-col gap-4">
            <h2 className="font-sans text-base font-bold text-admin-ink">Contact</h2>
            <DefinitionList
              items={[
                { label: "Name", value: enquiry.customer_name ?? "Not given" },
                {
                  label: "Phone",
                  value: enquiry.phone ? (
                    <a
                      href={`tel:${enquiry.phone.replace(/\s/g, "")}`}
                      className="text-admin-accent hover:underline"
                    >
                      {enquiry.phone}
                    </a>
                  ) : (
                    "Not given"
                  ),
                },
                {
                  label: "Email",
                  value: enquiry.email ? (
                    <a
                      href={`mailto:${enquiry.email}`}
                      className="text-admin-accent hover:underline"
                    >
                      {enquiry.email}
                    </a>
                  ) : (
                    "Not given"
                  ),
                },
              ]}
            />
          </Card>

          <Card className="flex flex-col gap-4">
            <h2 className="font-sans text-base font-bold text-admin-ink">Where they came from</h2>
            <DefinitionList
              items={[
                { label: "Source", value: enquiry.utm_source ?? "direct" },
                { label: "Medium", value: enquiry.utm_medium ?? "-" },
                { label: "Campaign", value: enquiry.utm_campaign ?? "-" },
                { label: "Device", value: enquiry.device_type ?? "-" },
                { label: "Form", value: titleCase(enquiry.source) },
                {
                  label: "Referrer",
                  value: enquiry.referrer ? (
                    <span className="break-all text-xs">{enquiry.referrer}</span>
                  ) : (
                    "-"
                  ),
                },
              ]}
            />
          </Card>
        </div>

        <aside className="flex flex-col gap-3">
          <Card className="flex flex-col gap-3">
            <h2 className="font-sans text-base font-bold text-admin-ink">Next step</h2>

            {alreadyConverted ? (
              <p className="text-sm text-admin-muted">
                This enquiry has already been converted into an order.
              </p>
            ) : (
              <ButtonLink
                href={`/admin/orders/new?enquiry=${enquiry.id}`}
                variant="admin"
                className="w-full"
              >
                Convert to order
              </ButtonLink>
            )}

            <div className="flex flex-col gap-2 border-t border-admin-line pt-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-admin-muted">
                Change status
              </p>

              {enquiry.status !== "contacted" ? (
                <ActionButton
                  variant="adminGhost"
                  className="w-full"
                  action={updateEnquiryStatusAction.bind(null, enquiry.id, "contacted")}
                  successMessage="Marked as contacted."
                >
                  Mark contacted
                </ActionButton>
              ) : null}

              {enquiry.status !== "closed" ? (
                <ActionButton
                  variant="adminGhost"
                  className="w-full"
                  action={updateEnquiryStatusAction.bind(null, enquiry.id, "closed")}
                  successMessage="Enquiry closed."
                >
                  Close enquiry
                </ActionButton>
              ) : null}

              {enquiry.status !== "new" ? (
                <ActionButton
                  variant="adminGhost"
                  className="w-full"
                  action={updateEnquiryStatusAction.bind(null, enquiry.id, "new")}
                  successMessage="Moved back to new."
                >
                  Reopen as new
                </ActionButton>
              ) : null}

              {enquiry.status !== "spam" ? (
                <ActionButton
                  variant="adminGhost"
                  className="w-full text-danger"
                  action={updateEnquiryStatusAction.bind(null, enquiry.id, "spam")}
                  successMessage="Marked as spam."
                  confirm="Mark this enquiry as spam? It will be excluded from your reports."
                  confirmTitle="Mark as spam"
                  confirmLabel="Mark as spam"
                >
                  Mark as spam
                </ActionButton>
              ) : null}
            </div>
          </Card>
        </aside>
      </div>
    </>
  );
}
