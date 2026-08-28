import { SettingsEditor } from "@/components/admin/settings-editor";
import { AdminTable, Td } from "@/components/admin/admin-ui";
import { Card, PageHeader } from "@/components/ui/primitives";
import { settingsDefaults } from "@/config/content-defaults";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getActivityLog, getAdminMedia, getSettingRows } from "@/lib/data/admin";
import { formatDateTime } from "@/lib/utils";
import type { SiteSettingKey, SiteSettingsMap } from "@/types/domain";

export const dynamic = "force-dynamic";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const { supabase, role, user } = await requireAdmin();

  const [rows, media, activity] = await Promise.all([
    getSettingRows(supabase),
    getAdminMedia(supabase, { page: 1 }),
    getActivityLog(supabase, 15),
  ]);

  // Merge stored values over the typed defaults so a partially configured
  // install still renders a complete form.
  const merged: Record<string, unknown> = { ...settingsDefaults };
  for (const row of rows) {
    const key = row.setting_key as SiteSettingKey;
    if (!(key in settingsDefaults)) continue;
    const stored = row.setting_value;
    merged[key] =
      stored && typeof stored === "object" && !Array.isArray(stored)
        ? { ...(settingsDefaults[key] as Record<string, unknown>), ...stored }
        : settingsDefaults[key];
  }

  return (
    <>
      <PageHeader
        title="Settings"
        description="Your bakery details, enquiry destinations and search defaults."
      />

      <SettingsEditor settings={merged as SiteSettingsMap} assets={media.rows} />

      <Card className="flex flex-col gap-3">
        <h2 className="font-sans text-base font-bold text-admin-ink">Your account</h2>
        <p className="text-sm text-admin-muted">
          Signed in as <span className="font-medium text-admin-ink">{user.email}</span> ({role}).
        </p>
        <p className="text-xs text-admin-muted">
          To add another person to the dashboard, create them in Supabase Auth and add a row to
          the <code className="rounded bg-admin-bg px-1">admin_users</code> table. Only an owner
          can do this.
        </p>
      </Card>

      {activity.length > 0 ? (
        <Card className="flex flex-col gap-3 p-0">
          <h2 className="px-5 pt-5 font-sans text-base font-bold text-admin-ink">
            Recent activity
          </h2>
          <AdminTable headers={["When", "Action", "Item"]} caption="Recent admin activity">
            {activity.map((entry) => (
              <tr key={entry.id}>
                <Td className="whitespace-nowrap text-admin-muted">
                  {formatDateTime(entry.created_at)}
                </Td>
                <Td className="font-mono text-xs">{entry.action}</Td>
                <Td className="text-admin-muted">{entry.entity_type ?? "-"}</Td>
              </tr>
            ))}
          </AdminTable>
          <div className="pb-4" />
        </Card>
      ) : null}
    </>
  );
}
