# Magic T-treats

Portfolio website, enquiry platform and operations dashboard for a home bakery
in Tricity (Chandigarh, Mohali, Panchkula).

The public site is a **product-discovery and lead-generation** site, not a
checkout. Visitors browse treats, open a product, and send an enquiry — the
site composes the message, saves the lead, and hands the customer off to
Instagram or WhatsApp to finish the conversation. The baker then works the lead
through the dashboard: enquiry → contacted → order → delivered.

---

## Contents

- [Architecture](#architecture)
- [Tech stack](#tech-stack)
- [Installation](#installation)
- [Environment](#environment)
- [Supabase setup](#supabase-setup)
- [Database migrations](#database-migrations)
- [Creating the first admin user](#creating-the-first-admin-user)
- [Local development](#local-development)
- [Brand assets](#brand-assets)
- [Media handling](#media-handling)
- [Analytics](#analytics)
- [Security model](#security-model)
- [Testing](#testing)
- [Production deployment](#production-deployment)
- [Build commands](#build-commands)
- [Day-to-day operation](#day-to-day-operation)
- [Extending the platform](#extending-the-platform)

---

## Architecture

```
                        CUSTOMER
                            │
                            ▼
                    PUBLIC WEBSITE  (static, ISR 5 min)
                            │
              ┌─────────────┴─────────────┐
              ▼                           ▼
        PRODUCT CONTENT              ENQUIRIES
        (anon read, RLS)        (POST /api/enquiries →
                                 validate → rate limit →
                                 service-role insert)
              └─────────────┬─────────────┘
                            ▼
                       SUPABASE
                 PostgreSQL + Storage + Auth
                            ▲
                            │  (RLS as the signed-in admin)
                     ADMIN DASHBOARD  (/admin, dynamic)
```

Three separate Supabase clients, each with a deliberate scope:

| Client                        | Used by                              | Runs as        | Why                                                                       |
| ----------------------------- | ------------------------------------ | -------------- | ------------------------------------------------------------------------- |
| `lib/supabase/public.ts`      | Public pages                         | `anon`         | No cookies, so pages stay statically renderable and cacheable.             |
| `lib/supabase/server.ts`      | Admin pages and all admin mutations  | Signed-in user | RLS applies; an admin bug cannot read more than the user is allowed to.    |
| `lib/supabase/admin.ts`       | Enquiry intake, analytics, audit log | `service_role` | Anonymous visitors have no INSERT policy anywhere; this is the chokepoint. |

**Why the public site does not use the cookie-bound client:** reading cookies
forces dynamic rendering. Keeping the public pages cookie-free means the
homepage, gallery and product pages are prerendered and served from cache, and
the baker's changes appear immediately via `revalidatePath()` rather than
waiting out the revalidate window.

### Directory layout

```
src/
├── app/
│   ├── (public)/          # Homepage, about, gallery, custom order, products/[slug]
│   ├── admin/             # Dashboard (auth-gated by admin/layout.tsx)
│   ├── auth/login/
│   ├── api/               # enquiries, events — the only public write endpoints
│   └── actions/           # Server actions, grouped by domain
├── components/
│   ├── public/            # Marketing site + homepage sections
│   ├── product/           # Cards, detail, dialogs
│   ├── admin/             # Dashboard shell, managers, forms
│   ├── forms/             # Enquiry + custom order
│   ├── analytics/
│   └── ui/                # Design system primitives
├── lib/
│   ├── supabase/          # The three clients + env access
│   ├── auth/              # requireAdmin()
│   ├── data/              # Read layer (public.ts, admin.ts, content.ts)
│   ├── admin/             # Action helpers: authz, audit, revalidation
│   ├── validation/        # Zod schemas
│   ├── analytics/         # Attribution + event tracking
│   ├── enquiry/           # Message generation
│   ├── orders/            # Money maths + lifecycle rules
│   ├── media/             # Upload validation
│   ├── security/          # Rate limiting
│   └── seo/               # JSON-LD builders
├── config/                # Brand config + content defaults
└── types/                 # database.ts (schema) + domain.ts (app types)

supabase/
├── migrations/            # 9 ordered, reproducible migrations
└── seed.sql               # Categories, products, collections, copy
```

---

## Tech stack

| Layer      | Choice                                                    |
| ---------- | --------------------------------------------------------- |
| Framework  | Next.js 16 (App Router, Turbopack), React 19               |
| Language   | TypeScript 6, `strict` + `noUncheckedIndexedAccess`        |
| Styling    | Tailwind CSS v4 (CSS-first `@theme`), CSS custom properties |
| Motion     | Motion (Framer Motion) — `motion/react`                     |
| Icons      | Lucide, plus local SVGs for brand marks                     |
| Database   | Supabase PostgreSQL                                        |
| Storage    | Supabase Storage (single `media` bucket)                   |
| Auth       | Supabase Auth (email + password, admin only)               |
| Validation | Zod 4                                                      |
| Tests      | Vitest (unit), Playwright (E2E)                            |

> **Note on tool versions.** TypeScript is pinned to `6.0.3` and ESLint to
> `9.39.5`. TypeScript 7 and ESLint 10 are both released, but `typescript-eslint`
> does not yet support TS 7, and the `eslint-plugin-react` bundled with
> `eslint-config-next@16` is not compatible with ESLint 10's rule context API.
> Pinning keeps `npm run lint` working. Revisit once those land.

---

## Installation

```bash
npm install
cp .env.example .env.local   # then fill it in
npm run dev
```

The app runs without Supabase credentials — public pages render their empty
states and `/admin` shows a "not configured" notice — so `npm run build`
succeeds on a fresh clone or in CI without secrets.

---

## Environment

| Variable                         | Required | Notes                                                     |
| -------------------------------- | :------: | --------------------------------------------------------- |
| `NEXT_PUBLIC_SITE_URL`           |    ✅    | Absolute origin. Canonical URLs, sitemap, OG tags.         |
| `NEXT_PUBLIC_SUPABASE_URL`       |    ✅    | Project URL. Safe in the browser.                          |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`  |    ✅    | Anon key. Safe in the browser — RLS protects the data.     |
| `SUPABASE_SERVICE_ROLE_KEY`      |    ✅    | **Server only.** Bypasses RLS. Never `NEXT_PUBLIC_`.       |
| `NEXT_PUBLIC_INSTAGRAM_URL`      |    ✅    | Profile URL. Fallback; the dashboard value takes priority. |
| `NEXT_PUBLIC_INSTAGRAM_USERNAME` |    ✅    | Handle without the `@`. The DM link is derived from it.    |
| `NEXT_PUBLIC_WHATSAPP_NUMBER`    |    —     | Digits with country code. When set, WhatsApp is offered.   |
| `NEXT_PUBLIC_GA_ID`              |    —     | GA4 measurement ID. Blank disables the tag entirely.       |
| `E2E_ADMIN_EMAIL` / `_PASSWORD`  |    —     | Dashboard E2E tests. Absent = those specs skip.            |

Social links and SEO defaults are also editable from **Settings** in the
dashboard, and those values win over the environment variables — so the baker
can change the Instagram handle without a redeploy.

**Two Instagram URLs are derived, not one.** "Follow us" links point at the
profile grid; the enquiry handoff points at `https://ig.me/m/<handle>`, which
opens the direct-message thread instead of leaving the customer to find the
Message button themselves. Both come from the same handle, so changing it in
Settings updates both.

---

## Supabase setup

1. Create a project at [supabase.com](https://supabase.com). Pick a region near
   your customers (`ap-south-1` for India).
2. Copy the URL, `anon` key and `service_role` key from
   **Project Settings → API** into `.env.local`.
3. Run the migrations (below). They create the `media` storage bucket too — no
   manual bucket setup needed.

---

## Database migrations

Migrations are ordered and reproducible. Do not create schema by clicking around
the SQL editor: add a migration file so every environment can be rebuilt.

```
supabase/migrations/
├── 20260827090000_extensions_and_helpers.sql   pgcrypto, set_updated_at(), slugify()
├── 20260827090100_admin_users.sql              admin roster + is_admin()
├── 20260827090200_catalog.sql                  categories, products, media, collections
├── 20260827090300_leads_and_orders.sql         enquiries, events, orders, order items
├── 20260827090400_cms_and_media.sql            posts, testimonials, content, settings, media
├── 20260827090500_audit_and_rate_limit.sql     activity log, check_rate_limit()
├── 20260827090600_analytics_functions.sql      dashboard KPI / funnel / revenue RPCs
├── 20260827090700_row_level_security.sql       every policy
└── 20260827090800_storage.sql                  media bucket + object policies
```

**With the Supabase CLI (recommended):**

```bash
npm i -g supabase
supabase link --project-ref <your-project-ref>
supabase db push
psql "$DATABASE_URL" -f supabase/seed.sql   # optional demo catalogue
```

**Without the CLI:** paste each migration into the SQL editor **in filename
order**, then `supabase/seed.sql` if you want the starter catalogue.

The seed contains categories, 18 products, four festive collections, sample
testimonials and all the homepage copy. It contains **no customer data** — the
enquiry and order tables start empty so your first numbers are real.

### Keeping types in step

`src/types/database.ts` is hand-maintained. When a migration changes a table,
update the matching `Row` type in the same commit — schema drift then becomes a
type error rather than a runtime surprise.

---

## Creating the first admin user

Authentication and authorisation are separate: a Supabase auth user can sign in,
but only a row in `admin_users` grants dashboard access.

1. **Supabase → Authentication → Users → Add user.** Set an email and a strong
   password, and tick *Auto Confirm User*.
2. Grant access in the SQL editor:

```sql
insert into public.admin_users (user_id, full_name, role)
select id, 'Your Name', 'owner'
from auth.users
where email = 'you@example.com';
```

3. Sign in at `/auth/login`.

Roles are `owner`, `admin` and `staff`. V1 treats every active admin as full
access, except that **only an `owner` may modify the `admin_users` table** — so
a staff account cannot promote itself. Set `is_active = false` to revoke access
without deleting history.

---

## Local development

```bash
npm run dev          # http://localhost:3000
npm run typecheck
npm run lint
npm run test
npm run build
```

---

## Brand assets

Every logo asset is **generated from one source file**, so the set stays
consistent and can be reproduced when the artwork changes:

```bash
node scripts/build-brand-assets.mjs "path/to/Magic ttreats.png"
```

The source artwork is a 1024×1536 canvas with the circular badge floating in a
pink field. The script measures the badge from its dark outline, crops to it,
applies a circular alpha mask, and writes:

| Output | Size | Use |
| --- | --- | --- |
| `public/brand/logo.png` | 512² | Header, footer and dashboard marks |
| `public/brand/logo@1024.png` | 1024² | Retina and print |
| `public/brand/logo-square.png` | 512² | Uncropped tile |
| `public/brand/og.png` | 1200×630 | Link previews |
| `src/app/icon.png` | 256² | Favicon |
| `src/app/apple-icon.png` | 180² | iOS home screen — square, since iOS masks it itself |

The source artwork is not committed. Keep a copy somewhere durable before
re-running the script.

Both icon files use Next's file conventions, so no `<link>` tags are written by
hand. The share card is set as the default `seo.ogImageUrl`, and can be replaced
from **Settings → Search engine defaults** without touching the code.

---

## Media handling

One public Supabase Storage bucket, `media`, foldered by purpose:
`products/`, `posts/`, `festive/`, `about/`, `testimonials/`, `branding/`.

Uploads go through a **server action**, not directly from the browser, so the
file can be inspected before it reaches storage:

1. Type + extension must both be on the allow-list (JPG, PNG, WebP, AVIF; MP4,
   WebM, MOV). SVG is refused — it can carry script.
2. Size is checked against the per-type limit (configurable in Settings;
   defaults 10 MB images / 100 MB video).
3. **Magic bytes are checked against the declared type** — a renamed `.jpg`
   that is really an HTML file does not get in.
4. Only then is it uploaded, and a `media_assets` row created. If that row
   fails, the object is removed rather than orphaned.

The database only ever stores paths, URLs, and metadata — never binary data.

Deleting a file first calls `media_asset_usage()`, which counts references
across products, posts, categories, collections and testimonials. Files in use
cannot be deleted, so the library can never silently blank an image on the
live site.

Images render through `next/image` (AVIF/WebP, responsive `sizes`, a designed
placeholder when nothing is uploaded). Videos are `preload="none"`, play only
while in the viewport, pause on exit, and are always muted until the visitor
asks otherwise.

---

## Analytics

Two layers:

- **GA4** — general web analytics. Loads only when `NEXT_PUBLIC_GA_ID` is set.
- **First-party funnel** — `enquiry_events`, because GA cannot tell the baker
  *which product* was enquired about in a way the dashboard can query.

Tracked events: `product_view`, `product_enquiry_click`, `enquiry_submitted`,
`instagram_opened`, `whatsapp_opened`, `product_shared`, `category_view`,
`custom_order_started`, `custom_order_submitted`.

Events post to `/api/events` via `sendBeacon`, which survives the page unload
that follows "open Instagram". Event names are allow-listed server-side.

### Attribution and QR campaigns

UTM parameters are captured on the **first** page of a visit and kept in
`sessionStorage` for the rest of it — otherwise a visitor who lands on a tagged
URL and then browses to a product would submit their enquiry with no campaign
data. First touch wins. Where no tag exists, the referrer is used to infer a
source (`instagram`, `google`, `whatsapp`…), and genuinely unattributed traffic
is labelled `direct` rather than left blank.

This makes printed QR campaigns work with no extra code:

```
https://yoursite.com/?utm_source=qr&utm_medium=offline&utm_campaign=packaging
```

Those leads then show up under **QR** in Analytics → Where leads come from.

Dashboard aggregations run as SECURITY DEFINER Postgres functions, each gated
on `is_admin()`. Counting rows in the database rather than pulling them into a
serverless function is what keeps the dashboard fast as volume grows.

---

## Security model

**Row Level Security is enabled on every table.** The model:

| Role                             | Can do                                                          |
| -------------------------------- | --------------------------------------------------------------- |
| `anon`                           | Read only published/active rows. **Cannot write anything.**       |
| `authenticated` + `admin_users`  | Full CRUD via `is_admin()`.                                       |
| `service_role`                   | Bypasses RLS. Used only by trusted server code.                   |

Publicly readable: active products/categories/media, active collections,
published posts and testimonials, site content, and settings flagged
`is_public`. Private with no anon policy at all: enquiries, enquiry events,
orders, order items, media assets, the audit log and the rate-limit table.

Other deliberate choices:

- **Public writes have no RLS policy.** The enquiry form posts to a route
  handler that validates, rate-limits, then inserts with the service role.
  Spam control stays server-side instead of being handed to the browser.
- **Authorisation is checked three times** — proxy redirect (fast path),
  `requireAdmin()` in the layout and in every server action (the real
  boundary), and RLS at the database (the backstop). Server actions are
  directly callable endpoints; being rendered inside a protected page proves
  nothing about who invoked them.
- `is_admin()` is `SECURITY DEFINER` with a pinned `search_path`, to avoid
  policy recursion and search-path hijacking.
- **Rate limiting lives in Postgres**, not memory. Serverless functions reset
  per instance and run per region, so an in-process counter would not work.
  Enquiries: 5 per 10 minutes per IP. Events: 120 per minute. The IP is hashed
  before storage.
- **Errors are translated, never leaked.** Customers and the baker see plain
  sentences; the Postgres error goes to the server log.
- Audit rows are insert-only via the service role — history the client can
  rewrite is not history.
- The service role key is never `NEXT_PUBLIC_`-prefixed and is only imported by
  modules marked `server-only`.
- `/admin`, `/auth` and `/api` are disallowed in `robots.txt` and marked
  `noindex`.

### Verifying RLS

```sql
-- As anon: should return 0 rows, not an error.
select * from public.enquiries;

-- As anon: should fail.
insert into public.products (sku, name, slug) values ('X', 'X', 'x');
```

---

## Testing

```bash
npm run test          # Vitest — 90 unit tests
npm run test:e2e      # Playwright
```

Unit tests cover the logic where a bug is expensive and silent:

| Area                          | What is asserted                                                       |
| ----------------------------- | ---------------------------------------------------------------------- |
| Enquiry message generator     | Skipped fields omitted, no timezone date shift, whitespace collapsed    |
| Order calculations            | Float drift, discount capped at subtotal, advance capped at total       |
| Order lifecycle               | Only valid transitions; delivered/cancelled are terminal                |
| Validation schemas            | Coercion of form strings, rejection of bad dates/slugs/SKUs/emails      |
| Analytics normalisation       | Case-folding, referrer inference, `direct` fallback, device detection   |
| Upload validation             | Renamed-file rejection via magic bytes, per-type size limits, path safety |

E2E specs cover the public journey, SEO artefacts and the security boundary
(anonymous `/admin` access denied, no service-role key in the page, malformed
payloads rejected). The dashboard specs — login, create product, convert
enquiry to order, edit content — need a real Supabase project and
`E2E_ADMIN_EMAIL` / `E2E_ADMIN_PASSWORD`; they skip with a clear message when
those are absent, rather than mocking the database.

First run needs browsers: `npx playwright install chromium`.

---

## Production deployment

**Vercel + Supabase.**

1. Push to GitHub and import the repo into Vercel.
2. Add every environment variable from the table above to
   **Project Settings → Environment Variables**. Set `NEXT_PUBLIC_SITE_URL` to
   the production domain. Mark `SUPABASE_SERVICE_ROLE_KEY` as sensitive.
3. Deploy. Build command `npm run build`, output detected automatically.
4. Add the custom domain and update `NEXT_PUBLIC_SITE_URL` to match, so
   canonical URLs and the sitemap are correct.
5. In Supabase → **Authentication → URL Configuration**, set the Site URL to
   the production domain.
6. Submit `https://yourdomain.com/sitemap.xml` to Google Search Console.

### Post-deploy checklist

- [ ] Sign in at `/auth/login` works, and `/admin` is unreachable when signed out
- [ ] Send a test enquiry; confirm it appears in the dashboard
- [ ] Upload an image; confirm it appears on the site
- [ ] Toggle Available Today; confirm the homepage section appears/disappears
- [ ] Edit homepage copy; confirm it goes live immediately
- [ ] `view-source:` the homepage and confirm no `service_role` string
- [ ] Run Lighthouse on mobile

---

## Build commands

| Command                | Does                                          |
| ---------------------- | --------------------------------------------- |
| `npm run dev`          | Dev server (Turbopack)                        |
| `npm run build`        | Production build                              |
| `npm run start`        | Serve the production build                    |
| `npm run lint`         | ESLint                                        |
| `npm run typecheck`    | `tsc --noEmit`                                |
| `npm run test`         | Vitest once                                   |
| `npm run test:watch`   | Vitest watch                                  |
| `npm run test:e2e`     | Playwright                                    |
| `npm run format`       | Prettier write                                |
| `npm run format:check` | Prettier check                                |

---

## Day-to-day operation

The dashboard is built so the baker never needs a developer for normal changes.

| To do this                     | Go here                                          |
| ------------------------------ | ------------------------------------------------ |
| See what needs attention       | Dashboard                                        |
| Reply to a new enquiry         | Enquiries → open → Mark contacted                |
| Turn an enquiry into an order  | Enquiries → open → Convert to order              |
| Update an order's progress     | Orders → open → Mark preparing / ready / …       |
| Say what is baked today        | Available Today (one toggle per treat)           |
| Add or edit a treat            | Products                                         |
| Add photos or reels            | Posts & Reels, or Media Library                  |
| Change words on the website    | Website Content                                  |
| Build a festive gift set       | Festive Collections                              |
| Add a customer review          | Testimonials                                     |
| Change Instagram / phone / SEO | Settings                                         |

Two behaviours worth knowing:

- **Baking Today hides itself.** With nothing toggled on, that homepage section
  disappears entirely rather than showing an empty shelf.
- **Products archive, they never delete.** Past orders and enquiries keep
  referring to them. Archived products vanish from the site but stay in the
  records.

---

## Extending the platform

The architecture leaves room for the roadmap without carrying its weight now.

| Next step             | Where it plugs in                                                                     |
| --------------------- | -------------------------------------------------------------------------------------- |
| WhatsApp enquiries    | Already built. Add a number in Settings and the button appears.                          |
| Direct ordering, cart | `orders` + `order_items` already model multi-item orders; add a customer-facing writer.  |
| Online payments       | `payment_status` and `advance_amount` exist; add a provider webhook route.               |
| Delivery slots        | Extend `orders`; `required_date` and `fulfilment_type` are already there.                |
| Customer accounts     | Supabase Auth is configured; add a `customers` table and non-admin policies.             |
| Instagram publishing  | `posts` already holds captions and media. Add a Meta Graph API publish step.             |
| Mobile app            | The route handlers already return a consistent `{ success, data }` envelope.             |
| Loyalty, coupons      | New tables; order totals are computed in one pure module that a discount rule can hook.  |

Deliberately **not** built in V1: Instagram publishing, checkout, a customer
portal, or a permissions UI. This is a tool for one baker, and it is meant to
stay usable.

---

## Licence

Private and proprietary. All rights reserved.
