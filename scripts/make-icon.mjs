// Render a 128x128 PNG icon for the VS Code extension from an inline SVG.
//   node scripts/make-icon.mjs
import { Resvg } from "@resvg/resvg-js";
import { writeFileSync } from "node:fs";

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#211711"/>
      <stop offset="1" stop-color="#120D0A"/>
    </linearGradient>
  </defs>
  <rect width="128" height="128" rx="28" fill="url(#bg)"/>
  <!-- head -->
  <rect x="26" y="28" width="76" height="62" rx="10" fill="#C27C5C"/>
  <!-- headband -->
  <rect x="22" y="37" width="84" height="13" rx="2" fill="#E0936F"/>
  <rect x="100" y="40" width="9" height="5" fill="#E0936F"/>
  <rect x="106" y="44" width="6" height="4" fill="#B0673E"/>
  <!-- eyes -->
  <rect x="44" y="55" width="10" height="17" fill="#1A1A1A"/>
  <rect x="74" y="55" width="10" height="17" fill="#1A1A1A"/>
  <!-- laptop -->
  <rect x="30" y="82" width="68" height="22" rx="4" fill="#33251C"/>
  <rect x="40" y="80" width="48" height="4" rx="2" fill="#7CF5C0" opacity="0.75"/>
  <rect x="26" y="102" width="76" height="9" rx="3" fill="#241A13"/>
</svg>`;

const png = new Resvg(svg, { fitTo: { mode: "width", value: 128 } }).render().asPng();
writeFileSync("extension/icon.png", png);
console.log("wrote extension/icon.png —", png.length, "bytes");
