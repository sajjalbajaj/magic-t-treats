/**
 * Whole-site issue scan against a running build.
 *
 * Catches the class of problem that only appears with real data in the
 * database — broken images, failed requests, duplicate ids, unlabelled
 * controls — none of which a type check or unit test can see.
 *
 *   node scripts/scan-site.mjs [baseUrl]
 */
import { chromium } from "@playwright/test";

const BASE = process.argv[2] ?? "http://localhost:3400";

const PAGES = [
  "/", "/about", "/gallery", "/custom-order", "/contact", "/privacy",
  "/auth/login", "/sitemap.xml", "/robots.txt",
];

// Should all bounce an anonymous visitor to the login screen.
const PROTECTED = ["/admin", "/admin/orders", "/admin/products", "/admin/settings"];

const browser = await chromium.launch();
const issues = [];
const note = (page, severity, message, detail) =>
  issues.push({ page, severity, message, detail });

/* ------------------------------------------------------------ public --- */
for (const path of PAGES) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  const consoleErrors = [];
  const failedRequests = [];
  page.on("console", (m) => {
    if (m.type() === "error") consoleErrors.push(m.text().slice(0, 160));
  });
  page.on("requestfailed", (r) => {
    const failure = r.failure()?.errorText ?? "";
    // Aborted media is normal: videos are paused when scrolled out of view.
    if (/ERR_ABORTED/.test(failure) && /\.(mp4|webm)/.test(r.url())) return;
    if (/ERR_ABORTED/.test(failure) && /[?&]_rsc=/.test(r.url())) return;
    failedRequests.push(`${r.url().slice(-70)} ${failure}`);
  });

  const response = await page.goto(BASE + path, { waitUntil: "networkidle" });
  const status = response?.status() ?? 0;
  if (status >= 400) note(path, "error", `HTTP ${status}`);

  // Only HTML pages get the DOM audit.
  if (path.endsWith(".xml") || path.endsWith(".txt")) {
    await page.close();
    continue;
  }

  // Scroll so lazy content and scroll-reveals actually render.
  await page.evaluate(async () => {
    // The site sets `scroll-behavior: smooth`, which makes scripted scrolling
    // animate — rapid scrollTo calls then never arrive, and everything below
    // the fold looks like it failed to reveal. Disable it while scanning.
    const previous = document.documentElement.style.scrollBehavior;
    document.documentElement.style.scrollBehavior = "auto";

    for (let y = 0; y < document.body.scrollHeight; y += 300) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 120));
    }
    window.scrollTo(0, 0);
    document.documentElement.style.scrollBehavior = previous;
  });
  await page.waitForTimeout(1000);

  const audit = await page.evaluate(() => {
    const out = {
      brokenImages: [],
      missingAlt: [],
      emptyLinks: [],
      duplicateIds: [],
      unlabelledFields: [],
      headingJumps: [],
      stuckReveals: 0,
      h1Count: document.querySelectorAll("h1").length,
      title: document.title,
      metaDescription:
        document.querySelector('meta[name="description"]')?.getAttribute("content") ?? "",
    };

    for (const img of document.querySelectorAll("img")) {
      // complete + zero width means the fetch failed.
      if (img.complete && img.naturalWidth === 0) {
        out.brokenImages.push((img.currentSrc || img.src || "?").slice(-80));
      }
      if (!img.hasAttribute("alt")) out.missingAlt.push((img.src || "?").slice(-60));
    }

    for (const a of document.querySelectorAll("a")) {
      const label = (a.textContent || "").trim() || a.getAttribute("aria-label") || "";
      const hasImage = a.querySelector("img, svg");
      if (!label && !hasImage) out.emptyLinks.push((a.getAttribute("href") || "?").slice(0, 60));
    }

    const seen = new Set();
    for (const el of document.querySelectorAll("[id]")) {
      if (seen.has(el.id)) out.duplicateIds.push(el.id);
      seen.add(el.id);
    }

    for (const field of document.querySelectorAll("input, select, textarea")) {
      if (field.type === "hidden") continue;
      const labelled =
        field.labels?.length > 0 ||
        field.getAttribute("aria-label") ||
        field.getAttribute("aria-labelledby");
      if (!labelled) out.unlabelledFields.push(field.name || field.type);
    }

    // Heading levels should not skip (h2 -> h4).
    let previous = 0;
    for (const h of document.querySelectorAll("h1,h2,h3,h4,h5,h6")) {
      const level = Number(h.tagName[1]);
      if (previous && level > previous + 1) {
        out.headingJumps.push(`h${previous} -> h${level}: ${(h.textContent || "").trim().slice(0, 40)}`);
      }
      previous = level;
    }

    for (const el of document.querySelectorAll("[data-reveal]")) {
      const s = getComputedStyle(el);
      if (Number(s.opacity) < 0.9) out.stuckReveals += 1;
    }

    return out;
  });

  if (consoleErrors.length) note(path, "error", `${consoleErrors.length} console error(s)`, consoleErrors[0]);
  if (failedRequests.length) note(path, "error", `${failedRequests.length} failed request(s)`, failedRequests[0]);
  if (audit.brokenImages.length) note(path, "error", `${audit.brokenImages.length} broken image(s)`, audit.brokenImages[0]);
  if (audit.stuckReveals) note(path, "error", `${audit.stuckReveals} element(s) stuck invisible`);
  if (audit.duplicateIds.length) note(path, "error", `Duplicate id: ${[...new Set(audit.duplicateIds)].join(", ")}`);
  if (audit.unlabelledFields.length) note(path, "error", `Unlabelled field(s): ${audit.unlabelledFields.join(", ")}`);
  if (audit.missingAlt.length) note(path, "warn", `${audit.missingAlt.length} image(s) with no alt attribute`, audit.missingAlt[0]);
  if (audit.emptyLinks.length) note(path, "warn", `${audit.emptyLinks.length} link(s) with no accessible text`, audit.emptyLinks[0]);
  if (audit.headingJumps.length) note(path, "warn", `Heading level skipped`, audit.headingJumps[0]);
  if (audit.h1Count !== 1) note(path, "warn", `${audit.h1Count} <h1> elements (expected 1)`);
  if (!audit.title) note(path, "warn", "No <title>");
  if (!audit.metaDescription) note(path, "warn", "No meta description");

  await page.close();
}

