import { ContentEditor, type ContentBlock } from "@/components/admin/content-editor";
import { Card, PageHeader } from "@/components/ui/primitives";
import { contentBlockLabels, contentDefaults } from "@/config/content-defaults";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getAdminMedia, getContentRows } from "@/lib/data/admin";
import type { SiteContentKey } from "@/types/domain";

export const dynamic = "force-dynamic";

export const metadata = { title: "Website Content" };

export default async function ContentPage() {
  const { supabase } = await requireAdmin();

  const [rows, media] = await Promise.all([
    getContentRows(supabase),
    getAdminMedia(supabase, { page: 1 }),
  ]);

  const stored = new Map(rows.map((row) => [row.content_key, row.content]));

  // Defaults drive the field list so a newly added field appears in the editor
  // even before anyone has saved a value for it.
  const blocks: ContentBlock[] = (Object.keys(contentDefaults) as SiteContentKey[]).map((key) => {
    const defaults = contentDefaults[key] as Record<string, unknown>;
    const saved = stored.get(key);
    const value =
      saved && typeof saved === "object" && !Array.isArray(saved)
        ? { ...defaults, ...(saved as Record<string, unknown>) }
        : defaults;

    return {
      key,
      title: contentBlockLabels[key].title,
      description: contentBlockLabels[key].description,
      value,
    };
  });

  return (
    <>
      <PageHeader
        title="Website content"
        description="Edit the words on your website. Changes go live as soon as you publish."
      />

      <Card className="border-info/25 bg-info-bg">
        <p className="text-sm text-info">
          Each section below matches a part of the site. Open one, change the text, and press
          Publish. No code involved.
        </p>
      </Card>

      <ContentEditor blocks={blocks} assets={media.rows} />
    </>
  );
}
