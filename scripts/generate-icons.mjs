/**
 * Rasterize src/icons/icon.svg into PWA PNG sizes (no permanent deps).
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { execSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const iconsDir = join(root, "src", "icons");
const svgPath = join(iconsDir, "icon.svg");

execSync("npm install --no-save sharp", {
  cwd: root,
  stdio: "inherit",
});

const require = createRequire(import.meta.url);
const sharp = require(join(root, "node_modules", "sharp"));

const svg = await readFile(svgPath);
await mkdir(iconsDir, { recursive: true });

async function writePng(name, size, { padding = 0 } = {}) {
  let pipeline = sharp(svg).resize(size, size);
  if (padding > 0) {
    const inner = Math.round(size * (1 - 2 * padding));
    const pad = Math.round((size - inner) / 2);
    pipeline = sharp(svg)
      .resize(inner, inner)
      .extend({
        top: pad,
        bottom: pad,
        left: pad,
        right: pad,
        background: { r: 250, g: 248, b: 244, alpha: 1 },
      })
      .resize(size, size);
  }
  const buf = await pipeline.png().toBuffer();
  const out = join(iconsDir, name);
  await writeFile(out, buf);
  console.log("wrote", out);
}

await writePng("icon-192.png", 192);
await writePng("icon-512.png", 512);
await writePng("apple-touch-icon.png", 180);
// Maskable: keep mark inside safe zone (~80% / 10% padding each side)
await writePng("icon-maskable-512.png", 512, { padding: 0.1 });
