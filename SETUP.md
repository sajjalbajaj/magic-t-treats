# Supabase setup — start here

Supabase is three things this project needs, in one free account:

| | What it does here |
| --- | --- |
| **Database** | Products, enquiries, orders, website text |
| **Storage** | Your photos and videos |
| **Auth** | The login for `/admin` |

Five steps, about fifteen minutes. **After each one, run `npm run setup:check`** —
it tells you what is done and what is not, so you are never guessing.

---

## Step 1 — Create the project

1. Go to **[supabase.com](https://supabase.com)** → *Start your project* → sign in
   with GitHub or email.
2. **New project**:
   - **Name:** `magic-t-treats`
   - **Database Password:** click *Generate* and **save it somewhere safe**.
     You will not need it for this app, but you cannot recover it later.
   - **Region:** **South Asia (Mumbai)** — closest to your customers.
   - **Plan:** Free.
3. Press **Create new project** and wait ~2 minutes while it provisions.

> The free plan pauses a project after a week of no traffic. It wakes on the
> next request — you just click *Restore* if you see it paused.

---

## Step 2 — Copy your keys

In your project: **Settings** (gear, bottom left) → **API**.

You need three values:

| On the page | Paste into `.env.local` as |
| --- | --- |
| **Project URL** | `NEXT_PUBLIC_SUPABASE_URL` |
| **anon** `public` | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| **service_role** `secret` | `SUPABASE_SERVICE_ROLE_KEY` |

`.env.local` already exists in this folder with the blanks ready — open it and
paste.

**What the two keys mean**, because the difference matters:

- **anon** is public and safe in a browser. Row Level Security decides what it
  can see — it can read your products, and cannot touch a single enquiry.
- **service_role** ignores all security rules. It stays on the server, only for
  saving enquiries and uploads. **Never put it in a page, a screenshot, or a
  git commit.** If it leaks, rotate it on this same page.

Then:

```bash
npm run setup:check
```

You should see the environment section pass and the schema section fail —
that is expected, the tables do not exist yet.

---

## Step 3 — Create the database

1. In Supabase, open **SQL Editor** (left sidebar) → **New query**.
2. Open **`supabase/setup-all.sql`** from this project. Select all (`Ctrl+A`),
   copy, paste into the editor.
3. Press **Run** (or `Ctrl+Enter`). It takes a few seconds.

You should see *Success. No rows returned*. That one file creates 17 tables,
30 security policies, the analytics functions, the storage bucket, and a
starter catalogue of 8 categories and 18 products.

It is safe to run again if anything looks wrong.

```bash
npm run setup:check
```

Schema, starter data, security and storage should all pass now.

---

## Step 4 — Create your login

Signing in needs **two** things: an auth account, and permission to use the
dashboard. They are separate on purpose — so a stray account cannot reach your
orders.

**4a. Create the account**

**Authentication** → **Users** → **Add user** → *Create new user*:
- Email and a strong password
- **Tick *Auto Confirm User*** — otherwise you must click a confirmation email

**4b. Grant dashboard access**

**SQL Editor** → **New query**, replacing the email and name with yours:

```sql
insert into public.admin_users (user_id, full_name, role)
select id, 'Your Name', 'owner'
from auth.users
where email = 'you@example.com';
```

Run it. It should say *Success. 1 row*. If it says 0 rows, the email does not
match the account you created.

```bash
npm run setup:check
```

Dashboard access should now pass and show your email.

---

## Step 5 — Run it

```bash
npm run dev -- -p 3311
```

- Website: <http://localhost:3311>
- Dashboard: <http://localhost:3311/admin>

Sign in with the email and password from step 4.

---

## Try the whole loop

Worth doing once, so you know it works end to end:

1. On the homepage, open any treat → **Enquire About This** → fill it in →
   **Copy Enquiry & Open Instagram**.
2. Go to `/admin`. Your enquiry is there, marked **New**.
3. Open it → **Mark contacted** → **Convert to order** → add a price →
   **Create order**.
4. **Available Today** → switch a few treats on → refresh the homepage and the
   *Baking Today* section appears.
5. **Website Content** → change the hero heading → **Publish** → refresh. The
   change is live immediately.

---

## If something goes wrong

| What you see | What it means |
| --- | --- |
| `relation "products" does not exist` | Step 3 did not run. Re-run `setup-all.sql`. |
| "Those details did not match" | Wrong password, or the user was never created. |
| "This account does not have dashboard access" | Step 4b did not run, or the email did not match. |
| Login page says "Supabase is not configured" | Keys missing from `.env.local`, or the dev server was not restarted after editing it. |
| Enquiry says "could not save" | `SUPABASE_SERVICE_ROLE_KEY` is missing. |
| Photos will not upload | The `media` bucket is missing — re-run `setup-all.sql`. |
| Images 404 | `NEXT_PUBLIC_SUPABASE_URL` must be set **before** building. Restart the dev server. |

**Always restart the dev server after editing `.env.local`.** It is read once
at startup.

---

## When you go live

Not needed yet, but for later:

- Put the same variables into Vercel's Environment Variables, marking
  `SUPABASE_SERVICE_ROLE_KEY` as sensitive.
- Set `NEXT_PUBLIC_SITE_URL` to the real domain — canonical URLs, the sitemap
  and share cards all derive from it.
- In Supabase → **Authentication → URL Configuration**, set the Site URL to
  the real domain.
