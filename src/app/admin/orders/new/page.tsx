import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { OrderForm } from "@/components/admin/order-form";
import { Card, PageHeader } from "@/components/ui/primitives";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getEnquiry, getProductOptions } from "@/lib/data/admin";

export const dynamic = "force-dynamic";

export const metadata = { title: "New order" };

export default async function NewOrderPage({
  searchParams,
}: {
  searchParams: Promise<{ enquiry?: string }>;
}) {
  const { supabase } = await requireAdmin();
  const { enquiry: enquiryId } = await searchParams;

  const [enquiry, products] = await Promise.all([
    enquiryId ? getEnquiry(supabase, enquiryId) : Promise.resolve(null),
    getProductOptions(supabase),
  ]);

  return (
    <>
      <Link
        href={enquiry ? `/admin/enquiries/${enquiry.id}` : "/admin/orders"}
        className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-admin-muted transition-colors duration-200 hover:text-admin-ink"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        {enquiry ? "Back to enquiry" : "Back to orders"}
      </Link>

      <PageHeader
        title={enquiry ? "Convert enquiry to order" : "New order"}
        description={
          enquiry
            ? "Details from the enquiry are filled in. Add pricing and confirm."
            : "Create an order directly, without an enquiry."
        }
      />

      {enquiryId && !enquiry ? (
        <Card>
          <p className="text-sm text-danger">
            That enquiry could not be found. You can still create the order manually below.
          </p>
        </Card>
      ) : null}

      <OrderForm
        enquiry={enquiry}
        products={products.map((product) => ({
          id: product.id,
          name: product.name,
          sku: product.sku,
          starting_price: product.starting_price,
        }))}
      />
    </>
  );
}
