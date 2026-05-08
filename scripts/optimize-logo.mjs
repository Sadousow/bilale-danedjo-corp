import sharp from "sharp";
import { mkdir, unlink } from "node:fs/promises";

const src = "public/brand/logo-original.jpg";
const out = "public/brand";

await mkdir(out, { recursive: true });

const meta = await sharp(src).metadata();
console.log(`Source: ${meta.width}x${meta.height}`);

const W = meta.width;
const H = meta.height;

// Layout (measured): top 46% = full logo with text, top 32% = mark only,
// rest = color variants (ignore).

async function cropAndKeyOutWhite(extract, resizeWidth, dest) {
  // Crop, resize, then knock out the white background using raw pixel processing.
  const { data, info } = await sharp(src)
    .extract(extract)
    .resize({ width: resizeWidth, withoutEnlargement: true })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const pixels = Buffer.from(data);
  // White-key thresholds:
  //   minChannel > 245  → fully transparent (pure white)
  //   minChannel 220–245 → soft edge, partial transparency
  //   minChannel < 220  → keep opaque (real logo content)
  const HARD = 245;
  const SOFT = 220;

  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];
    const minC = Math.min(r, g, b);

    if (minC >= HARD) {
      pixels[i + 3] = 0;
    } else if (minC >= SOFT) {
      // linear ramp 220→245 maps to 255→0
      pixels[i + 3] = Math.round(((HARD - minC) / (HARD - SOFT)) * 255);
    }
  }

  await sharp(pixels, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png({ quality: 92, compressionLevel: 9 })
    .toFile(dest);
}

await cropAndKeyOutWhite(
  { left: Math.floor(W * 0.225), top: 0, width: Math.floor(W * 0.55), height: Math.floor(H * 0.435) },
  800,
  `${out}/logo-full.png`
);

await cropAndKeyOutWhite(
  { left: Math.floor(W * 0.25), top: 0, width: Math.floor(W * 0.5), height: Math.floor(H * 0.32) },
  400,
  `${out}/logo-mark.png`
);

const squareSize = Math.floor(H * 0.3);
await cropAndKeyOutWhite(
  { left: Math.floor((W - squareSize) / 2), top: 0, width: squareSize, height: squareSize },
  256,
  `${out}/logo-square.png`
);

try { await unlink(`${out}/_inspect.png`); } catch {}
try { await unlink(`${out}/logo-mark-light.png`); } catch {}

console.log("Generated (white background removed):");
console.log(" - public/brand/logo-full.png   (with company name)");
console.log(" - public/brand/logo-mark.png   (icon only, no text)");
console.log(" - public/brand/logo-square.png (square BD ring)");
