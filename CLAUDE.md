# magicttreatsNew

## Purpose

Production build of **Magic T-treats** — a home bakery in Tricity. Public
portfolio + Instagram-enquiry platform, plus an operations dashboard the baker
runs herself. Replaces the abandoned skeleton in `../magicttreats/` (63 files,
demo data only); brand facts were carried over, code was not.

**Read `README.md` before doing anything substantive** — it documents the
architecture, the security model and the deployment steps in full.

## Settled decisions — do not relitigate

| Decision | Why |
| --- | --- |
| **Three Supabase clients, not one** (`public.ts` / `server.ts` / `admin.ts`) | Public pages must stay cookie-free to remain statically renderable; admin must run under RLS; only enquiry intake, analytics and the audit log may use the service role. Widening the service-role client's use is a regression. |
| **Anon has no INSERT policy on any table** | Public writes go through `/api/enquiries`, which validates, rate-limits, then inserts as service role. This is the single chokepoint for spam control. |
| **Authorisation checked three times** | `proxy.ts` (fast path) → `requireAdmin()` in layout *and* in every server action (real boundary) → RLS (backstop). Server actions are directly callable; never rely on the page having been protected. |
| **Rate limiting in Postgres, not memory** | Serverless resets per instance and per region. `check_rate_limit()` is the only workable shared counter without adding Upstash. |
| **Products archive (`is_active=false`), never delete** | Orders and enquiries reference them. Same for enquiries — they are the reporting record. |
| **Order totals recomputed server-side** | The browser's numbers are a suggestion. `lib/orders/calculations.ts` is the single source of truth and is unit-tested. |
| **Content lives in `site_content`, defaults in `config/content-defaults.ts`** | Components must never hardcode copy. Defaults exist so the site never renders blank and so a newly added field appears in the admin editor before anyone saves it. |
| **`types/database.ts` is hand-maintained** | Change it in the same commit as the migration. Drift should surface as a type error. |
| **TypeScript pinned to 6.x, ESLint to 9.x** | `typescript-eslint` does not support TS 7; `eslint-plugin-react` bundled with `eslint-config-next@16` breaks on ESLint 10's rule context API. Upgrading either breaks `npm run lint`. Revisit when upstream lands. |
| **Form side-effects run inside the action, not in `useEffect`** | See `components/admin/use-action-form.ts`. React's `set-state-in-effect` rule flags the old pattern, and it misfires when the same result returns twice. |
| **No Instagram Graph API in V1** | `posts` is website-owned content that links out. A token expiry must not take down a homepage section. |
| **Lucide has no brand icons** (v1 removed them) | Instagram/WhatsApp marks are local SVGs in `components/ui/brand-icons.tsx`. |

## Motion

All public-site animation goes through `components/public/motion-primitives.tsx`.
Do not hand-roll `motion.div` in a section — the point of the module is that
timings and easings stay in step.

| Primitive | Use |
| --- | --- |
| `Reveal` | Single block, on scroll. Variants: `up` `fade` `scale` `left` `right` `rise` |
| `RevealGroup` + `RevealItem` | Staggered lists. Parent owns the rhythm, so item count does not change the feel |
| `AnimatedText` | Word-by-word headline reveal. `SectionHeading` exposes it via `animate` |
| `RevealImage` | Clip-path wipe plus settle from over-scale |
| `Float` | Slow drift — **decorative marks only**, never near text or controls |
| `BrandMark` | The badge, with the load-time zoom-in (`animateOnLoad`) |

Rules that are easy to break by accident:

- **Delays must be folded into the variant**, not passed as a `transition` prop.
  Framer Motion gives a variant's own transition precedence, so a `transition`
  prop is silently dropped. `withDelay()` exists for this.
- **`useReducedMotion()` renders the final state**, not a faster animation.
  Every primitive branches on it; keep that if you add one.
- **`viewport={{ once: true }}`** everywhere. Re-animating on scroll-past is
  what makes a site feel restless.
- Headings already in view on load (the hero) animate on mount, not on scroll —
  a scroll trigger there either fires instantly or never.
- **Do not animate `clip-path`.** `RevealImage` originally wiped its frame
  open that way; Framer applied the initial `inset(... 100% ...)` as an inline
  style and never animated it, leaving two homepage images permanently
  invisible. It now animates opacity and transform only, with the shell's
  `overflow-hidden` doing the masking. Verify with the reveal check in
  `scripts/` if you touch it.
