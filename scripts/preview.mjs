// Generate static preview SVGs you can open in a browser without running the Worker.
//   node scripts/preview.mjs
import { renderMascotSVG } from "../src/mascot.js";
import { writeFileSync, mkdirSync } from "node:fs";

mkdirSync("assets", { recursive: true });
const now = Date.now();

const out = [
  ["assets/preview-coding.svg", { status: "coding", tool: "claude", sinceMs: now - 1000 * 60 * 23, nowMs: now }],
  ["assets/preview-idle.svg",   { status: "idle",   tool: "claude", sinceMs: now - 1000 * 60 * 8,  nowMs: now }],
  ["assets/preview-codex.svg",  { status: "coding", tool: "codex",  sinceMs: now - 1000 * 60 * 4,  nowMs: now }],
  ["assets/preview-gemini.svg", { status: "coding", tool: "gemini", sinceMs: now - 1000 * 60 * 12, nowMs: now }],
];

for (const [file, state] of out) {
  writeFileSync(file, renderMascotSVG(state));
  console.log("wrote", file);
}
console.log("\nOpen any of them in a browser to see the animation.");
