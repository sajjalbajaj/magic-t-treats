/**
 * Verifies the hero slider actually advances when a video finishes, and that
 * the pause control stops it. Timing behaviour like this cannot be confirmed
 * from the source — it has to be watched.
 *
 *   node scripts/check-rotation.mjs [baseUrl]
 */
import { chromium } from "@playwright/test";

const BASE = process.argv[2] ?? "http://localhost:3350";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

// Chromium blocks autoplay by default in headless; this mirrors a real visit
// where the muted reel is allowed to start on its own.
await page.goto(BASE, { waitUntil: "networkidle" });

const counter = () =>
  page.evaluate(() => {
    const nums = [...document.querySelectorAll("main section span")]
      .map((n) => n.textContent?.trim())
      .filter((t) => /^\d{2}$/.test(t ?? ""));
    return nums[0] ?? null;
  });

const videoState = () =>
  page.evaluate(() => {
    const v = document.querySelector("main section video");
    if (!v) return null;
    return {
      src: (v.getAttribute("src") ?? "").split("/").pop(),
      duration: Number.isFinite(v.duration) ? Math.round(v.duration * 10) / 10 : null,
      paused: v.paused,
      loop: v.loop,
      currentTime: Math.round(v.currentTime * 10) / 10,
    };
  });

await page.waitForTimeout(1500);
const first = { slide: await counter(), video: await videoState() };
console.log("start        ", JSON.stringify(first));

if (!first.video) {
  console.log("No video element found — cannot verify rotation.");
  await browser.close();
  process.exit(1);
}

console.log(`loop=${first.video.loop} (must be false for 'ended' to fire)`);

// Wait out the first reel plus a little slack, then confirm we moved on.
const waitMs = ((first.video.duration ?? 6) + 3) * 1000;
console.log(`waiting ${Math.round(waitMs / 1000)}s for it to finish…`);
await page.waitForTimeout(waitMs);

const second = { slide: await counter(), video: await videoState() };
console.log("after end    ", JSON.stringify(second));

const advanced = second.slide !== first.slide || second.video?.src !== first.video.src;
console.log(advanced ? "PASS  auto-advanced" : "FAIL  did not advance");

// Pause must actually stop it.
await page.getByRole("button", { name: /pause automatic slideshow/i }).click();
const paused = { slide: await counter(), video: await videoState() };
console.log(`paused: loop=${paused.video?.loop} (should be true so it holds)`);

await page.waitForTimeout(((paused.video?.duration ?? 6) + 3) * 1000);
const third = { slide: await counter(), video: await videoState() };
console.log("after pause  ", JSON.stringify(third));

const held = third.slide === paused.slide && third.video?.src === paused.video?.src;
console.log(held ? "PASS  paused holds the slide" : "FAIL  advanced while paused");

await browser.close();
process.exit(advanced && held ? 0 : 1);
