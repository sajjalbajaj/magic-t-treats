/**
 * Image alt text, in one house format.
 *
 * The owner's convention is that every image description ends with the brand
 * and the baker's name, in the spellings people actually search for:
 *
 *     {keywords}, Magic T-treats, Magic t treats, Tashu, tavishi, Tavishi manohar
 *
 * Only the descriptive half is ever stored. The suffix is appended here, at
 * render time, for two reasons: the format can be changed in one place instead
 * of by migrating every row, and a description edited in the dashboard cannot
 * accidentally end up with the suffix twice.
 *
 * A note for whoever changes this next: alt text is read aloud by screen
 * readers, so everything in the suffix is heard after every single image. If
 * the suffix ever grows, that cost grows with it. Search engines also treat
 * repeated keyword lists in alt text as a spam signal, so the brand terms are
 * doing more work in filenames, captions, headings and the JSON-LD in
 * `structured-data.ts` than they are here.
 */

const BRAND_SUFFIX = "Magic T-treats, Magic t treats, Tashu, tavishi, Tavishi manohar";

/**
 * Appends the house suffix to a description.
 *
 * Idempotent: a string that already carries the suffix is returned unchanged,
 * so it is safe to call on values that may already have been formatted.
 * An empty description returns the brand terms alone rather than a stray
 * leading comma.
 */
export function altText(keywords: string | null | undefined): string {
  const described = (keywords ?? "").trim().replace(/[,\s]+$/, "");

  if (!described) return BRAND_SUFFIX;
  if (described.endsWith(BRAND_SUFFIX)) return described;

  return `${described}, ${BRAND_SUFFIX}`;
}
