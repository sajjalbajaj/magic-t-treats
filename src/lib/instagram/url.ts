/**
 * Instagram URL handling.
 *
 * Deliberately separate from `preview.ts`, which is `server-only` because it
 * makes network calls. This half is pure string work — it needs to be unit
 * testable and usable from either side of the server/client boundary.
 */

/** Accepts post, reel and TV links; rejects profiles and anything off-site. */
export function normaliseInstagramUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }

  if (!/(^|\.)instagram\.com$/i.test(url.hostname)) return null;

  const match = url.pathname.match(/^\/(p|reel|reels|tv)\/([A-Za-z0-9_-]+)/);
  if (!match) return null;

  const kind = match[1] === "reels" ? "reel" : match[1];
  // Canonical form, query stripped: the same post shared from different places
  // carries different tracking parameters and would otherwise look unique.
  return `https://www.instagram.com/${kind}/${match[2]}/`;
}
