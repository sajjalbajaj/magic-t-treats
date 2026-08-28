import { CollectionsManager } from "@/components/admin/collections-manager";
import { PageHeader } from "@/components/ui/primitives";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getAdminCollections, getAdminMedia, getProductOptions } from "@/lib/data/admin";

export const dynamic = "force-dynamic";

export const metadata = { title: "Festive Collections" };

export default async function CollectionsPage() {
  const { supabase } = await requireAdmin();

  const [collections, products, media] = await Promise.all([
    getAdminCollections(supabase),
    getProductOptions(supabase),
    getAdminMedia(supabase, { page: 1 }),
  ]);

  return (
    <>
      <PageHeader
        title="Festive collections"
        description="Seasonal sets of treats: Rakhi, Diwali, corporate gifting and more."
      />
      <CollectionsManager
        collections={collections}
        products={products.map((product) => ({
          id: product.id,
          name: product.name,
          sku: product.sku,
        }))}
        assets={media.rows}
      />
    </>
  );
}
