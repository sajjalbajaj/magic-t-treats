import Image from "next/image";
import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";
import { InstagramIcon } from "@/components/ui/brand-icons";

import { publicNavItems } from "@/config/site";
import type { FooterContent, GeneralSettings } from "@/types/domain";

export function PublicFooter({
  content,
  general,
  instagramUrl,
  instagramUsername,
  categories,
}: {
  content: FooterContent;
  general: GeneralSettings;
  instagramUrl: string;
  instagramUsername: string;
  categories: { name: string; slug: string }[];
}) {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-line bg-surface-warm">
      <div className="container-page grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            {general.logoUrl ? (
              <span className="relative size-12 shrink-0 overflow-hidden rounded-full">
                <Image
                  src={general.logoUrl}
                  alt=""
                  fill
                  sizes="48px"
                  className="object-cover"
                />
              </span>
            ) : null}
            <p className="font-display text-2xl text-cocoa">{general.bakeryName}</p>
          </div>
          <p className="max-w-xs text-sm leading-relaxed text-ink-muted">{content.tagline}</p>
          {instagramUrl ? (
            <a
              href={instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-flex w-fit items-center gap-2 text-sm font-semibold text-cocoa transition-colors duration-200 hover:text-accent"
            >
              <InstagramIcon className="size-4" aria-hidden="true" />
              {instagramUsername ? `@${instagramUsername}` : "Instagram"}
            </a>
          ) : null}
        </div>

        <nav aria-label="Footer" className="flex flex-col gap-2.5">
          <h2 className="font-sans text-sm font-bold uppercase tracking-wider text-cocoa">
            Explore
          </h2>
          {publicNavItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm text-ink-muted transition-colors duration-200 hover:text-cocoa"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex flex-col gap-2.5">
          <h2 className="font-sans text-sm font-bold uppercase tracking-wider text-cocoa">
            Treats
          </h2>
          {categories.slice(0, 6).map((category) => (
            <Link
              key={category.slug}
              href={`/gallery?category=${category.slug}`}
              className="text-sm text-ink-muted transition-colors duration-200 hover:text-cocoa"
            >
              {category.name}
            </Link>
          ))}
        </div>

        <div className="flex flex-col gap-2.5">
          <h2 className="font-sans text-sm font-bold uppercase tracking-wider text-cocoa">
            Reach us
          </h2>
          {general.serviceArea ? (
            <p className="flex items-start gap-2 text-sm text-ink-muted">
              <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              {general.serviceArea}
            </p>
          ) : null}
          {general.phone ? (
            <a
              href={`tel:${general.phone.replace(/\s/g, "")}`}
              className="flex items-center gap-2 text-sm text-ink-muted transition-colors duration-200 hover:text-cocoa"
            >
              <Phone className="size-4 shrink-0" aria-hidden="true" />
              {general.phone}
            </a>
          ) : null}
          {general.email ? (
            <a
              href={`mailto:${general.email}`}
              className="flex items-center gap-2 text-sm text-ink-muted transition-colors duration-200 hover:text-cocoa"
            >
              <Mail className="size-4 shrink-0" aria-hidden="true" />
              {general.email}
            </a>
          ) : null}
          <p className="mt-1 text-xs text-ink-muted">{content.note}</p>
        </div>
      </div>

      <div className="border-t border-line">
        <div className="container-page flex flex-col items-center justify-between gap-2 py-5 text-xs text-ink-muted sm:flex-row">
          <p>
            © {year} {general.bakeryName}. All rights reserved.
          </p>
          <Link href="/privacy" className="transition-colors duration-200 hover:text-cocoa">
            Privacy Policy
          </Link>
        </div>
      </div>
    </footer>
  );
}