- **Every animated element carries `data-reveal`**, and the root layout ships a
  `<noscript>` rule that forces those elements visible. Reveal animations render
  with inline `opacity: 0`, so without that guard the page is largely blank for
  anyone without JavaScript. If you add a primitive, tag it.

Icons are keyword-matched to content the baker types (`lib/products/category-icons.ts`,
and the hero badge map), so renaming a category or badge cannot leave a
mismatched icon behind.

## Instagram-sourced treats

Products can be created from an Instagram post: **Admin → Products → Import
from Instagram**.

- **There is no reliable public API.** Instagram removed unauthenticated
  oEmbed in 2020; the replacement needs a Meta app and App Review. The import
  reads the post's Open Graph tags, which Instagram rate-limits and sometimes
  answers with a login wall. **It is best-effort by design** — every failure
  path returns a reason and the admin fills the photo in by hand. Do not build
  anything that assumes the fetch succeeds.
- **The image is mirrored into our own storage.** Instagram CDN URLs are signed
  and expire within days, so storing one would leave a product with a broken
  photo. It is downloaded, signature-checked like any upload, and re-hosted.
- **Import is two steps, fetch then confirm.** Never auto-create a product from
  a caption; a half-formed treat is worse than typing one.
- `normaliseInstagramUrl` strips tracking parameters and canonicalises
  `/reels/` to `/reel/`. It is the duplicate-detection key, so the same post
  shared from two places must normalise identically. It lives in
  `lib/instagram/url.ts` — pure and unit-tested — separate from `preview.ts`,
  which is `server-only` because it makes network calls.
- **Enquiries go to DMs, not comments.** The generated message carries the post
  link directly under the product code, so the baker can identify the item at a
  glance. Comments were considered and rejected: they are public, cannot carry
  a phone number or date, and record no lead in the dashboard.

## Typography and contrast

Three faces, each with a job:

| Token | Face | Use |
| --- | --- | --- |
| `font-display` | DM Serif Display | h1/h2/h3 — the main headings |
| `font-sans` | Manrope | All body copy |
| `font-script` | Caveat | Kickers, section eyebrows, the accent half of the hero headline, the baker's sign-off |

**Never set body copy in `font-script`.** A handwriting face costs real reading
speed at paragraph length. Script eyebrows are also sentence-case with normal
tracking — uppercase letterspaced handwriting looks broken.

Contrast is audited in a real browser, not by eye:

```bash
npm run build && npx next start -p 3360
node scripts/check-contrast.mjs http://localhost:3360
```

It composites every layer the browser actually paints. Two things it exists to
catch, both of which it did:

- **Semi-transparent section backgrounds.** The hero card used
  `from-accent-soft/80 ... to-blush/45`, letting the vivid pink section bleed
  through, so text contrast depended on horizontal position. Section gradients
  are opaque now — keep them that way.
- **Gradients cannot be skipped.** An earlier version of the script ignored
  gradient backdrops and reported a clean sweep while leaving all 27 hero
  elements unmeasured. It now tests the worst-case colour stop.

`--brand-ink-muted` is `#675e58`, darkened from `#6b625c` so body copy clears
AA (4.69:1) on `blush`, the warmest surface it sits on.

## Photography and image SEO

Originals live outside the repo, in the sibling folder
`websites/personal/magic/`. `scripts/build-media.mjs` turns each one into the
WebP + JPEG pair in `public/media/`, so a re-crop is repeatable and the
provenance of every file is written down. A source missing from the machine is
skipped, not an error.

**Filenames are the SEO surface.** Every file in `public/media/` is named for
what it shows, hyphenated, no numbers or camera codes: e.g.
`diwali-chocolate-gift-box.webp`, `tavishi-manohar-home-baker-tricity.webp`.
Renaming a file means updating `content-defaults.ts`, the SQL seeds AND the
stored paths in the live database, which is what
`supabase/add-photography-2026-08-28.sql` does in its first section.

**Alt text has one house format**, set by the owner:

```
{keywords}, Magic T-treats, Magic t treats, Tashu, tavishi, Tavishi manohar
```

