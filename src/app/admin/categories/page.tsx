import { CategoriesManager } from "@/components/admin/categories-manager";
import { PageHeader } from "@/components/ui/primitives";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getAdminCategories, getAdminMedia } from "@/lib/data/admin";

export const dynamic = "force-dynamic";

export const metadata = { title: "Categories" };

export default async function CategoriesPage() {
  const { supabase } = await requireAdmin();

  const [categories, media] = await Promise.all([
    getAdminCategories(supabase),
    getAdminMedia(supabase, { page: 1 }),
  ]);

  return (
    <>
      <PageHeader
        title="Categories"
        description="How your treats are grouped on the website."
      />
      <CategoriesManager categories={categories} assets={media.rows} />
    </>
  );
}
