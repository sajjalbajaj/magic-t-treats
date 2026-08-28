/**
 * Extracts full-resolution stills from the reel videos.
 *
 * There is no ffmpeg on this machine, but headless Chromium decodes the H.264
 * reels perfectly well — so it can seek, paint each frame to a canvas at the
 * video's native 1080x1350, and hand back a PNG. That gives real product
 * photography at usable resolution instead of upscaling a compressed flyer.
 *
 *   node scripts/extract-frames.mjs [baseUrl]
 */
import { chromium } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";

const BASE = process.argv[2] ?? "http://localhost:3390";
const OUT = ".frames";

const SOURCES = [
  { name: "scoopable", url: "/media/scoopable-cookies-baking-reel.mp4", times: [0.2, 1, 2, 3, 4, 4.8] },
  {
    name: "kitchen",
    url: "/media/home-bakery-kitchen-reel.mp4",
    times: [0.2, 2, 4, 6, 8, 10.2],
  },
];

mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(BASE, { waitUntil: "domcontentloaded" });

for (const source of SOURCES) {
  for (const t of source.times) {
    const dataUrl = await page.evaluate(
      async ({ url, time }) => {
        const video = document.createElement("video");
        video.src = url;
        video.muted = true;
        video.crossOrigin = "anonymous";

        await new Promise((resolve, reject) => {
          video.onloadeddata = resolve;
          video.onerror = () => reject(new Error("video failed to load"));
        });

        // Seeking is async; the frame is not ready until `seeked` fires.
        await new Promise((resolve) => {
          video.onseeked = resolve;
          video.currentTime = Math.min(time, video.duration - 0.05);
        });

        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext("2d").drawImage(video, 0, 0);
        return canvas.toDataURL("image/png");
      },
      { url: source.url, time: t },
    );

    const file = `${OUT}/${source.name}-${String(t).replace(".", "_")}s.png`;
    writeFileSync(file, Buffer.from(dataUrl.split(",")[1], "base64"));
    console.log(`  ${file}`);
  }
}

await browser.close();
console.log("\nFrames extracted.");
