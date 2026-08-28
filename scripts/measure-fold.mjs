/**
 * Measures whether the hero fits above the fold at real viewport sizes, and
 * saves a screenshot of each. Guessing at this from CSS is how heroes end up
 * 80px too tall on exactly one laptop size.
 *
 *   node scripts/measure-fold.mjs [baseUrl]
 */
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";

const BASE = process.argv[2] ?? "http://localhost:3330";
const OUT = ".fold-shots";

const VIEWPORTS = [
  { name: "laptop-1366x768", width: 1366, height: 768 },
  { name: "laptop-1440x900", width: 1440, height: 900 },
  { name: "desktop-1920x1080", width: 1920, height: 1080 },
  { name: "tablet-768x1024", width: 768, height: 1024 },
  { name: "mobile-390x844", width: 390, height: 844 },
  { name: "mobile-375x667", width: 375, height: 667 },
];

mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
let failures = 0;

for (const vp of VIEWPORTS) {
  const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
  await page.goto(BASE, { waitUntil: "networkidle" });
  // Let the entrance animations settle before measuring.
  await page.waitForTimeout(900);

  const m = await page.evaluate(() => {
    const header = document.querySelector("header");
    const hero = document.querySelector("main section");
    const cta = document.querySelector('main a[href="#treats"]');
    const media = document.querySelector("main section video, main section img");

    const box = (el) => (el ? el.getBoundingClientRect() : null);
    const h = box(hero);
    const c = box(cta);
    const mm = box(media);

    return {
      viewportH: window.innerHeight,
      headerH: header ? header.getBoundingClientRect().height : 0,
      heroBottom: h ? Math.round(h.bottom) : null,
      ctaBottom: c ? Math.round(c.bottom) : null,
      mediaBottom: mm ? Math.round(mm.bottom) : null,
      scrollH: document.documentElement.scrollHeight,
      // Horizontal overflow is the other half of "fits the screen", and is
      // easy to miss when only measuring height.
      docScrollW: document.documentElement.scrollWidth,
      docClientW: document.documentElement.clientWidth,
      widest: (() => {
        // Only real content counts. Two things legitimately extend past the
        // viewport and must not be flagged:
        //   - decorative layers (aria-hidden / pointer-events-none) that an
        //     ancestor clips on purpose, e.g. the blurred background blobs;
        //   - children of a deliberately horizontal scroller (.scroll-rail),
        //     where overflowing IS the design.
        // An ancestor that clips or scrolls means this element cannot widen
        // the page, whatever its own box says. That covers .scroll-rail and
        // the reveal wrappers, whose inner layer sits at scale 1.12 until it
        // animates in.
        const contained = (el) => {
          for (let n = el.parentElement; n && n !== document.body; n = n.parentElement) {
            const o = getComputedStyle(n).overflowX;
            if (o === "auto" || o === "scroll" || o === "hidden" || o === "clip") return true;
          }
          return false;
        };
        const decorative = (el) => {
          for (let n = el; n && n !== document.body; n = n.parentElement) {
            if (n.getAttribute("aria-hidden") === "true") return true;
            if (getComputedStyle(n).pointerEvents === "none") return true;
          }
          return false;
        };

        let worst = null;
        for (const el of document.querySelectorAll("main *")) {
          const r = el.getBoundingClientRect();
          const over = Math.round(r.right - window.innerWidth);
          if (over <= 1) continue;
          if (decorative(el) || contained(el)) continue;
          if (!worst || over > worst.over) {
            worst = {
              over,
              tag: el.tagName.toLowerCase(),
              cls: (el.className || "").toString().slice(0, 70),
            };
          }
        }
        return worst;
      })(),
    };
  });

  const fits = m.heroBottom !== null && m.heroBottom <= m.viewportH + 1;
  const ctaVisible = m.ctaBottom !== null && m.ctaBottom <= m.viewportH;
  // Element overflow, not document scrollWidth: the hero card is
  // `overflow-hidden`, so an over-wide child is silently clipped rather than
  // producing a scrollbar. Checking only the document would call that a pass.
  const noHScroll = m.docScrollW <= m.docClientW + 1 && !m.widest;
  if (!fits || !noHScroll) failures += 1;

  console.log(
    `${fits ? "PASS" : "FAIL"}  ${vp.name.padEnd(18)} ` +
      `viewport=${m.viewportH}  header=${Math.round(m.headerH)}  ` +
      `heroBottom=${m.heroBottom}  overflow=${m.heroBottom - m.viewportH}  ` +
      `cta${ctaVisible ? "✓" : "✗"}  hscroll${noHScroll ? "✓" : "✗"}`,
  );

  if (m.widest) {
    console.log(
      `      overflows by ${m.widest.over}px: <${m.widest.tag}> ${m.widest.cls}`,
    );
  }

  await page.screenshot({ path: `${OUT}/${vp.name}.png` });
  await page.close();
}

await browser.close();
console.log(`\n${failures === 0 ? "All viewports fit the fold." : `${failures} viewport(s) overflow.`}`);