Only the descriptive half is ever stored, in `product_media.alt_text`, the post
title, or the content block. `lib/seo/alt-text.ts` appends the suffix at render
time, and every producer of an alt string goes through it: `lib/gallery/items.ts`,
`lib/products/display.ts`, `meet-the-baker.tsx`, `featured-promo.tsx`. Two
reasons for the split: the format changes in one place instead of by migration,
and a description edited in the dashboard cannot end up with the suffix twice.
`altText()` is idempotent and unit-tested for exactly that.

Be aware of what the format costs, and say so if it is ever reconsidered:
screen readers read the whole suffix aloud after every image, and repeated
keyword lists in alt text are a documented search-spam signal. The brand terms
do more good in filenames, captions, headings and the JSON-LD.

Replacing a photo **in place** at the same path does not show up in `next
start` until `.next/cache/images` is cleared. The optimizer keys its cache on
the URL, so it keeps serving the old bytes and a stale image looks like a code
bug. It nearly did here: a swap rendered as the previous Rakhi poster until the
cache was dropped.

## Copy

- **Copy lives in the database, not the code.** `src/config/content-defaults.ts`
  is only a fallback for keys the `site_content` row does not have. The merge is
  shallow and per-key, so a NEW field appears immediately from defaults while an
  EXISTING field keeps whatever the database holds. Editing a string in the repo
  therefore changes nothing on a live site unless a migration carries it across
  — see `supabase/update-content-2026-08-28.sql` for the shape.
- **No long dashes in any copy** — public site, forms, metadata titles and the
  dashboard. Each one was rewritten into real punctuation rather than deleted,
  because dropping the character alone leaves sentences unpunctuated. The
  "no value" placeholder in admin tables is a plain `-` for the same reason.
  Two deliberate exceptions: **code comments**, which still use them freely,
  and the caption parser in `lib/instagram/preview.ts`, whose character class
  must keep matching dashes that Instagram captions actually contain.
- **The baker's story is a `paragraphs` list**, not fixed fields. The homepage
  passes `maxParagraphs={2}` and links onward; About renders all of it with the
  portrait pinned via `lg:sticky`. One source, two lengths.

## Loading states

One bakery language, in `components/ui/loaders.tsx`. Do not add a generic
spinner to the public site.

| Component | Where |
| --- | --- |
| `BakeryLoader` | Chef hat + dropping choco bite + sparkle. Whole-page waits only |
| `BakerySkeleton` / `ProductCardSkeleton` | Content-shaped placeholders — grids, route `loading.tsx` |
| `RollingBite` | The Instagram handoff |
| `CocoaSpinner` | Admin only. The dashboard stays plain |
| `VideoLoadingBadge` | Pulsing bite behind a play icon |
| `BrokenBakeryIcon` | Chef hat with a bitten bite. **Failures only** |

Every image state, in one place (`components/ui/media-frame.tsx`):

| State | What shows |
| --- | --- |
| Loading | Cream shimmer |
| Loaded | Photo, shimmer unmounted |
| No URL yet | Cake slice + "Add a little sweetness here" |
| Failed to load | Bitten chef hat + "This treat is still in the oven." + Try again |
| Video failed | Bitten chef hat + "This reel needs another bake." |

Rules for the error states:

- **The hat is for failures, the cake slice is for empty.** A grid of products
  awaiting photography renders the empty state on every card at once, and four
  identical chef hats in a row reads as a fault rather than as empty slots. It
  also lets the baker tell "no photo uploaded" from "photo will not load".
- **The broken state is static.** An animated error reads as "still working",
  which is the opposite of what has happened.
- **Retry re-mounts, it does not cache-bust.** An earlier version appended
  `?retry=N` to the src; Next's image optimizer answers a local path carrying a
  query string with **400**, so the button failed every time it was pressed.
  A remount is enough, because browsers do not cache 4xx without explicit
  headers. Verified by requesting `/_next/image` both ways.
- **A video's failure listener is attached directly to the element**, not via
  React's `onError`. Media `error` events do not bubble and can fire while React
  is still committing the update that set `src`. Measured against a real 404:
  `video.error.code` was 4 and React's handler never ran, leaving an empty black
  box. `SmartVideo` adds the listener in its effect and also re-checks
  `element.error` when the source is attached.
