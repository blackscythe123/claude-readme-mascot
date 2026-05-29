// Placeholder mascot renderer — a state-aware animated SVG.
//
// This is a pure function (no Cloudflare APIs) so it can run both inside the
// Worker AND in a plain Node script (scripts/preview.mjs) to emit static files.
//
// When you have real 3D frames (Spline/Blender export -> APNG), the Worker
// serves those from /mascot.png instead; this SVG is the always-available
// fallback and the thing you see today.

const PALETTES = {
  claude:  { name: "Claude", base: "#D97757", light: "#F2A883", dark: "#B85738", accent: "#D97757" },
  codex:   { name: "Codex",  base: "#10A37F", light: "#4FD1B0", dark: "#0B7A5E", accent: "#10A37F" },
  gemini:  { name: "Gemini", base: "#4285F4", light: "#7FB0FF", dark: "#2A5FC7", accent: "#4285F4" },
  copilot: { name: "Copilot",base: "#8B7CF6", light: "#B5AAFB", dark: "#5F4FD6", accent: "#8B7CF6" },
  cursor:  { name: "Cursor", base: "#6E6E6E", light: "#A3A3A3", dark: "#3F3F3F", accent: "#6E6E6E" },
  default: { name: "your agent", base: "#8B7CF6", light: "#B5AAFB", dark: "#5F4FD6", accent: "#8B7CF6" },
};

const INK = "#3B2A22"; // eyes / mouth
const KEYS = "#4A3429"; // keyboard

function palette(tool) {
  return PALETTES[(tool || "").toLowerCase()] || PALETTES.default;
}

