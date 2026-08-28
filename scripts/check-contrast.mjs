/**
 * Audits colour contrast on rendered text against WCAG AA.
 *
 * Measures what the browser actually paints, rather than the tokens we think
 * we used — that catches opacity modifiers, gradients behind text, and colours
 * inherited from somewhere unexpected.
 *
 *   node scripts/check-contrast.mjs [baseUrl]
 */
import { chromium } from "@playwright/test";

const BASE = process.argv[2] ?? "http://localhost:3360";
const PAGES = ["/", "/about", "/gallery", "/custom-order", "/contact"];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

const AUDIT = () => {
  const parse = (c) => {
    const m = c.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/);
    return m
      ? { r: +m[1], g: +m[2], b: +m[3], a: m[4] === undefined ? 1 : +m[4] }
      : null;
  };

  const lin = (c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  const lum = ({ r, g, b }) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  const ratio = (a, b) => {
    const [hi, lo] = lum(a) >= lum(b) ? [lum(a), lum(b)] : [lum(b), lum(a)];
    return (hi + 0.05) / (lo + 0.05);
  };
  const over = (fg, bg) => ({
    r: Math.round(fg.r * fg.a + bg.r * (1 - fg.a)),
    g: Math.round(fg.g * fg.a + bg.g * (1 - fg.a)),
    b: Math.round(fg.b * fg.a + bg.b * (1 - fg.a)),
    a: 1,
  });

  /**
   * Every background colour the text might actually sit on.
   *
   * Returns a list, not one colour: a gradient means the text crosses several
   * shades, and the honest test is the worst of them. Skipping gradients
   * outright — the obvious shortcut — would have left the entire hero
   * unmeasured, which is where the risky colour combinations live.
   *
   * Bitmap backgrounds are genuinely unknowable, so those still return null.
   */
  const backdrops = (el) => {
    let base = { r: 255, g: 255, b: 255, a: 1 };
    const solids = [];
    const gradientStops = [];

    for (let n = el; n; n = n.parentElement) {
      const s = getComputedStyle(n);
      const img = s.backgroundImage;

      if (img && img !== "none") {
        if (!/gradient\(/.test(img)) return null; // photo or data URI
        for (const m of img.matchAll(/rgba?\([^)]*\)/g)) {
          const c = parse(m[0]);
          if (c && c.a > 0) gradientStops.push(c);
        }
      }

      const c = parse(s.backgroundColor);
      if (c && c.a > 0) solids.push(c);
      if (c && c.a === 1) break;
    }

    for (let i = solids.length - 1; i >= 0; i -= 1) base = over(solids[i], base);
    if (gradientStops.length === 0) return [base];
    // The gradient paints over every pixel of the element, so `base` itself is
    // never exposed — including it would report a backdrop nobody can see.
    return gradientStops.map((stop) => over(stop, base));
  };

  const results = [];
  let checked = 0;
  let skippedGradient = 0;
  const nodes = document.querySelectorAll(
    "h1,h2,h3,h4,p,a,span,li,button,label,dt,dd,figcaption,blockquote",
  );

  for (const el of nodes) {
    // Only elements with their own visible text.
    const own = [...el.childNodes]
      .filter((n) => n.nodeType === 3)
      .map((n) => n.textContent.trim())
      .join(" ")
      .trim();
    if (!own) continue;

    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) continue;

    const s = getComputedStyle(el);
    if (s.visibility === "hidden" || s.display === "none" || +s.opacity === 0) continue;

    const fg = parse(s.color);
    const candidates = backdrops(el);
    if (!fg) continue;
    if (!candidates) {
      skippedGradient += 1;
      continue;
    }
    checked += 1;

    const size = parseFloat(s.fontSize);
    const weight = +s.fontWeight || 400;
    // WCAG "large text": 24px+, or 18.66px+ when bold.
    const large = size >= 24 || (size >= 18.66 && weight >= 700);
    const need = large ? 3 : 4.5;

    // Worst case across every shade the text may sit on.
    let got = Infinity;
    let bg = candidates[0];
    for (const cand of candidates) {
      const r2 = ratio(over(fg, cand), cand);
      if (r2 < got) {
        got = r2;
        bg = cand;
      }
    }

    if (got < need) {
      results.push({
        text: own.slice(0, 44),
        tag: el.tagName.toLowerCase(),
        color: s.color,
        bg: `rgb(${bg.r}, ${bg.g}, ${bg.b})`,
        size: Math.round(size),
        weight,
        got: Math.round(got * 100) / 100,
        need,
        cls: (el.className || "").toString().slice(0, 60),
      });
    }
  }
  return { results, checked, skippedGradient };
};

let total = 0;
let skipped = 0;

for (const path of PAGES) {
  await page.goto(BASE + path, { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);
  // Reveal animations start at opacity 0; scroll through so everything paints.
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 400) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 60));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(900);

  const { results: issues, checked, skippedGradient } = await page.evaluate(AUDIT);
  const seen = new Set();
  const unique = issues.filter((i) => {
    const k = `${i.cls}|${i.color}|${i.bg}|${i.size}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  console.log(
    `\n${path}  —  ${unique.length === 0 ? "clean" : `${unique.length} issue(s)`}` +
      `   [measured ${checked}, skipped ${skippedGradient} on images]`,
  );
  skipped += skippedGradient;
  for (const i of unique) {
    console.log(
      `  ${i.got}:1 (need ${i.need})  <${i.tag}> ${i.size}px/${i.weight}  ` +
        `${i.color} on ${i.bg}\n      "${i.text}"\n      ${i.cls}`,
    );
  }
  total += unique.length;
}

await browser.close();
console.log(
  `\n${total === 0 ? "All measured text passes WCAG AA." : `${total} contrast issue(s).`}` +
    `  ${skipped} element(s) skipped (image backdrop — check by eye).`,
);
process.exit(total === 0 ? 0 : 1);
