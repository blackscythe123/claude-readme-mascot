// Push built APNGs into KV so the deployed Worker serves them at /mascot.png.
//   npm run upload:assets
// Requires: wrangler logged in, MASCOT_KV namespace id filled into wrangler.toml.

import { existsSync } from "node:fs";
import { execFileSync } from "node:child_process";

const POSES = ["idle", "coding"];
const npx = process.platform === "win32" ? "npx.cmd" : "npx";

let uploaded = 0;
for (const pose of POSES) {
  const file = `dist/${pose}.png`;
  if (!existsSync(file)) {
    console.log(`· skip ${pose}: ${file} not found (run npm run build:frames first)`);
    continue;
  }
  console.log(`↑ uploading ${file} -> asset:${pose}`);
  execFileSync(
    npx,
    ["wrangler", "kv", "key", "put", "--binding=MASCOT_KV", "--remote", `asset:${pose}`, "--path", file],
    { stdio: "inherit" }
  );
  uploaded++;
}

console.log(uploaded ? `\nDone. /mascot.png now serves your 3D frames.` : "\nNothing uploaded.");