function formatElapsed(ms) {
  if (!ms || ms < 0) return "0s";
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

function esc(str) {
  return String(str).replace(/[<>&'"]/g, (c) => (
    { "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&#39;", '"': "&quot;" }[c]
  ));
}

const SPARKLE = "M0,-9 C1.6,-3 3,-1.6 9,0 C3,1.6 1.6,3 0,9 C-1.6,3 -3,1.6 -9,0 C-3,-1.6 -1.6,-3 0,-9 Z";

export function renderMascotSVG(state = {}) {
  const { status = "idle", tool = "claude", sinceMs = 0, nowMs = 0 } = state;
  const p = palette(tool);
  const coding = status === "coding";
  const elapsed = formatElapsed(nowMs - sinceMs);

  const title = coding ? `${p.name} is coding` : `${p.name} is napping`;
  const sub = coding
    ? `deep in the zone — ${elapsed}`
    : sinceMs
      ? `resting — idle for ${elapsed}`
      : `waiting for a session…`;
  const pillText = coding ? "● live · coding now" : "○ idle";

  // --- character: drawn in local coords, body center at (0,0), then placed ---
  const eyes = coding
    ? `
      <ellipse cx="-18" cy="-2" rx="6" ry="7" fill="${INK}">
        <animate attributeName="ry" values="7;7;7;1;7;7" keyTimes="0;0.86;0.9;0.93;0.96;1" dur="4.2s" repeatCount="indefinite"/>
      </ellipse>
      <ellipse cx="18" cy="-2" rx="6" ry="7" fill="${INK}">
        <animate attributeName="ry" values="7;7;7;1;7;7" keyTimes="0;0.86;0.9;0.93;0.96;1" dur="4.2s" repeatCount="indefinite"/>
      </ellipse>
      <circle cx="-16" cy="-5" r="2" fill="#fff" opacity="0.95"/>
      <circle cx="20" cy="-5" r="2" fill="#fff" opacity="0.95"/>`
    : `
      <path d="M-24,-2 q6,7 12,0" stroke="${INK}" stroke-width="3" stroke-linecap="round" fill="none"/>
      <path d="M12,-2 q6,7 12,0" stroke="${INK}" stroke-width="3" stroke-linecap="round" fill="none"/>`;

  const mouth = coding
    ? `<path d="M-9,15 q9,11 18,0" stroke="${INK}" stroke-width="3" stroke-linecap="round" fill="none"/>`
    : `<path d="M-6,16 q6,5 12,0" stroke="${INK}" stroke-width="3" stroke-linecap="round" fill="none"/>`;

  // typing rig (coding only)
  const typing = coding
    ? `
      <rect x="-26" y="50" width="52" height="9" rx="4.5" fill="${KEYS}"/>
      <ellipse cx="-12" cy="48" rx="7.5" ry="5.5" fill="${p.light}" stroke="${p.dark}" stroke-width="1.5">
        <animate attributeName="cy" values="48;43;48" dur="0.42s" repeatCount="indefinite"/>
      </ellipse>
      <ellipse cx="12" cy="48" rx="7.5" ry="5.5" fill="${p.light}" stroke="${p.dark}" stroke-width="1.5">
        <animate attributeName="cy" values="43;48;43" dur="0.42s" repeatCount="indefinite"/>
      </ellipse>`
    : "";

  // sparkles (coding) vs Zzz (idle), top-right of head
  const sparkles = coding
    ? `
      <g transform="translate(34 -42)" fill="${p.accent}">
        <path d="${SPARKLE}">
          <animateTransform attributeName="transform" type="scale" additive="sum" values="0.5;1;0.5" dur="1.6s" repeatCount="indefinite"/>
        </path>
        <animate attributeName="opacity" values="0.2;1;0.2" dur="1.6s" repeatCount="indefinite"/>
      </g>
      <g transform="translate(48 -20)" fill="${p.accent}">
        <path d="${SPARKLE}" transform="scale(0.6)">
          <animateTransform attributeName="transform" type="scale" additive="sum" values="0.7;1.1;0.7" dur="2s" begin="0.4s" repeatCount="indefinite"/>
        </path>
        <animate attributeName="opacity" values="0.15;0.9;0.15" dur="2s" begin="0.4s" repeatCount="indefinite"/>
      </g>`
    : `
      <text x="26" y="-40" font-family="'Segoe UI', system-ui, sans-serif" font-size="13" font-weight="700" fill="${p.dark}" opacity="0">z
        <animate attributeName="opacity" values="0;0.9;0" dur="3s" repeatCount="indefinite"/>
        <animateTransform attributeName="transform" type="translate" values="0 0;6 -10" dur="3s" repeatCount="indefinite"/>
      </text>
      <text x="38" y="-50" font-family="'Segoe UI', system-ui, sans-serif" font-size="17" font-weight="700" fill="${p.dark}" opacity="0">z
        <animate attributeName="opacity" values="0;0.9;0" dur="3s" begin="0.7s" repeatCount="indefinite"/>
        <animateTransform attributeName="transform" type="translate" values="0 0;7 -12" dur="3s" begin="0.7s" repeatCount="indefinite"/>
      </text>
      <text x="52" y="-62" font-family="'Segoe UI', system-ui, sans-serif" font-size="22" font-weight="700" fill="${p.dark}" opacity="0">Z
        <animate attributeName="opacity" values="0;0.9;0" dur="3s" begin="1.4s" repeatCount="indefinite"/>
        <animateTransform attributeName="transform" type="translate" values="0 0;9 -14" dur="3s" begin="1.4s" repeatCount="indefinite"/>
      </text>`;

  // body bob (coding: lively) vs (idle: slow gentle)
  const bob = coding
    ? `<animateTransform attributeName="transform" type="translate" values="0 0;0 -5;0 0" dur="1.4s" repeatCount="indefinite" calcMode="spline" keyTimes="0;0.5;1" keySplines="0.45 0 0.55 1;0.45 0 0.55 1"/>`
    : `<animateTransform attributeName="transform" type="translate" values="0 0;0 3;0 0" dur="3.6s" repeatCount="indefinite" calcMode="spline" keyTimes="0;0.5;1" keySplines="0.45 0 0.55 1;0.45 0 0.55 1"/>`;

  const pill = coding
    ? `<circle cx="258" cy="151" r="5" fill="${p.accent}"><animate attributeName="opacity" values="1;0.25;1" dur="1.3s" repeatCount="indefinite"/></circle>`
    : `<circle cx="258" cy="151" r="5" fill="none" stroke="#B9B2AC" stroke-width="2"/>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="220" viewBox="0 0 480 220" role="img" aria-label="${esc(title)}">
  <defs>
    <linearGradient id="card" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#FFFDFB"/>
      <stop offset="1" stop-color="#FBF3EC"/>
    </linearGradient>
    <radialGradient id="body" cx="36%" cy="30%" r="75%">
      <stop offset="0" stop-color="${p.light}"/>
      <stop offset="0.55" stop-color="${p.base}"/>
      <stop offset="1" stop-color="${p.dark}"/>
    </radialGradient>
    <radialGradient id="glow" cx="50%" cy="0%" r="80%">
      <stop offset="0" stop-color="${p.accent}" stop-opacity="0.18"/>
      <stop offset="1" stop-color="${p.accent}" stop-opacity="0"/>
    </radialGradient>
    <filter id="soft" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="3.2"/>
    </filter>
  </defs>

  <rect x="3" y="3" width="474" height="214" rx="26" fill="url(#card)" stroke="${p.accent}" stroke-opacity="0.28" stroke-width="2"/>
  <rect x="3" y="3" width="474" height="120" rx="26" fill="url(#glow)"/>

  <!-- ground shadow (does not move with bob) -->
  <ellipse cx="120" cy="180" rx="46" ry="9" fill="${p.dark}" opacity="0.22" filter="url(#soft)">
    <animate attributeName="rx" values="46;40;46" dur="${coding ? "1.4s" : "3.6s"}" repeatCount="indefinite"/>
    <animate attributeName="opacity" values="0.22;0.14;0.22" dur="${coding ? "1.4s" : "3.6s"}" repeatCount="indefinite"/>
  </ellipse>

  <!-- character -->
  <g transform="translate(120 112)">
    <g>
      ${bob}
      <ellipse cx="0" cy="0" rx="48" ry="50" fill="url(#body)"/>
      <ellipse cx="-15" cy="-20" rx="20" ry="13" fill="#ffffff" opacity="0.28"/>
      <ellipse cx="-32" cy="11" rx="6" ry="4" fill="${p.dark}" opacity="0.25"/>
      <ellipse cx="32" cy="11" rx="6" ry="4" fill="${p.dark}" opacity="0.25"/>
      ${eyes}
      ${mouth}
      ${typing}
      ${sparkles}
    </g>
  </g>

  <!-- status text -->
  <text x="250" y="92" font-family="'Segoe UI', system-ui, -apple-system, sans-serif" font-size="25" font-weight="700" fill="#2B2622">${esc(title)}</text>
  <text x="250" y="120" font-family="'Segoe UI', system-ui, -apple-system, sans-serif" font-size="15" fill="#8A817B">${esc(sub)}</text>
  ${pill}
  <text x="272" y="156" font-family="'Segoe UI', system-ui, -apple-system, sans-serif" font-size="14" font-weight="600" fill="${coding ? p.accent : "#9A938D"}">${esc(pillText)}</text>
  <text x="250" y="192" font-family="'Segoe UI', system-ui, -apple-system, sans-serif" font-size="11" fill="#B9B2AC">powered by ${esc(p.name)} · live on view</text>
</svg>`;
}

export { palette, formatElapsed };