- **The brand logo is the one exception** — if it fails it renders nothing.
  The wordmark sits next to it, and a chef hat standing in for the logo reads
  as a broken logo.

Rules that matter:

- **CSS keyframes, not Motion.** Loaders render exactly when the main thread is
  busiest; a compositor animation does not compete with the work being awaited.
- **Never one hat per card.** A grid of chef hats is a fairground. Grids get
  shimmer skeletons shaped like the real content, so nothing shifts on load.
- **Rotating copy is `aria-hidden`.** A live region that re-announces every
  2.2s is worse than silence. One `sr-only` "Loading" carries the meaning.
- **Reduced motion needs `animation: none !important`.** The global
  reduced-motion rule only *shortens* animations, so the bite would still land
  on its final keyframe — `opacity: 0` — and the loader would look empty. The
  bite is then rested in the bowl.
- **The handoff pause is ~550ms and comes AFTER the popup is opened.** The tab
  is opened synchronously inside the click; delaying before that would be
  blocked. Never move the pause earlier.
- **Navigation uses `useLinkStatus`, inside each `<Link>`.** It correctly shows
  nothing on fast connections, because prefetch makes those navigations
  instant, and appears on genuinely slow ones. Verified both ways by
  throttling before first load, not after — throttling after load leaves the
  prefetch already warm and the test passes for the wrong reason.
- **There is deliberately NO first-load curtain.** One was built and removed:
  a client component cannot cover the window before its own JavaScript
  arrives, so by the time its effect runs `document.readyState` is already
  `complete` and it never renders. Measured on a 50 kbps connection from the
  first byte — it did not appear once. The site is server-rendered, so the
  content is on screen before any loader could be; the brand moment on arrival
  is the hero badge zoom-in instead. Do not re-add it.
- **No artificial delay anywhere else.** `MediaFrame` unmounts its shimmer on
  load rather than hiding it, so nothing animates behind a loaded image.

## Site scan

```bash
npm run build && npx next start -p 3400
npm run scan
```

Crawls every public page for console errors, failed requests, broken images,
duplicate ids, unlabelled fields, heading-level jumps, missing `<h1>`, stuck
reveal animations and broken internal links, then confirms `/admin` redirects
an anonymous visitor.

Two lessons baked into it:

- **HTTP 200 does not mean the page works.** `/gallery` threw on every render
  and still returned 200, because the error boundary caught it. Assert on
  content, not status.
- **Scripted scrolling needs `scroll-behavior: auto`.** The site sets `smooth`,
  so rapid `scrollTo` calls never arrive and everything below the fold looks
  like it failed to reveal. The scan disables it while crawling.

## The fold

**The hero must fit above the fold at every supported viewport.** It is sized
to `calc(100svh - 6.4rem)` (header 81px + frame padding), not to its content.

Verify with a real browser rather than by reading CSS — this was wrong by 9px
on every desktop size on the first attempt, and badly broken on mobile:

```bash
npm run build && npx next start -p 3330
node scripts/measure-fold.mjs http://localhost:3330   # screenshots -> .fold-shots/
```

It checks six viewports for vertical fit, CTA visibility and horizontal
overflow. Two traps it exists to catch:

- **`overflow-hidden` hides overflow bugs.** The hero card clips over-wide
  children, so `documentElement.scrollWidth` stays clean while content is
  visibly cut off. The script measures element boxes, not document scroll.
- **`min-width: auto`.** Grid and flex items refuse to shrink below their
  content's minimum, so the horizontally-scrolling badge rail dragged the whole
  text column to 616px on a 390px screen. The grid children carry `min-w-0`
  for this reason — do not remove it.

Legitimate overflow is excluded: decorative blurred blobs, `.scroll-rail`
children, and reveal wrappers whose inner layer sits at `scale: 1.12` until it
animates in. All are clipped by an ancestor, so they cannot widen the page.

The arch's height is `clamp(min, calc(100svh - Nrem), max)` per breakpoint,
**not** a flat `Nsvh`. The chrome around it — header, frame padding, card
padding, controls row — is a fixed pixel count, so a plain fraction either
overflows short screens or leaves tall ones half empty. If you change the
padding, re-derive the subtracted constant and re-run the script.

