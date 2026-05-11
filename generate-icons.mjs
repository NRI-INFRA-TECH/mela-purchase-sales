// Run once: node generate-icons.mjs
import { Jimp } from "jimp";
import { readFileSync } from "fs";
import { resolve } from "path";

const BG_COLOR = 0xFF4B00FF; // BazarMela orange

async function makeIcon(size, outputPath) {
  // Orange background
  const bg = new Jimp({ width: size, height: size, color: BG_COLOR });

  // Load logo and fit it inside with padding
  const logoBuffer = readFileSync(resolve("src/assets/logo.png"));
  const logo = await Jimp.fromBuffer(logoBuffer);
  const padding = Math.round(size * 0.15);
  const logoSize = size - padding * 2;
  logo.resize({ w: logoSize, h: logoSize });

  // Center logo on background
  bg.composite(logo, padding, padding);
  await bg.write(outputPath);
  console.log(`✓ ${outputPath}`);
}

await makeIcon(192, "public/pwa-192.png");
await makeIcon(512, "public/pwa-512.png");
await makeIcon(180, "public/apple-touch-icon.png");
console.log("Done!");
