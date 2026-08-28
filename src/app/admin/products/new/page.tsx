import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { ProductForm } from "@/components/admin/product-form";
import { PageHeader } from "@/components/ui/primitives";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getAdminCategories } from "@/lib/data/admin";

export const dynamic = "force-dynamic";

export const metadata = { title: "New product" };

export default async function NewProductPage() {
  const { supabase } = await requireAdmin();
  const categories = await getAdminCategories(supabase);

  return (
    <>
      <Link
        href="/admin/products"
        className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-admin-muted transition-colors duration-200 hover:text-admin-ink"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to products
      </Link>

      <PageHeader
        title="Add a product"
        description="Save the basics first. You can add photos on the next screen."
      />

      <ProductForm product={null} categories={categories} />
    </>
  );
}
