import type { Metadata } from "next";
import type { ReactNode } from "react";

import { AdminShell } from "@/components/admin/admin-shell";
import { requireAdmin } from "@/lib/auth/require-admin";

export const metadata: Metadata = {
  title: { default: "Dashboard", template: "%s | Magic T-treats Dashboard" },
  // Belt and braces alongside robots.txt: the dashboard must never be indexed.
  robots: { index: false, follow: false, nocache: true },
};

/**
 * Every /admin route renders through here, and this is where authorisation
 * actually happens. The proxy redirect is only a fast path; a layout guard
 * cannot be skipped by navigating directly to a nested route.
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await requireAdmin();

  return (
    <AdminShell fullName={session.fullName} email={session.user.email ?? ""}>
      {children}
    </AdminShell>
  );
}
