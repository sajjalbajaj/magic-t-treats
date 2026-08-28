import { FilterTabs } from "@/components/admin/admin-ui";
import { MediaManager } from "@/components/admin/media-manager";
import { PageHeader, Pagination } from "@/components/ui/primitives";
import { mediaFolders } from "@/config/site";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getAdminMedia } from "@/lib/data/admin";

export const dynamic = "force-dynamic";

export const metadata = { title: "Media Library" };

export default async function MediaPage({
  searchParams,
}: {
  searchParams: Promise<{ folder?: string; page?: string }>;
}) {
  const { supabase } = await requireAdmin();
  const params = await searchParams;

  const page = Number(params.page ?? "1") || 1;
  const folder = params.folder ?? "all";

  const { rows, total, pageCount } = await getAdminMedia(supabase, { page, folder });

  return (
    <>
      <PageHeader
        title="Media library"
        description={`${total} file${total === 1 ? "" : "s"}. Upload once, reuse anywhere.`}
      />

      <FilterTabs
        options={[
          { label: "All", value: "all" },
          ...mediaFolders.map((name) => ({ label: name, value: name })),
        ]}
        active={folder}
        basePath="/admin/media"
        paramName="folder"
      />

      <MediaManager assets={rows} />

      <Pagination
        page={page}
        pageCount={pageCount}
        basePath="/admin/media"
        searchParams={{ folder: folder !== "all" ? folder : undefined }}
      />
    </>
  );
}
