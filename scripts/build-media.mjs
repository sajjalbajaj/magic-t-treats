#!/usr/bin/env node
/**
 * Build the site's photography from the original files.
 *
 * Photos arrive from a phone or a download folder at full size and in whatever
 * format the source used. This turns each one into the pair the site actually
 * serves: a WebP for every modern browser and a JPEG fallback, both stripped of
 * metadata and capped at a sensible width.
 *
 * Kept as a script rather than a one-off command so a re-crop is repeatable and
 * the provenance of each file in `public/media/` is written down somewhere.
 *
 *   node scripts/build-media.mjs            # all photos
 *   node scripts/build-media.mjs scoopable  # one, by name
 *
 * Sources live outside the repo (they are large originals). A missing source is
 * skipped with a note rather than failing the run, so the script still works
 * on a machine that only has some of them.
 */
import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

const OUT_DIR = "public/media";

/**
 * Where the originals live: a sibling folder, deliberately outside this repo.
 *
 * They are 2 MB PNGs and the repo only needs the compressed pair, so keeping
 * them here means the provenance of every file in `public/media/` is recorded
 * without committing a hundred megabytes of source art.
 */
const SOURCE_DIR = "C:/My Projects/Projects/workspace/websites/personal/magic";

/**
 * `maxWidth` is the widest the photo is ever displayed at, doubled for retina.
 * Next/Image resizes down from here per breakpoint, so one source is enough.
 */
const PHOTOS = [
  {
    name: "scoopable",
    source: `${SOURCE_DIR}/Viral Scoop.png`,
    out: "viral-scoopable-cookies-molten-chocolate",
    maxWidth: 1200,
    note: "Spoon lifting a molten scoop out of the cookie tin — homepage feature.",
  },
  {
    name: "baker",
    source: `${SOURCE_DIR}/Tashu's Magic T-treats.png`,
    out: "tavishi-manohar-home-baker-tricity",
    maxWidth: 1000,
    note: "Owner portrait — about section.",
  },

  /*
    Product and lifestyle photography, 2026-08-28.
    Output names are the SEO surface: descriptive, hyphenated, no numbers.
    Landscape shots are wider because they run full-bleed in collection cards.
  */
  {
    name: "christmas-hamper",
    source: `${SOURCE_DIR}/1.png`,
    out: "christmas-chocolate-gift-hamper",
    maxWidth: 1600,
    note: "Christmas spread: brownies, cookies, truffles, cake slices. Festive collection cover.",
  },
  {
    name: "diwali-box",
    source: `${SOURCE_DIR}/2.png`,
    out: "diwali-chocolate-gift-box",
    maxWidth: 1600,
    note: "Diwali gold hamper with diyas and marigolds. Signature Gift Box.",
  },
  {
    name: "corporate-box",
    source: `${SOURCE_DIR}/3.png`,
    out: "corporate-gifting-chocolate-box",
    maxWidth: 1600,
    note: "Corporate gold hamper, desk setting. Corporate Gifting Hamper.",
  },
  {
    name: "hamper-wrapped",
    source: `${SOURCE_DIR}/5.png`,
    out: "festive-gift-hamper-hand-wrapped",
    maxWidth: 1200,
    note: "Hamper being wrapped in red tulle by hand. Festive Celebration Box.",
  },
  {
    name: "dates-chocolates",
    source: `${SOURCE_DIR}/6.png`,
    out: "handmade-dates-chocolates-box",
    maxWidth: 1200,
    note: "Stuffed-date chocolates in a red gift box. CAUTION: this is a poster with baked-in text, and the line reads 'Healthy Indul' — truncated.",
  },
  {
    name: "truffle-flavours",
    source: `${SOURCE_DIR}/7.png`,
    out: "assorted-chocolate-truffles-flavours",
    maxWidth: 1200,
    note: "Truffle flavour guide poster: Rose Kiss, Coconut Hug, Almond Crunch.",
  },
  {
    name: "scoopable-tin",
    source: `${SOURCE_DIR}/8.png`,
    out: "scoopable-cookie-tin-molten-chocolate",
    maxWidth: 1200,
    note: "Branded tin, spoon lifting a molten choco-chip scoop.",
  },
  {
    name: "cake-gift-set",
    source: `${SOURCE_DIR}/9.png`,
    out: "plum-cake-and-almond-cakes-gift-set",
    maxWidth: 1200,
    note: "Four sealed cakes with branded lids, in a gift tray.",
  },
  {
    name: "dessert-jars",
    source: `${SOURCE_DIR}/10.png`,
    out: "dessert-jars-pink-gift-bags",
    maxWidth: 1200,
    note: "Layered dessert jars in pink striped bow-handle carriers.",
  },
  {
    name: "coconut-truffles",
    source: `${SOURCE_DIR}/12.png`,
    out: "coconut-truffles-pink-gift-boxes",
    maxWidth: 1200,
    note: "Coconut truffles in an open box, stacked pink gift boxes.",
  },
  {
    name: "tea-cake-tin",
    source: `${SOURCE_DIR}/13.png`,
    out: "orange-almond-tea-cake-tin",
    maxWidth: 1200,
    note: "Almond-topped tea cake in a branded tin.",
  },

  /*
    Diwali shoot, 2026-08-28.

    A caution on all four: the label text on the packaging is garbled, and on
    `chocolate-slab` and `cookie-tins` it is mirrored outright. It is illegible
    at the sizes the site renders (checked at 400px, the real card width, where
    only the panda badge reads), so they are fine as cards and gallery tiles.
    Do NOT promote any of them to a full-width hero or feature slot, where the
    backwards lettering becomes readable.
  */
  {
    name: "festive-spread",
    source: `${SOURCE_DIR}/14.png`,
    out: "festive-cookie-gift-hamper-spread",
    maxWidth: 1200,
    note: "Cookie tins, jars and wrapped cookies with pink ribbon. Festive range.",
  },
  {
    name: "cookie-tins",
    source: `${SOURCE_DIR}/15.png`,
    out: "diwali-cookie-tins-and-brownie-boxes",
    maxWidth: 1200,
    note: "Overhead spread: cookie tins, brownie boxes, jars, gold ribbon. Mirrored lid text at full size.",
  },
  {
    name: "gift-jars",
    source: `${SOURCE_DIR}/16.png`,
    out: "diwali-cookie-gift-jars",
    maxWidth: 1200,
    note: "Six branded jars of coloured cookies on a beaded mat with a diya. Cleanest labels of the four.",
  },
  {
    name: "chocolate-slab",
    source: `${SOURCE_DIR}/17.png`,
    out: "handmade-chocolate-slabs-gift-packs",
    maxWidth: 1200,
    note: "Two packs of piped chocolate slabs. Both labels mirrored at full size.",
  },
];

