"use client";

import { MessageCircle } from "lucide-react";

import { InstagramIcon } from "@/components/ui/brand-icons";
import { trackEvent } from "@/lib/analytics/track-event";

/**
 * Vertical social rail down the left edge of the hero.
 *
 * Hidden below `lg` rather than reflowed: on a phone it would either crowd the
 * headline or duplicate the header's Instagram link, and the header already
 * carries that on small screens.
 */
export function SocialRail({
  instagramUrl,
  whatsappUrl,
  tagline,
}: {
  instagramUrl: string;
  whatsappUrl: string;
  tagline: string;
}) {
  if (!instagramUrl && !whatsappUrl) return null;

  return (
    <div className="pointer-events-none absolute inset-y-0 left-0 hidden w-14 flex-col items-center justify-center gap-6 lg:flex">
      <div className="pointer-events-auto flex flex-col items-center gap-4">
        {instagramUrl ? (
          <a
            href={instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Instagram"
            onClick={() => trackEvent("instagram_opened", { cta_location: "hero_rail" })}
            className="text-cocoa transition-all duration-200 hover:-translate-y-0.5 hover:text-accent"
          >
            <InstagramIcon className="size-4.5" aria-hidden="true" />
          </a>
        ) : null}

        {whatsappUrl ? (
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="WhatsApp"
            onClick={() => trackEvent("whatsapp_opened", { cta_location: "hero_rail" })}
            className="text-cocoa transition-all duration-200 hover:-translate-y-0.5 hover:text-accent"
          >
            <MessageCircle className="size-4.5" aria-hidden="true" />
          </a>
        ) : null}
      </div>

      <span className="h-16 w-px bg-accent/25" aria-hidden="true" />

      {/*
        Rotated so it reads bottom-to-top. `writing-mode` keeps it as real
        selectable text rather than a transformed block, so it stays in the
        accessibility tree in the right reading order.
      */}
      <span
        className="text-[10px] font-semibold uppercase tracking-[0.22em] text-ink-muted"
        style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
      >
        {tagline}
      </span>
    </div>
  );
}
