"use client";

import { useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Clapperboard,
  ClipboardList,
  Cookie,
  ExternalLink,
  FileText,
  Gift,
  Images,
  LayoutDashboard,
  LayoutGrid,
  LogOut,
  Menu,
  MessageSquare,
  Quote,
  Settings,
  Sun,
  X,
  type LucideIcon,
} from "lucide-react";

import { adminNavItems } from "@/config/site";
import { signOutAction } from "@/app/actions/auth";
import { cn } from "@/lib/utils";

/**
 * Dashboard chrome.
 *
 * Visually distinct from the public site on purpose — cool neutrals, tighter
 * type, no serif display face — so the baker always knows whether she is
 * looking at the shop window or the back office.
 */

const icons: Record<string, LucideIcon> = {
  LayoutDashboard,
  MessageSquare,
  ClipboardList,
  Cookie,
  LayoutGrid,
  Sun,
  Clapperboard,
  Gift,
  Quote,
  FileText,
  Images,
  BarChart3,
  Settings,
};

export function AdminShell({
  children,
  fullName,
  email,
}: {
  children: ReactNode;
  fullName: string | null;
  email: string;
}) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Close the drawer on navigation so it never covers the page it opened.
  // Derived during render — an effect would show the drawer over the new page
  // for a frame first.
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setSidebarOpen(false);
  }

  const nav = (
    <nav aria-label="Dashboard" className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-3">
      {adminNavItems.map((item) => {
        const Icon = icons[item.icon] ?? LayoutDashboard;
        // Exact match for the dashboard root, prefix match for the rest, so
        // /admin/orders/123 still highlights "Orders".
        const active =
          item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-200",
              active
                ? "bg-admin-accent text-white"
                : "text-admin-muted hover:bg-admin-bg hover:text-admin-ink",
            )}
          >
            <Icon className="size-4 shrink-0" aria-hidden="true" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  const sidebarFooter = (
    <div className="flex flex-col gap-2 border-t border-admin-line p-3">
      <Link
        href="/"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-admin-muted transition-colors duration-200 hover:bg-admin-bg hover:text-admin-ink"
      >
        <ExternalLink className="size-4 shrink-0" aria-hidden="true" />
        View website
      </Link>

      <div className="rounded-lg bg-admin-bg px-3 py-2.5">
        <p className="truncate text-sm font-semibold text-admin-ink">{fullName ?? "Signed in"}</p>
        <p className="truncate text-xs text-admin-muted">{email}</p>
      </div>

      <form action={signOutAction}>
        <button
          type="submit"
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-admin-muted transition-colors duration-200 hover:bg-danger-bg hover:text-danger"
        >
          <LogOut className="size-4 shrink-0" aria-hidden="true" />
          Sign out
        </button>
      </form>
    </div>
  );

  return (
    <div className="min-h-dvh bg-admin-bg">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-admin-line bg-admin-surface lg:flex">
        <div className="flex h-16 items-center gap-2.5 border-b border-admin-line px-5">
          <Link href="/admin" className="flex items-center gap-2.5">
            <span className="relative size-8 shrink-0 overflow-hidden rounded-full">
              <Image src="/brand/logo.png" alt="" fill sizes="32px" className="object-cover" />
            </span>
            <span className="font-display text-xl text-cocoa">Magic T-treats</span>
          </Link>
        </div>
        {nav}
        {sidebarFooter}
      </aside>

      {/* Mobile drawer */}
      {sidebarOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-admin-ink/40"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
          <aside
            className="absolute inset-y-0 left-0 flex w-72 flex-col bg-admin-surface shadow-xl"
            role="dialog"
            aria-label="Dashboard menu"
            aria-modal="true"
          >
            <div className="flex h-16 items-center justify-between border-b border-admin-line px-5">
              <span className="flex items-center gap-2.5">
                <span className="relative size-8 shrink-0 overflow-hidden rounded-full">
              <Image src="/brand/logo.png" alt="" fill sizes="32px" className="object-cover" />
            </span>
                <span className="font-display text-xl text-cocoa">Magic T-treats</span>
              </span>
              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                aria-label="Close menu"
                className="grid size-9 place-items-center rounded-lg text-admin-muted hover:bg-admin-bg"
              >
                <X className="size-5" aria-hidden="true" />
              </button>
            </div>
            {nav}
            {sidebarFooter}
          </aside>
        </div>
      ) : null}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-admin-line bg-admin-surface/90 px-4 backdrop-blur-sm lg:px-8">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
            className="grid size-10 place-items-center rounded-lg text-admin-muted hover:bg-admin-bg lg:hidden"
          >
            <Menu className="size-5" aria-hidden="true" />
          </button>

          <span className="flex items-center gap-2 lg:hidden">
            <span className="relative size-7 shrink-0 overflow-hidden rounded-full">
              <Image src="/brand/logo.png" alt="" fill sizes="28px" className="object-cover" />
            </span>
            <span className="font-display text-lg text-cocoa">Magic T-treats</span>
          </span>

          <div className="ml-auto flex items-center gap-2">
            <Link
              href="/admin/enquiries"
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-admin-muted transition-colors duration-200 hover:bg-admin-bg hover:text-admin-ink"
            >
              Enquiries
            </Link>
            <Link
              href="/admin/products/new"
              className="rounded-lg bg-admin-accent px-3.5 py-1.5 text-sm font-semibold text-white transition-opacity duration-200 hover:opacity-90"
            >
              + Product
            </Link>
          </div>
        </header>

        <main className="p-4 lg:p-8">
          <div className="mx-auto flex max-w-6xl flex-col gap-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
