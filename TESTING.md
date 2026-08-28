# How to test Magic T-treats

Two levels. Level 1 needs nothing and takes a minute. Level 2 needs a free
Supabase project and takes about fifteen, and is the one that actually
exercises the database, RLS and the dashboard.

---

## Level 1 — no setup (1 minute)

The app is built to run without credentials: public pages render their empty
states, and `/admin` sends you to a login screen that explains what is missing.

```bash
cd "c:/My Projects/Projects/workspace/websites/personal/magicttreatsNew"

npm run lint && npm run typecheck && npm run test && npm run build
npm run dev -- -p 3311
```

> **Use a port other than 3000.** Another project ("Meridian") is already
> running on 3000 on this machine.

Open <http://localhost:3311> and check:

| Check | Expected |
| --- | --- |
| Homepage | Renders with the default copy and placeholder art |
| Resize to 375px | No horizontal scroll; nav collapses to a menu |
| Tab from the top | "Skip to content" appears first, focus rings visible |
| `/gallery`, `/about`, `/custom-order`, `/contact`, `/privacy` | All load |
| Type into the custom order form | Message preview updates live |
| `/admin` | Redirects to `/auth/login` |
| Login page | Says "Supabase is not configured" |
| Browser console | No errors |

What you **cannot** test at this level: products, enquiries, uploads, the
dashboard, RLS. Everything below the database line is untested until Level 2.

---

## Level 2 — with a real database (~15 minutes)

### 1. Create a Supabase project

