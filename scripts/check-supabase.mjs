/**
 * Supabase setup doctor.
 *
 * Run after each setup step; it reports exactly what is done and what is not,
 * with the fix for anything failing. It also verifies the security model
 * rather than assuming it — an RLS policy that did not apply looks identical
 * to one that did until someone tries to read the data.
 *
 *   npm run setup:check
 */
import { readFileSync, existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const DIM = "\x1b[2m";
const BOLD = "\x1b[1m";
const RESET = "\x1b[0m";

const ok = (m, d) => console.log(`  ${GREEN}✓${RESET} ${m}${d ? `${DIM}  ${d}${RESET}` : ""}`);
const bad = (m, fix) => {
  console.log(`  ${RED}✗${RESET} ${m}`);
  if (fix) console.log(`      ${YELLOW}→ ${fix}${RESET}`);
  failures += 1;
};
const warn = (m, fix) => {
  console.log(`  ${YELLOW}!${RESET} ${m}`);
  if (fix) console.log(`      ${YELLOW}→ ${fix}${RESET}`);
  warnings += 1;
};
const step = (n, t) => console.log(`\n${BOLD}${n}. ${t}${RESET}`);

let failures = 0;
let warnings = 0;

/* -------------------------------------------------------------- 1. env --- */
step(1, "Environment file");

if (!existsSync(".env.local")) {
  bad(".env.local is missing", "cp .env.example .env.local  — then paste your keys in");
  console.log(`\n${RED}Stopping: nothing else can be checked without credentials.${RESET}\n`);
  process.exit(1);
}

const env = {};
for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (match) env[match[1]] = match[2].replace(/^["']|["']$/g, "").trim();
}
ok(".env.local found");

const url = env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY ?? "";

if (!url) bad("NEXT_PUBLIC_SUPABASE_URL is empty", "Supabase → Project Settings → API → Project URL");
else if (!/^https:\/\/[a-z0-9]+\.supabase\.co\/?$/.test(url))
  warn(`URL looks unusual: ${url}`, "Expected https://xxxxxxxx.supabase.co");
else ok("Project URL set", url);

if (!anonKey) bad("NEXT_PUBLIC_SUPABASE_ANON_KEY is empty", "Project Settings → API → anon / public key");
else ok("Anon key set", `${anonKey.slice(0, 12)}…`);

if (!serviceKey) {
  bad("SUPABASE_SERVICE_ROLE_KEY is empty", "Project Settings → API → service_role key (keep secret)");
} else if (serviceKey === anonKey) {
  bad("Service role key is the same as the anon key", "Copy the service_role key, not the anon one");
} else {
  ok("Service role key set", `${serviceKey.slice(0, 12)}…`);
}

if (!url || !anonKey) {
  console.log(`\n${RED}Stopping: fill in the URL and anon key, then run again.${RESET}\n`);
  process.exit(1);
}

const anon = createClient(url, anonKey, { auth: { persistSession: false } });
const admin = serviceKey ? createClient(url, serviceKey, { auth: { persistSession: false } }) : null;

/* ------------------------------------------------------- 2. connection --- */
step(2, "Connection");

const { error: pingError } = await anon.from("products").select("id").limit(1);
if (pingError && /fetch failed|ENOTFOUND/i.test(pingError.message)) {
  bad(`Cannot reach ${url}`, "Check the URL, and that the project is not paused in Supabase");
  console.log("");
  process.exit(1);
}
if (pingError && /(relation .* does not exist|schema cache)/i.test(pingError.message)) {
  bad("Connected, but the tables do not exist yet", "Run supabase/setup-all.sql in the SQL Editor");
} else if (pingError && /Invalid API key/i.test(pingError.message)) {
  bad("Invalid anon key", "Re-copy it from Project Settings → API");
  console.log("");
  process.exit(1);
} else {
  ok("Connected to Supabase");
}

/* ----------------------------------------------------------- 3. schema --- */
step(3, "Schema");

const TABLES = [
  "admin_users", "categories", "products", "product_media",
  "collections", "collection_products", "enquiries", "enquiry_events",
  "orders", "order_items", "posts", "testimonials",
  "site_content", "site_settings", "media_assets", "admin_activity_logs",
];

const missing = [];
let firstError = null;
for (const table of TABLES) {
  // The service role bypasses RLS, so a failure here is a genuinely missing
  // table rather than a policy hiding it.
  //
  // A real GET, not `head: true`. A HEAD request returns no body, so
  // supabase-js has nothing to parse an error from and reports success even
  // for a table that does not exist — which is exactly how this check once
  // claimed all 16 tables were present against an empty database.
  const client = admin ?? anon;
  const { error } = await client.from(table).select("*").limit(1);
  if (error) {
    missing.push(table);
    firstError ??= error.message;
  }
}

if (missing.length === 0) {
  ok(`All ${TABLES.length} tables present`);
} else if (missing.length === TABLES.length) {
  bad("No tables found — the database is empty",
    "Open supabase/setup-all.sql, copy ALL of it into the SQL Editor, and Run");
  console.log(`      ${DIM}Supabase said: ${firstError}${RESET}`);
} else {
  bad(`${missing.length} of ${TABLES.length} tables unavailable: ${missing.join(", ")}`,
    "Re-run supabase/setup-all.sql — it is safe to run again");
  console.log(`      ${DIM}Supabase said: ${firstError}${RESET}`);
}

// instagram_url arrived in a later migration than the rest.
if (!missing.includes("products")) {
  const { error } = await (admin ?? anon).from("products").select("instagram_url").limit(1);
  if (error) warn("products.instagram_url is missing (a newer migration)",
    "Re-run supabase/setup-all.sql — it is safe to run again");
  else ok("Latest migration applied", "products.instagram_url");
}

/* ------------------------------------------------------------- 4. seed --- */
step(4, "Starter data");

const counts = {};
for (const table of ["categories", "products", "collections", "testimonials", "site_content"]) {
  if (missing.includes(table)) continue;
  const { count, error } = await (admin ?? anon)
    .from(table)
    .select("*", { count: "exact" })
    .limit(1);
  counts[table] = error ? 0 : (count ?? 0);
}

if ((counts.products ?? 0) === 0) {
  warn("No products found", "Run the seed half of setup-all.sql, or add products in the dashboard");
} else {
  ok(`Seed data loaded`,
    `${counts.categories} categories · ${counts.products} products · ${counts.collections} collections · ${counts.testimonials} testimonials`);
}

/* -------------------------------------------------------------- 5. RLS --- */
step(5, "Security (Row Level Security)");

if (!missing.includes("products")) {
  const { data, error } = await anon.from("products").select("id").limit(1);
  if (error) bad(`Anonymous cannot read products: ${error.message}`, "Check the RLS section of setup-all.sql ran");
  else if (!data || data.length === 0) warn("Anonymous read returned nothing", "Expected if there are no products yet");
  else ok("Anonymous CAN read published products");
}

if (!missing.includes("enquiries")) {
  const { data, error } = await anon.from("enquiries").select("id").limit(1);
  if (data && data.length > 0) {
    bad("Anonymous CAN read customer enquiries — this is a data leak",
      "The RLS section did not apply. Re-run setup-all.sql");
  } else if (error && /schema cache|does not exist/i.test(error.message)) {
    // A missing table blocks reads too. Reporting that as a security pass
    // would be actively misleading.
    warn("Cannot verify enquiry privacy — the table is not reachable yet");
  } else {
    ok("Anonymous CANNOT read enquiries", error ? "blocked by RLS" : "empty result");
  }
}

if (!missing.includes("products")) {
  const { error } = await anon
    .from("products")
    .insert({ sku: "RLS-PROBE", name: "RLS probe", slug: "rls-probe" });
  if (!error) {
    bad("Anonymous CAN write products — anyone could edit your catalogue",
      "Re-run the RLS section of setup-all.sql");
    if (admin) await admin.from("products").delete().eq("sku", "RLS-PROBE");
  } else if (/schema cache|does not exist/i.test(error.message)) {
    warn("Cannot verify write protection — the table is not reachable yet");
  } else {
    ok("Anonymous CANNOT write products", "insert refused by RLS");
  }
}

/* ----------------------------------------------------------- 6. storage --- */
step(6, "Storage");

if (!admin) {
  warn("Skipped — needs the service role key");
} else {
  const { data: buckets, error } = await admin.storage.listBuckets();
  if (error) {
    bad(`Could not list buckets: ${error.message}`);
  } else {
    const media = buckets.find((b) => b.id === "media");
    if (!media) bad("The 'media' bucket is missing", "Run the storage section of setup-all.sql");
    else if (!media.public) warn("'media' bucket is not public", "Photos will not display on the site");
    else ok("Storage bucket 'media' ready", "public");
  }
}

/* ------------------------------------------------------------- 7. admin --- */
step(7, "Dashboard access");

if (!admin) {
  warn("Skipped — needs the service role key");
} else if (missing.includes("admin_users")) {
  bad("admin_users table missing");
} else {
  const { data: admins } = await admin.from("admin_users").select("user_id, full_name, role, is_active");
  const { data: authUsers, error: authError } = await admin.auth.admin.listUsers();

  if (!admins || admins.length === 0) {
    bad("No admin users — you cannot sign in to /admin yet",
      "Create a user in Authentication → Users, then run the INSERT shown below");
  } else {
    const active = admins.filter((a) => a.is_active);
    const emails = authError
      ? []
      : admins
          .map((a) => authUsers.users.find((u) => u.id === a.user_id)?.email)
          .filter(Boolean);
    ok(`${active.length} active admin${active.length === 1 ? "" : "s"}`, emails.join(", "));
  }

  if (!authError && authUsers.users.length > 0) {
    const orphans = authUsers.users.filter(
      (u) => !(admins ?? []).some((a) => a.user_id === u.id),
    );
    if (orphans.length > 0) {
      warn(
        `${orphans.length} auth user(s) without dashboard access: ${orphans.map((u) => u.email).join(", ")}`,
        `Grant access:\n        insert into public.admin_users (user_id, full_name, role)\n        select id, 'Your Name', 'owner' from auth.users where email = '${orphans[0].email}';`,
      );
    }
  }
}

/* ------------------------------------------------------------ summary --- */
console.log(`\n${BOLD}${"─".repeat(58)}${RESET}`);
if (failures === 0 && warnings === 0) {
  console.log(`${GREEN}${BOLD}Everything is set up.${RESET} Start the site:  npm run dev -- -p 3311`);
  console.log(`Then sign in at ${BOLD}http://localhost:3311/auth/login${RESET}`);
} else if (failures === 0) {
  console.log(`${YELLOW}${BOLD}Ready, with ${warnings} thing(s) to look at above.${RESET}`);
} else {
  console.log(`${RED}${BOLD}${failures} problem(s) to fix.${RESET} Re-run this after fixing: npm run setup:check`);
}
console.log("");
process.exit(failures === 0 ? 0 : 1);
