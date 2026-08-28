import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";

import { ProductForm } from "@/components/admin/product-form";
import { ProductMediaManager } from "@/components/admin/product-media-manager";
import { Card, PageHeader } from "@/components/ui/primitives";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getAdminCategories, getAdminMedia, getAdminProduct } from "@/lib/data/admin";

export const dynamic = "force-dynamic";

export const metadata = { title: "Edit product" };

export default async function EditProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  const { supabase } = await requireAdmin();
  const [{ id }, { created }] = await Promise.all([params, searchParams]);

  const [product, categories, media] = await Promise.all([
    getAdminProduct(supabase, id),
    getAdminCategories(supabase),
    getAdminMedia(supabase, { page: 1 }),
  ]);

  if (!product) notFound();

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
        title={product.name}
        description={product.sku}
        action={
          product.is_active ? (
            <Link
              href={`/products/${product.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-admin-line bg-admin-surface px-3 py-2 text-sm font-medium text-admin-ink transition-colors duration-200 hover:bg-admin-bg"
            >
              <ExternalLink className="size-4" aria-hidden="true" />
              View on site
            </Link>
          ) : undefined
        }
      />

      {created ? (
        <Card className="border-success/30 bg-success-bg">
          <p className="text-sm font-medium text-success">
            Product created. Add a photo below so it looks its best on the website.
          </p>
        </Card>
      ) : null}

      <ProductMediaManager productId={product.id} media={product.media} assets={media.rows} />

      <ProductForm product={product} categories={categories} />
    </>
  );
}
