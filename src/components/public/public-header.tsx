"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Search, X } from "lucide-react";

import { InstagramIcon } from "@/components/ui/brand-icons";
import { BrandMark } from "@/components/public/brand-mark";
import { NavigationBite } from "@/components/public/navigation-bite";
import { Button } from "@/components/ui/button";
import { publicNavItems } from "@/config/site";
import { trackEvent } from "@/lib/analytics/track-event";
import { useProductDialogs } from "@/components/product/product-dialogs";
import { cn } from "@/lib/utils";

/**
 * Sticky site header: brand left, navigation right, actions at the end.
 *
 * The large brand statement lives on the hero — the badge turning on the arch
 * — so the header carries a compact lockup instead of competing with it.
 *
 * The active link is matched by prefix for real routes, but hash links
 * (`/#treats`) are never marked active: they all share the "/" pathname, so
 * prefix-matching would light up every one of them on the homepage.
 */
export function PublicHeader({
  bakeryName,
  instagramUrl,
  logoUrl,
}: {
  bakeryName: string;
  instagramUrl: string;
  logoUrl: string | null;
}) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const { openEnquiry } = useProductDialogs();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close the menu on navigation. Derived during render rather than in an
  // effect: setting state from an effect here would render the stale open menu
  // for a frame before closing it.
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setMenuOpen(false);
  }

  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  const isActive = (href: string) => {
    if (href.includes("#")) return false;
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[70] focus:rounded-full focus:bg-cocoa focus:px-5 focus:py-2.5 focus:text-sm focus:font-semibold focus:text-cream"
      >
        Skip to content
      </a>

      <header
        className={cn(
          "sticky top-0 z-40 w-full transition-all duration-300 ease-(--ease-gentle)",
          scrolled
            ? "border-b border-line bg-cream/92 backdrop-blur-md"
            : "border-b border-transparent bg-cream",
        )}
      >
        <div
          className={cn(
            "container-page flex items-center justify-between gap-4 transition-[height] duration-300",
            scrolled ? "h-16" : "h-20",
          )}
        >
          {/* Brand lockup */}
          <Link
            href="/"
            aria-label={`${bakeryName} home page`}
            className="group flex shrink-0 items-center gap-2.5"
          >
            {logoUrl ? (
              <span className="transition-transform duration-300 ease-(--ease-gentle) group-hover:scale-105">
                <BrandMark src={logoUrl} alt="" size={scrolled ? 40 : 48} animateOnLoad />
              </span>
            ) : null}
            <span className="flex flex-col leading-none">
              <span className="font-display text-xl tracking-tight text-cocoa sm:text-2xl">
                {bakeryName}
              </span>
              <span className="mt-0.5 hidden text-[10px] font-semibold uppercase tracking-[0.16em] text-accent sm:block">
                Homemade
              </span>
            </span>
          </Link>

          {/* Navigation */}
          <nav aria-label="Main" className="hidden items-center gap-8 lg:flex">
            {publicNavItems.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "group relative text-sm font-medium transition-colors duration-200",
                    active ? "text-accent" : "text-ink-muted hover:text-cocoa",
                  )}
                >
                  {item.label}
                  <span
                    className={cn(
                      "absolute -bottom-1.5 left-1/2 h-px -translate-x-1/2 bg-accent transition-all duration-300",
                      active ? "w-full" : "w-0 group-hover:w-full",
                    )}
                  />
                  <NavigationBite />
                </Link>
              );
            })}
          </nav>

          {/* Actions */}
          <div className="flex shrink-0 items-center gap-1.5">
            <Link
              href="/gallery"
              aria-label="Browse the gallery"
              className="grid size-10 place-items-center rounded-full text-cocoa transition-colors duration-200 hover:bg-blush/60 hover:text-accent"
            >
              <Search className="size-4.5" aria-hidden="true" />
            </Link>

            {instagramUrl ? (
              <a
                href={instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackEvent("instagram_opened", { cta_location: "header" })}
                aria-label={`${bakeryName} on Instagram`}
                className="grid size-10 place-items-center rounded-full text-cocoa transition-colors duration-200 hover:bg-blush/60 hover:text-accent"
              >
                <InstagramIcon className="size-4.5" aria-hidden="true" />
              </a>
            ) : null}

            <Button
              size="sm"
              className="ml-1 hidden sm:inline-flex"
              onClick={() => openEnquiry(null, "header")}
            >
              Order Now
            </Button>

            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-expanded={menuOpen}
              aria-controls="mobile-nav"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              className="grid size-10 place-items-center rounded-full text-cocoa transition-colors duration-200 hover:bg-blush/60 lg:hidden"
            >
              {menuOpen ? (
                <X className="size-5" aria-hidden="true" />
              ) : (
                <Menu className="size-5" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>

        <div
          id="mobile-nav"
          hidden={!menuOpen}
          className="border-t border-line bg-cream lg:hidden"
        >
          <nav aria-label="Mobile" className="container-page flex flex-col py-3">
            {publicNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-lg px-2 py-3 text-base font-medium text-cocoa transition-colors duration-200 hover:bg-blush/50"
              >
                {item.label}
                <NavigationBite />
              </Link>
            ))}
            <Button
              className="mt-3"
              onClick={() => {
                setMenuOpen(false);
                openEnquiry(null, "mobile_menu");
              }}
            >
              Order Now
            </Button>
          </nav>
        </div>
      </header>
    </>
  );
}