Sign up at [supabase.com](https://supabase.com) (free tier is enough).
**New project** → name it `magic-treats` → choose region **South Asia
(Mumbai) `ap-south-1`** → set a database password (save it somewhere).

Wait ~2 minutes for provisioning.

### 2. Create the schema

**SQL Editor → New query.** Open `supabase/setup-all.sql` from this repo,
paste the whole thing in, and press **Run**.

That one file is all nine migrations plus the seed data, in order. It creates
17 tables, all RLS policies, the analytics functions, the `media` storage
bucket, and a starter catalogue of 8 categories and 18 products.

It is safe to re-run if something goes wrong partway.

Verify in **Table Editor** that you can see `products`, `enquiries`, `orders`
and the rest, and that `products` has 18 rows.

### 3. Wire up the environment

**Project Settings → API.** Copy three values:

```bash
cp .env.example .env.local
```

Then edit `.env.local`:

```env
NEXT_PUBLIC_SITE_URL=http://localhost:3311

NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...          # "anon / public"
SUPABASE_SERVICE_ROLE_KEY=eyJ...              # "service_role" — secret

NEXT_PUBLIC_INSTAGRAM_URL=https://www.instagram.com/magicttreats_/
NEXT_PUBLIC_INSTAGRAM_USERNAME=magicttreats_
```

Leave `NEXT_PUBLIC_GA_ID` blank — no analytics tag in development.

Restart the dev server after editing (`.env.local` is read at boot).

### 4. Create your admin login

Authentication and authorisation are separate here: signing in is not enough,
you also need a row in `admin_users`.

**Authentication → Users → Add user.** Enter an email and password, and tick
**Auto Confirm User**.

Then **SQL Editor**:

```sql
insert into public.admin_users (user_id, full_name, role)
select id, 'Your Name', 'owner'
from auth.users
where email = 'you@example.com';
```

### 5. Run it

```bash
npm run dev -- -p 3311
```

---

## Walk the full journey

Do these in order — each one sets up the next.

### A. Customer sends an enquiry

1. Homepage → scroll to **Every treat we bake** → click any product card.
2. The detail dialog opens. Press **Esc** — it should close and focus should
   return to the card. Reopen it.
3. Click **Enquire About This**.
4. Fill in quantity ("2 boxes"), a date, and Delivery. Watch the message
   preview build itself as you type.
5. Click **Copy Enquiry & Open Instagram**.
   - A toast confirms it was copied.
   - Instagram opens in a new tab.
   - Paste anywhere — you should get the formatted message.

### B. Baker sees the lead

6. Go to `/admin` and sign in.
7. The dashboard should show **1 new enquiry**. The enquiry should also appear
   under Recent enquiries with source **direct**.
8. **Enquiries → Open.** Check the product, quantity and date match what you
   entered.
9. Click **Mark contacted**. The badge changes.

### C. Convert to an order

10. Click **Convert to order**. The form is pre-filled from the enquiry,
    including a first line item for the product.
11. Set a unit price (e.g. 420), an advance (e.g. 200), delivery charge 60.
    The totals panel updates live — check Balance due = Total − Advance.
12. **Create order.** You land on the order page with a number like
    `MT-2026-0001`.
13. Click **Mark preparing**, then **Mark ready**. Note that **Mark delivered**
    is not offered from "preparing" — the lifecycle is enforced.
14. Go back to the enquiry: its status is now **Converted**.

### D. Upload a photo

15. **Media Library → Upload file.** Choose a JPG or PNG.
16. Try uploading a `.txt` file renamed to `.jpg` — it should be rejected
    ("does not look like a valid image"). That is the magic-byte check.
17. **Products → any product → Add media → Library** → pick your image →
    **Add to product**.
18. Open the homepage — the product card now shows the photo.

### E. Edit the website without touching code

19. **Website Content → Homepage hero.** Change the heading. **Publish**.
20. Open the homepage in another tab — the new heading is there immediately
    (that is `revalidatePath()` working, not the 5-minute cache).

### F. Today's kitchen

21. **Available Today.** Toggle two or three treats on.
22. Homepage → a **Baking Today** section appears.
23. Turn them all off → the section disappears entirely rather than showing an
    empty shelf.

### G. Campaign tracking

24. Visit `http://localhost:3311/?utm_source=qr&utm_medium=offline&utm_campaign=packaging`
25. Browse to a product and send another enquiry.
26. **Admin → Enquiries → open it.** Source should read **qr**, campaign
    **packaging** — attribution survived the navigation.
27. **Analytics** → the lead now appears under *Where leads come from*.

---

## Security checks

These matter more than the happy path.

```bash
# 1. Anonymous cannot read customer data. Should return [] — not an error, not rows.
curl "https://YOUR-PROJECT.supabase.co/rest/v1/enquiries" \
  -H "apikey: YOUR_ANON_KEY"

# 2. Anonymous cannot write. Should return a 401/403 RLS error.
curl -X POST "https://YOUR-PROJECT.supabase.co/rest/v1/products" \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"sku":"HACK","name":"Hack","slug":"hack"}'
```

In the browser:

- Sign out, then visit `/admin/orders/new` directly → redirected to login.
- View source on the homepage and search for `service_role` → zero matches.
- `curl -X POST http://localhost:3311/api/enquiries -H "Content-Type: application/json" -d '{"kind":"product","requiredDate":"nope"}'`
  → `422` with a validation error, not a crash.
- Submit the enquiry form 6 times quickly → the 6th is rate-limited.

---

## Automated tests

```bash
npm run test        # 90 unit tests — message generator, order maths,
                    # validation, attribution, upload validation
```

End-to-end (needs browsers downloaded once):

```bash
npx playwright install chromium

# Public + security specs only:
npm run build && npm run test:e2e

# Including the dashboard specs:
E2E_ADMIN_EMAIL=you@example.com E2E_ADMIN_PASSWORD=yourpassword npm run test:e2e
```

Without those two variables the dashboard specs skip with a message rather
than failing.

> Playwright's config starts the app on port 3000 by default. Since that port
> is in use on this machine, run with
> `PLAYWRIGHT_BASE_URL=http://localhost:3311 npm run test:e2e` and have the app
> already running on 3311.

---

## Mobile

Most real visitors arrive from Instagram on a phone, so test there properly.

In Chrome DevTools device toolbar, check 375, 390 and 430 px wide:

- No horizontal scroll anywhere
- Product dialog opens as a bottom sheet, not a cramped centred box
- Reels scroll sideways rather than stacking into an enormous column
- Tap targets are comfortable

On a real phone, find your machine's LAN IP and visit
`http://<your-ip>:3311` from the same Wi-Fi.

---

## Lighthouse

```bash
npm run build && npm run start -- -p 3311
```

Then DevTools → Lighthouse → Mobile → Analyze. Run against the **production**
build; `npm run dev` scores meaninglessly badly.

Targets: Performance 90+, Accessibility 95+, SEO 95+, Best Practices 95+.
Performance will improve further once real (optimised) photography replaces
the placeholders.

---

## If something breaks

| Symptom | Cause |
| --- | --- |
| `EADDRINUSE :::3000` | The Meridian project is on 3000. Use `-p 3311`. |
| Login says "not configured" | `.env.local` missing or the server wasn't restarted after editing it. |
| Sign-in says "no dashboard access" | Auth user exists but the `admin_users` row does not. Re-run step 4. |
| Homepage shows no products | `setup-all.sql` was not run, or was run against a different project. |
| Uploads fail | `SUPABASE_SERVICE_ROLE_KEY` missing, or the `media` bucket was not created — re-run the setup SQL. |
| Enquiry says "could not save" | Same — the service role key is required for enquiry intake. |
| Images 404 or don't optimise | `NEXT_PUBLIC_SUPABASE_URL` must be set at **build** time for `next.config.ts` to allow the image host. Rebuild. |