On very short viewports (`max-height: 720px`) the hero pill is hidden — it
repeats what the badge row already says, and it is the cheapest thing to drop.

## Hero and homepage media

The hero follows a reference design the owner supplied: a cream card floating
on the brand pink, brand-left navigation, and an arch-framed media slider with
the badge turning slowly on its edge.

- **Videos are slides, not a grid.** `HeroSlider` shows one piece of media at a
  time. There is no longer a mid-page "Watch Them Being Made" section — it was
  removed at the owner's request and `reels-section.tsx` deleted along with the
  now-orphaned `home.reels` content block.
- **The slider advances when the video ENDS, not on a timer.** A timer would
  cut a 10-second reel off at 6. This means the video must not loop while
  rotating — a looping video never fires `ended` — so `SmartVideo` takes both
  `loop` and `onEnded`, and the slider flips `loop` back on when paused.
  Image slides have no completion event and fall back to a 6s dwell.
- **Auto-rotation has a pause control and is off under reduced motion.**
  WCAG 2.2.2 requires a way to stop content that moves automatically for more
  than five seconds. Do not remove that button without replacing the mechanism.
- Verify rotation in a browser, not by reading the code:
  `node scripts/check-rotation.mjs http://localhost:3350`
- **The rating chip only renders when real published testimonials carry a
  rating.** Do not hardcode a number there.
- The headline is split by rule (`splitHeadline`) so the closing sentence takes
  the accent colour — the baker keeps editing one plain heading.

Media supplied by the owner, committed to `public/media/`:

- `baker-portrait.webp|.jpg` — the owner's own portrait, 1122x1402 (already 4:5,
  the ratio the Meet the Baker frame uses, so no crop). Re-encoded from a
  2.2 MB PNG to 159 KB WebP. Set as `about.story.photoUrl`, so it appears on
  both the homepage and `/about`. **The source file is named "Tashu's Magic
  T-treats" — the baker's name has NOT been confirmed and is deliberately not
  published anywhere; `bakerName` is still generic. Confirm before using it.**

- `featured-scoopable-cookies.webp|.jpg` — Rakhi campaign poster, shown by the
  `FeaturedPromo` section and editable via the `home.featured` content block.
- `reel-scoopable-cookies.mp4`, `reel-in-the-kitchen.mp4` — 1080×1350, ~1.2 MB
  each. Seeded as `posts` rows **and** available as `starterReels` fallbacks in
  `config/content-defaults.ts`, so the hero has slides before the database is
  set up. Published posts replace the fallbacks outright — they never merge.
- **No poster frames**: there is no ffmpeg on this machine, so `SmartVideo`
  falls back to `preload="metadata"` and lets the browser paint the first
  frame. Upload real cover images from the dashboard when convenient.

## Layout

`src/app/(public)` public site · `src/app/admin` dashboard · `src/app/actions`
server actions by domain · `src/lib/data` read layer · `src/lib/admin/actions.ts`
authz + audit + revalidation helpers · `supabase/migrations` 9 ordered files.

## Commands

```bash
npm run dev
npm run lint && npm run typecheck && npm run test && npm run build
npm run test:e2e     # needs E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD + Supabase
```

## State as of 2026-08-28

Complete and building: public site, enquiry flow, full dashboard (enquiries,
orders, products, categories, available-today, posts, collections,
testimonials, content, media, analytics, settings), RLS, SEO, motion system,
brand assets, 94 unit tests.

**Not yet done:** never run against a live Supabase project — migrations, RLS
policies and the dashboard are unexecuted. Playwright browsers not installed,
so E2E has not run. No poster frames for the two homepage reels (no ffmpeg).
No git repo yet; if published, use the `sajjalbajaj` identity per
`../CLAUDE.md`.

## Agents

Primary: `web-dev`. UI polish: `ui-ux`.

## Brand facts

