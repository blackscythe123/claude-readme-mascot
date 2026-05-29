// Assemble your 3D frame sequences into animated APNGs.
//
// Drop your Spline/Blender PNG exports here (zero-padded, same size per pose):
//   assets/frames/idle/frame_001.png, frame_002.png, ...
//   assets/frames/coding/frame_001.png, frame_002.png, ...
//
// Then run:  npm run build:frames
// Output:    dist/idle.png, dist/coding.png   (true APNG, loops forever)
//
// Tune frame delay with FRAME_MS env var (default 80ms ~= 12.5fps):
//   FRAME_MS=60 npm run build:frames

import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { PNG } from "pngjs";
import UPNG from "upng-js";

const POSES = ["idle", "coding"];
const FRAME_MS = Number(process.env.FRAME_MS || 80);
const FRAMES_DIR = "assets/frames";
const OUT_DIR = "dist";

mkdirSync(OUT_DIR, { recursive: true });

let built = 0;
for (const pose of POSES) {
  const dir = join(FRAMES_DIR, pose);
  if (!existsSync(dir)) {
    console.log(`· skip ${pose}: no folder ${dir}`);
    continue;
  }
  const files = readdirSync(dir).filter((f) => f.toLowerCase().endsWith(".png")).sort();
  if (files.length === 0) {
    console.log(`· skip ${pose}: no .png frames in ${dir}`);
    continue;
  }

  let w = 0, h = 0;
  const buffers = [];
  for (const f of files) {
    const png = PNG.sync.read(readFileSync(join(dir, f)));
    if (!w) { w = png.width; h = png.height; }
    if (png.width !== w || png.height !== h) {
      throw new Error(`${pose}/${f} is ${png.width}x${png.height}, expected ${w}x${h}. All frames must match.`);
    }
    // png.data is RGBA Buffer; UPNG wants ArrayBuffers
    buffers.push(png.data.buffer.slice(png.data.byteOffset, png.data.byteOffset + png.data.byteLength));
  }

  const delays = files.map(() => FRAME_MS);
  const apng = UPNG.encode(buffers, w, h, 0, delays); // cnum=0 -> lossless
  const outFile = join(OUT_DIR, `${pose}.png`);
  writeFileSync(outFile, Buffer.from(apng));
  console.log(`✓ ${pose}: ${files.length} frames -> ${outFile} (${w}x${h}, ${FRAME_MS}ms/frame)`);
  built++;
}

if (built === 0) {
  console.log("\nNothing built yet. Add frames under assets/frames/<pose>/ and re-run.");
  console.log("See assets/frames/README.md for the export spec.");
} else {
  console.log("\nNext: npm run upload:assets   (pushes dist/*.png into KV so /mascot.png serves them)");
}