/* --------------------------------------------------------- protected --- */
for (const path of PROTECTED) {
  const page = await browser.newPage();
  const response = await page.goto(BASE + path, { waitUntil: "domcontentloaded" });
  const url = page.url();
  if (!/\/auth\/login/.test(url)) {
    note(path, "error", "Reachable without signing in", `landed on ${url}`);
  }
  if ((response?.status() ?? 0) >= 500) note(path, "error", `HTTP ${response?.status()}`);
  await page.close();
}

/* ------------------------------------------------------------- links --- */
const page = await browser.newPage();
await page.goto(BASE + "/", { waitUntil: "networkidle" });
const links = await page.evaluate(() =>
  [...new Set([...document.querySelectorAll("a[href^='/']")].map((a) => a.getAttribute("href")))],
);
for (const href of links) {
  const target = href.split("#")[0];
  if (!target) continue;
  const res = await page.request.get(BASE + target);
  if (res.status() >= 400) note("/", "error", `Broken internal link ${target}`, `HTTP ${res.status()}`);
}
await page.close();

await browser.close();

/* ------------------------------------------------------------ report --- */
const errors = issues.filter((i) => i.severity === "error");
const warns = issues.filter((i) => i.severity === "warn");

const show = (list, label) => {
  if (!list.length) return;
  console.log(`\n${label}`);
  for (const i of list) {
    console.log(`  ${i.page.padEnd(16)} ${i.message}`);
    if (i.detail) console.log(`  ${" ".repeat(16)} ${i.detail}`);
  }
};

show(errors, `ERRORS (${errors.length})`);
show(warns, `WARNINGS (${warns.length})`);

console.log(
  `\n${errors.length === 0 && warns.length === 0 ? "Clean — no issues found." : `${errors.length} error(s), ${warns.length} warning(s)`}\n`,
);
process.exit(errors.length > 0 ? 1 : 0);
