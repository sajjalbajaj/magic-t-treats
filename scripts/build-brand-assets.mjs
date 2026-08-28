/**
 * Derives every brand asset from the single high-resolution logo.
 *
 * Kept in the repo so the set can be regenerated consistently when the artwork
 * changes — rather than being a pile of one-off exports nobody can reproduce.
 *
 *   node scripts/build-brand-assets.mjs [path-to-source.png]
 *
 * Outputs:
 *   public/brand/logo.png        512×512  square badge, for UI marks
 *   public/brand/logo@1024.png  1024×1024 square badge, for print / retina
 *   public/brand/og.png         1200×630  Open Graph / share card
 *   src/app/icon.png             256×256  favicon (Next file convention)
 *   src/app/apple-icon.png       180×180  iOS home screen
 */
import { mkdirSync } from "node:fs";
import sharp from "sharp";

const SOURCE = process.argv[2] ?? "C:/Users/MSS/Downloads/Magic ttreats.png";

/**
 * The artwork is a 2:3 portrait canvas with the circular badge floating in the
 * middle of a lot of pink. These bounds were measured from the dark outline of
 * the badge, then squared off with a little breathing room.
 */
const BADGE = { left: 112, top: 363, width: 800, height: 800 };

/** Sampled from the artwork: corner, mid and inner-badge pinks. */
const PINK_DEEP = "#ff2772";
const PINK_MID = "#ff488d";

mkdirSync("public/brand", { recursive: true });

const badge = () => sharp(SOURCE).extract(BADGE);

/**
 * Circular alpha mask.
 *
 * The badge is round but the artwork is square, so any use against a
 * non-matching background shows a pink box around it. Masking to a circle once,
 * here, means the asset is correct everywhere instead of relying on each
 * consumer to clip it with CSS.
 *
 * Radius is 95.5% of the half-width: the dark outline reaches ~93%, so this
 * keeps a hair of the badge's own pink and no more.
 */
function circleMask(size) {
  const r = Math.round((size / 2) * 0.955);
  return Buffer.from(
    `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">` +
      `<circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="#fff"/></svg>`,
  );
}

async function square(size, out, { round = false } = {}) {
  let pipeline = badge().resize(size, size, { fit: "cover" });

  if (round) {
    pipeline = sharp(await pipeline.png().toBuffer()).composite([
      { input: circleMask(size), blend: "dest-in" },
    ]);
  }

  await pipeline.png({ quality: 90, compressionLevel: 9 }).toFile(out);
  console.log(`  ${out}  ${size}×${size}${round ? "  (circular)" : ""}`);
}

await square(1024, "public/brand/logo@1024.png", { round: true });
await square(512, "public/brand/logo.png", { round: true });
await square(512, "public/brand/logo-square.png");
await square(256, "src/app/icon.png", { round: true });
// iOS applies its own rounded-rect mask, so this one stays square — a circular
// icon inside that mask would float with visible gaps at the corners.
await square(180, "src/app/apple-icon.png");

/* --------------------------------------------------------------------------
   Open Graph card.

   The badge already carries the name and tagline, so the card only has to
   present it large and legible at the ~250px wide thumbnail most feeds render.
   Text is drawn as SVG paths-free markup with a generic family stack; if the
   renderer substitutes a font it still reads correctly, because nothing here
   depends on exact metrics.
-------------------------------------------------------------------------- */
const OG_W = 1200;
const OG_H = 630;
const BADGE_SIZE = 470;

const background = Buffer.from(`
<svg width="${OG_W}" height="${OG_H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="g" cx="32%" cy="45%" r="85%">
      <stop offset="0%" stop-color="${PINK_MID}"/>
      <stop offset="100%" stop-color="${PINK_DEEP}"/>
    </radialGradient>
  </defs>
  <rect width="${OG_W}" height="${OG_H}" fill="url(#g)"/>
</svg>`);

const text = Buffer.from(`
<svg width="${OG_W}" height="${OG_H}" xmlns="http://www.w3.org/2000/svg">
  <style>
    .name { font-family: Georgia, 'Times New Roman', serif; font-size: 76px; fill: #ffffff; }
    .tag  { font-family: 'Segoe UI', Arial, sans-serif; font-size: 32px; fill: #ffffff; opacity: .95; }
    .area { font-family: 'Segoe UI', Arial, sans-serif; font-size: 25px; fill: #ffffff; opacity: .82;
            letter-spacing: 2px; }
  </style>
  <text x="560" y="272" class="name">Magic T-treats</text>
  <text x="562" y="330" class="tag">Homemade Chocolates and Cakes</text>
  <text x="562" y="392" class="area">CHANDIGARH · MOHALI · PANCHKULA</text>
</svg>`);

const badgePng = await sharp(
  await badge().resize(BADGE_SIZE, BADGE_SIZE, { fit: "cover" }).png().toBuffer(),
)
  .composite([{ input: circleMask(BADGE_SIZE), blend: "dest-in" }])
  .png()
  .toBuffer();

await sharp(background)
  .composite([
    { input: badgePng, left: 60, top: Math.round((OG_H - BADGE_SIZE) / 2) },
    { input: text, left: 0, top: 0 },
  ])
  .png({ quality: 90, compressionLevel: 9 })
  .toFile("public/brand/og.png");

console.log(`  public/brand/og.png  ${OG_W}×${OG_H}`);
console.log("\nBrand assets rebuilt.");