- Name is **Magic T-treats** (hyphen, lowercase second "t") — not "Magic Treats".
- Tagline, from the logo: **"Homemade Chocolates and Cakes"** — *Homemade*, not
  Handmade; *Cakes*, not Cookies. (The 150px avatar was misread as "Handmade
  … Cookies" before the high-res arrived; do not reintroduce that.)
- Logo: circular badge, chef-hatted panda on bright pink, arc text
  `MAGIC · T-TREATS`.
- **All brand assets are generated, not hand-exported.** Source artwork is
  1024×1536 with the badge floating in a pink field; `scripts/build-brand-assets.mjs`
  crops it to the measured badge bounds, applies a circular alpha mask, and
  emits every size. Re-run it if the artwork changes — do not hand-edit the
  outputs:

  | Output | Size | Use |
  | --- | --- | --- |
  | `public/brand/logo.png` | 512² | UI mark (circular, transparent corners) |
  | `public/brand/logo@1024.png` | 1024² | Retina / print |
  | `public/brand/logo-square.png` | 512² | Uncropped, for backgrounds that need the full tile |
  | `public/brand/og.png` | 1200×630 | Share card |
  | `src/app/icon.png` | 256² | Favicon (Next file convention) |
  | `src/app/apple-icon.png` | 180² | iOS — **square on purpose**, iOS applies its own rounded mask |

  The script needs the source artwork, which is not in the repo. Keep a copy
  before re-running.
- **Palette: warm base, pink accent** (decided 2026-08-27 with the user). The
  briefed cream/cocoa editorial base is unchanged; the `caramel` accent token
  was renamed to `accent` and retargeted to the logo's pink. The site is not
  pink-dominant — the brief's "avoid excessive pink" still holds for surfaces.

  Accent values are sampled from the logo and contrast-checked; do not swap in
  the raw logo pink for text:

  | Token | Hex | Use | Contrast |
  | --- | --- | --- | --- |
  | `accent` | `#c71e5b` | Text on cream, button fills | 5.33:1 on cream · white on it 5.58:1 |
  | `accent-deep` | `#a81549` | Button hover, badge text | white on it 7.32:1 |
  | `accent-vivid` | `#ff478b` | **Decoration only** — the logo's own pink | 3.08:1 on cream — fails text |
  | `accent-on-dark` | `#f888b0` | Text on the cocoa sections | 6.10:1 on cocoa |
  | `accent-soft` | `#ffe7f0` | Tinted surfaces | — |

  The admin dashboard deliberately stays neutral; "attention" there is amber,
  not brand pink.
- Instagram handle is **`magicttreats_`** (double t, trailing underscore).
  Profile: `https://www.instagram.com/magicttreats_/`
- **Two distinct Instagram URLs, do not collapse them:**
  - `instagramUrl` → the profile grid. Used by "follow us" links.
  - `instagramMessageUrl` → `https://ig.me/m/<handle>`, which opens the DM
    thread. Used by every enquiry handoff, because landing a customer on the
    profile grid makes them hunt for the Message button.
  Both are derived in `getSocialLinks()`; the DM URL is built by
  `buildInstagramMessageUrl()` so a handle change updates both.

## Decisions log

- 2026-08-27: Built fresh in `magicttreatsNew/` rather than continuing
  `magicttreats/`. Brand palette, name and Tricity positioning carried over;
  the auto-generated amber design-system palette was dropped in favour of the
  brief's cocoa/sage/caramel scheme.
- 2026-08-27: Renamed "Magic Treats" → "Magic T-treats" across source, SQL and
  docs (37 occurrences). Logo wired into header, footer, admin shell, login and
  favicon. Settings tagline changed to the logo's own line.
- 2026-08-27: Accent switched from caramel `#d98c5f` to the logo pink. This
  also fixed a pre-existing contrast failure — `text-caramel` on cream was
  2.55:1, well under AA, and it was being used for every section eyebrow.
  The replacement `accent` is 5.33:1.
- 2026-08-27: High-resolution artwork (1024×1536) supplied; all brand assets
  regenerated from it via `scripts/build-brand-assets.mjs`, replacing the
  150px avatar. Share card now exists. Tagline corrected to "Homemade
  Chocolates and Cakes" — the avatar had been too low-resolution to read it
  accurately. JSON-LD image URLs are now absolutised, since the stored asset
  paths are site-relative.
- 2026-08-28: Navigation rebuilt around a centred brand badge (88px at rest,
  56px scrolled) with a spring zoom-in on load. Shared motion vocabulary added
  in `motion-primitives.tsx` and every section migrated to it; the old
  `AnimatedSection` wrapper deleted. Owner-supplied campaign poster and two
  reels added to the homepage. Icons added across sections, keyword-matched to
  editable copy.
- 2026-08-28: Hero rebuilt to the owner's reference design — pink frame, cream
  card, arch-framed slider, spinning badge, social rail, slide counter. Nav
  moved back to brand-left (superseding the centred-logo layout from earlier
  the same day). Mid-page reels section and the `home.reels` content block
  removed; videos are hero slides now. Added a `<noscript>` guard so
  reveal-animated content is not invisible without JavaScript.
- 2026-08-28: Hero constrained to the fold at all six tested viewports, and
  `scripts/measure-fold.mjs` added to prove it in a real browser. Found and
  fixed a `min-width: auto` bug that pushed the mobile text column to 616px on
  a 390px screen — invisible to a document-scroll check because the card clips.
- 2026-08-28: Hero video enlarged (~520x650 from ~432x540 at 1440x900) by
  deriving the arch height from remaining space rather than a flat `svh`
  fraction, and widening the media grid column. Speaker control now defaults
  off on `SmartVideo` — the reels have no narration and the floating button was
  visual noise. Videos are muted with no unmute affordance as a result.
- 2026-08-28: Hero slider now auto-advances when the current video finishes
  (event-driven, not timed), with a pause control for WCAG 2.2.2 and no
  rotation under reduced motion. `scripts/check-rotation.mjs` verifies it in a
  real browser.
- 2026-08-28: Added Caveat as a script accent face (kickers, eyebrows, hero
  accent phrase, baker's signature); DM Serif stays for headings. Site-wide
  contrast audit added and made passing — section gradients are opaque now, and
  `ink-muted` was darkened to clear AA on blush. Fixed `RevealImage`, which had
  been leaving two homepage images permanently clipped to nothing.
- 2026-08-28: Owner's portrait added to the Meet the Baker section, which had
  been rendering an empty placeholder. Added an editable `photoAlt` field
  rather than reusing `bakerName` as alt text — a portrait's description
  belongs to its subject.
- 2026-08-28: Featured promo image replaced — the low-res campaign flyer was
  cropped down to just the product shot, sourced from a 1080x1350 video frame
  (extracted via headless Chromium, since there is no ffmpeg). The section's
  own typography now carries the message instead of competing with the poster's.
- 2026-08-28: Instagram import added for products, with the post link carried
  into the enquiry message. Chose paste-a-URL over the Graph API to avoid a
  Meta App Review dependency and 60-day token refresh.
- 2026-08-28: First run against a live database. Site scan
  (`scripts/scan-site.mjs`) found three real bugs that no type check or unit
  test could see: `/gallery` threw on every load because `buildGalleryItems`
  was exported from a `"use client"` module and called from the server (it
  rendered zero images and had been broken since it was written); videos with
  no cover image were being put into `<img src>` as `.mp4`; and four pages had
  no `<h1>`. All fixed.
- 2026-08-28: Bakery loading system added — chef hat + choco bite, cream
  shimmer, rolling bite for the Instagram handoff, cocoa spinner for admin.
  Enquiry submission now reports "Whipping up your enquiry…" then "Enquiry
  ready!" instead of an inert button.
- 2026-08-28: Loader system completed. Added `useLinkStatus`-based navigation
  indicator and a root `loading.tsx` using the brand loader. Built and then
  deleted a first-load curtain after measuring that it can never appear on a
  server-rendered site.
- 2026-08-28: Homepage feature photo replaced with the spoon-and-scoop shot;
  the pink mat around it was dropped, since a real photograph does not need a
  coloured border the way the old flat poster did. Every public image now runs
  through `MediaFrame`, which gained an intrinsic-size mode alongside its
  existing `fill` mode. Gallery lightbox switched from a fixed aspect ratio to
  fixed height + `object-contain`: `sm:aspect-video` had been cropping the top
  and bottom off every portrait reel. Baker's story replaced with the owner's
  own text and restructured into a paragraph list.
- 2026-08-28: Photography added: 11 product and lifestyle shots built through
  `scripts/build-media.mjs`, named descriptively for SEO, wired to products,
  collection covers and posts. Image alt text moved to one house format via
  `lib/seo/alt-text.ts`. Branded failure states replaced the browser's
  broken-image glyph everywhere, including admin thumbnails; `MediaFrame` moved
  to `components/ui/` now that both surfaces use it.
