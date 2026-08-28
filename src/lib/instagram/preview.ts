import "server-only";

import { normaliseInstagramUrl } from "@/lib/instagram/url";

/**
 * Reads a public Instagram post's image and caption.
 *
 * Instagram removed its unauthenticated oEmbed endpoint in 2020, and the
 * replacement needs a Meta app with App Review. So this reads the Open Graph
 * tags Instagram still emits for crawlers.
 *
 * That is best-effort by nature: Instagram rate-limits, sometimes serves a
 * login wall, and can change the markup without notice. Every failure path
 * therefore returns a reason rather than throwing, and the admin UI falls back
 * to entering the image by hand. Nothing in the product depends on this
 * working — it only saves typing when it does.
 */

export type InstagramPreview = {
  imageUrl: string | null;
  caption: string | null;
  postUrl: string;
};

export { normaliseInstagramUrl };

export type PreviewResult =
  | { ok: true; data: InstagramPreview }
  | { ok: false; reason: string };

function decodeEntities(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#x27;/g, "'");
}

function metaContent(html: string, property: string): string | null {
  // Attribute order varies, so match either direction rather than assuming one.
  const patterns = [
    new RegExp(
      `<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']*)["']`,
      "i",
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${property}["']`,
      "i",
    ),
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return decodeEntities(match[1]);
  }
  return null;
}

/**
 * Instagram puts the caption in og:title as
 * `Account on Instagram: "the actual caption"`. Pull the quoted part out when
 * that shape is present, otherwise fall back to the description.
 */
function extractCaption(html: string): string | null {
  const title = metaContent(html, "og:title");
  const description = metaContent(html, "og:description");

  const quoted = (title ?? description ?? "").match(/[:\-—]\s*[""“](.+)[""”]\s*$/s);
  if (quoted?.[1]) return quoted[1].trim();

  if (description) {
    // Strip the "123 likes, 4 comments - handle on date:" preamble.
    const stripped = description.replace(/^[^:]{0,120}:\s*/, "").trim();
    return stripped.length > 0 ? stripped : description.trim();
  }

  return title?.trim() ?? null;
}

export async function fetchInstagramPreview(rawUrl: string): Promise<PreviewResult> {
  const postUrl = normaliseInstagramUrl(rawUrl);
  if (!postUrl) {
    return { ok: false, reason: "That does not look like an Instagram post or reel link." };
  }

  let html: string;
  try {
    const response = await fetch(postUrl, {
      headers: {
        // Instagram serves Open Graph tags to crawler-shaped requests and a
        // login wall to bare fetches.
        "User-Agent":
          "Mozilla/5.0 (compatible; MagicTreatsBot/1.0; +https://www.instagram.com/)",
        "Accept-Language": "en-GB,en;q=0.9",
        Accept: "text/html,application/xhtml+xml",
      },
      // Never let a slow third party hold an admin request open.
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });

    if (!response.ok) {
      return {
        ok: false,
        reason: `Instagram replied ${response.status}. Add the photo manually instead.`,
      };
    }

    html = await response.text();
  } catch {
    return {
      ok: false,
      reason: "Could not reach Instagram just now. Add the photo manually instead.",
    };
  }

  const imageUrl = metaContent(html, "og:image");
  const caption = extractCaption(html);

  if (!imageUrl) {
    return {
      ok: false,
      reason:
        "Instagram did not return a preview for that post. It may be private, or it is asking us to log in. Add the photo manually.",
    };
  }

  return { ok: true, data: { imageUrl, caption, postUrl } };
}
