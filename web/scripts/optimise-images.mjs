// Grade + optimise the curated location photos for the Voyage.
// Bakes a moderate cold-cinematic base (desaturate, crush blacks, faint cool tint) so nothing reads
// stocky/bright before the runtime dawn-arc scrim warms it at the arrival. Emits AVIF + WebP at two
// widths + a tiny inline LQIP, and a manifest (aspect ratio + LQIP) the image stage reads.
import sharp from 'sharp';
import { readdir, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const SRC = path.resolve(process.argv[2] || '.img-src');
const OUT = path.resolve('public/img');
const WIDTHS = [1280, 1920];
await mkdir(OUT, { recursive: true });

// GENTLE base only — preserve colour (esp. the emerald/turquoise lakes). The cold mood is applied
// at RUNTIME, per leg, via a CSS filter driven by --dawn (cold/desaturated at the cold open, full
// colour + warmth at the arrival) plus the sky/horizon scrims. Baking the colour out here would
// kill the signature greens.
const grade = (img) =>
  img
    .modulate({ saturation: 0.9, brightness: 0.96 }) // barely pull saturation, a touch darker
    .linear(1.06, -6); // gentle contrast + slight black crush

const files = (await readdir(SRC)).filter((f) => /\.(jpe?g|png)$/i.test(f));
const manifest = {};
for (const f of files) {
  const slug = f.replace(/\.[^.]+$/, '');
  const src = path.join(SRC, f);
  const meta = await sharp(src).metadata();
  const ar = +(meta.height / meta.width).toFixed(4);
  for (const w of WIDTHS) {
    await grade(sharp(src).resize(w)).avif({ quality: 52 }).toFile(path.join(OUT, `${slug}-${w}.avif`));
    await grade(sharp(src).resize(w)).webp({ quality: 74 }).toFile(path.join(OUT, `${slug}-${w}.webp`));
  }
  const lqip = await grade(sharp(src).resize(28)).webp({ quality: 40 }).toBuffer();
  manifest[slug] = { ar, lqip: `data:image/webp;base64,${lqip.toString('base64')}` };
  console.log('graded', slug, `${meta.width}x${meta.height} → ar ${ar}`);
}
await writeFile(path.join(OUT, 'manifest.json'), JSON.stringify(manifest));
console.log('manifest:', Object.keys(manifest).length, 'images →', OUT);