const wanted = process.argv[2];
const queue = wanted ? PHOTOS.filter((p) => p.name === wanted) : PHOTOS;

if (queue.length === 0) {
  console.error(`Unknown photo "${wanted}". Known: ${PHOTOS.map((p) => p.name).join(", ")}`);
  process.exit(1);
}

await mkdir(OUT_DIR, { recursive: true });

let built = 0;
let skipped = 0;

for (const photo of queue) {
  if (!existsSync(photo.source)) {
    console.log(`skip  ${photo.name.padEnd(10)} source not on this machine (${photo.source})`);
    skipped += 1;
    continue;
  }

  // `withoutEnlargement` so a source smaller than maxWidth is left alone rather
  // than upscaled into softness.
  const base = sharp(photo.source)
    .rotate()
    .resize({ width: photo.maxWidth, withoutEnlargement: true });

  const webpPath = path.join(OUT_DIR, `${photo.out}.webp`);
  const jpgPath = path.join(OUT_DIR, `${photo.out}.jpg`);

  const { width, height } = await base.clone().webp({ quality: 82 }).toFile(webpPath);
  await base.clone().jpeg({ quality: 86, mozjpeg: true, chromaSubsampling: "4:4:4" }).toFile(jpgPath);

  console.log(`built ${photo.name.padEnd(10)} ${width}x${height}  ->  ${photo.out}.{webp,jpg}`);
  built += 1;
}

console.log(`\n${built} built, ${skipped} skipped.`);
