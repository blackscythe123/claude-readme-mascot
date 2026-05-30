// Mascot renderer — the Claude Claude, themeable + state-aware animated SVG.
//
// Character geometry ported from `clawd-react` by Steve Smith (MIT License) —
// https://github.com/stevysmith/clawd-react. framer-motion (JS) is replaced
// with declarative SMIL so it animates inside a GitHub README <img> (no JS).
// The headband + jump/confetti beat nods to the Codrops "Gym Claude"
// breakdown. See THIRD_PARTY_NOTICES.md.
//
// coding -> Claude stands behind a laptop on the floor (lid facing him, screen
//           glow leaking over the top), wears a headband, types, and every few
//           seconds does a happy jump with a confetti splash.
// idle   -> sleeps (closed eyes, slow breathing, Zzz).
//
// Theming is via resolveTheme(query) -> options object; renderMascotSVG(opts)
// fills any missing field with light-theme defaults so it also works in Node.
// Pure functions (no server APIs).

const EYE = "#1A1A1A";
const ZS = "#818CF8";
const CONFETTI = ["#FDE047", "#7CF5C0", "#818CF8", "#FF9FB2", "#FFFFFF", "#FFB454"];

const FONTS = {
  system: "'Segoe UI', system-ui, -apple-system, sans-serif",
  mono: "ui-monospace, 'Cascadia Code', SFMono-Regular, monospace",
  inter: "'Inter', system-ui, sans-serif",
  serif: "Georgia, 'Times New Roman', serif",
};

const THEMES = {
  light:    { bg: "#FBF3EC", text: "#2B2622", body: "#C27C5C", accent: "#C27C5C", device: "#33251C" },
  dark:     { bg: "#16120F", text: "#F0E9E3", body: "#C27C5C", accent: "#E0936F", device: "#0C0907" },
  terminal: { bg: "#08140E", text: "#B9F5D8", body: "#3FB984", accent: "#7CF5C0", device: "#04100A" },
  candy:    { bg: "#FFE9F1", text: "#5A2A3E", body: "#FF9FB2", accent: "#FF6FA0", device: "#3E2230" },
};

const LOOP = "5s";
// Jump path (shared by body + hands groups so they stay in sync; laptop stays put).
const JUMP = `<animateTransform attributeName="transform" type="translate" values="0 0;0 0;0 4;0 -22;0 0;0 0" keyTimes="0;0.6;0.66;0.74;0.86;1" calcMode="spline" keySplines="0.4 0 0.6 1;0.3 0 0.7 1;0.1 0.7 0.3 1;0.6 0 0.9 0.3;0.4 0 0.6 1" dur="${LOOP}" repeatCount="indefinite"/>`;

// ---------- helpers ----------
function esc(str) {
  return String(str).replace(/[<>&'"]/g, (c) => (
    { "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&#39;", '"': "&quot;" }[c]
  ));
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

function darken(hex, f = 0.62) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || "");
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const r = Math.round(((n >> 16) & 255) * f);
  const g = Math.round(((n >> 8) & 255) * f);
  const b = Math.round((n & 255) * f);
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

function hexColor(v, def) {
  if (typeof v !== "string") return def;
  if (v.toLowerCase() === "transparent") return "transparent";
  const s = v.replace(/^#/, "");
  return /^([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(s) ? `#${s}` : def;
}
function pickEnum(v, allowed, def) { return allowed.includes(v) ? v : def; }
function clampInt(v, lo, hi, def) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : def;
}
function boolParam(v, def) {
  if (v === undefined || v === null || v === "") return def;
  return v === "true" || v === "1";
}
function sanitizeText(v, def, max = 20) {
  if (typeof v !== "string") return def;
  let s = v;
  try { s = decodeURIComponent(v); } catch { /* keep raw */ }
  s = s.replace(/[^A-Za-z0-9 _.:!?-]/g, "").trim().slice(0, max);
  return s || def;
}

// Parse + validate a query-param object into render options.
export function resolveTheme(q = {}) {
  const preset = THEMES[pickEnum(q.theme, Object.keys(THEMES), "light")];
  return {
    status: pickEnum(q.status, ["coding", "idle"], "idle"),
    mins: clampInt(q.mins, 0, 60 * 48, 23),
    bg: hexColor(q.bg, preset.bg),
    text: hexColor(q.text, preset.text),
    body: hexColor(q.body, preset.body),
    accent: hexColor(q.accent, preset.accent),
    device: hexColor(q.device, preset.device),
    font: FONTS[pickEnum(q.font, Object.keys(FONTS), "system")],
    hideTime: boolParam(q.hide_time, false),
    label: sanitizeText(q.label, "Claude"),
    border: boolParam(q.border, true),
    radius: clampInt(q.radius, 0, 40, 26),
  };
}

// ---------- renderer ----------
export function renderMascotSVG(opts = {}) {
  const t = { ...resolveTheme({}), ...opts };
  const coding = t.status === "coding";
  const elapsed = (t.sinceMs && t.nowMs)
    ? formatElapsed(t.nowMs - t.sinceMs)
    : formatElapsed(t.mins * 60000);

  const body = t.body;
  const bodyDark = darken(body);
  const accent = t.accent;
  const device = t.device;
  const font = t.font;
  const text = t.text;
  const cardFill = t.bg === "transparent" ? "none" : "url(#card)";

  const title = coding ? `${t.label} is coding` : `${t.label} is napping`;
  const sub = coding
    ? (t.hideTime ? "at the keyboard" : `at the keyboard · ${elapsed}`)
    : (t.hideTime ? "taking a nap" : `idle for ${elapsed}`);
  const pillText = coding ? "● live · coding now" : "○ idle";

  // ===== coding scene =====
  const codingScene = `
    <ellipse cx="52" cy="98" rx="52" ry="7" fill="#000" opacity="0.14">
      <animate attributeName="rx" values="52;52;30;54;52" keyTimes="0;0.66;0.74;0.88;1" dur="${LOOP}" repeatCount="indefinite"/>
      <animate attributeName="opacity" values="0.14;0.14;0.06;0.15;0.14" keyTimes="0;0.66;0.74;0.88;1" dur="${LOOP}" repeatCount="indefinite"/>
    </ellipse>

    <!-- Claude (behind the laptop); head + headband peek above the lid -->
    <g>${JUMP}<g><animateTransform attributeName="transform" type="translate" values="0 0;0 -1.5;0 0" dur="0.5s" repeatCount="indefinite"/>
      <rect x="8" y="0" width="96" height="52" fill="${body}"/>
      <rect x="5" y="6" width="94" height="8" fill="${accent}"/>
      <rect x="99" y="9" width="10" height="4" fill="${accent}"/>
      <rect x="104" y="13" width="8" height="4" fill="${darken(accent)}"/>
      <rect x="28" y="18" width="8" height="14" fill="${EYE}"><animate attributeName="height" values="14;14;14;2;14;14" keyTimes="0;0.84;0.88;0.91;0.95;1" dur="4.3s" repeatCount="indefinite"/></rect>
      <rect x="76" y="18" width="8" height="14" fill="${EYE}"><animate attributeName="height" values="14;14;14;2;14;14" keyTimes="0;0.84;0.88;0.91;0.95;1" dur="4.3s" repeatCount="indefinite"/></rect>
    </g></g>

    <!-- laptop lid (back, facing Claude) on the floor -->
    <rect x="-4" y="36" width="112" height="54" rx="7" fill="${device}"/>
    <rect x="44" y="56" width="16" height="12" rx="2" fill="${accent}" opacity="0.22"/>
    <!-- screen glow leaking over the top edge -->
    <rect x="2" y="33" width="100" height="6" rx="3" fill="${accent}" opacity="0.5">
      <animate attributeName="opacity" values="0.3;0.65;0.3" dur="0.5s" repeatCount="indefinite"/>
    </rect>
    <!-- keyboard deck on the floor (hands are hidden behind the laptop) -->
    <rect x="-4" y="88" width="112" height="11" rx="3" fill="${darken(device, 0.8)}"/>

    <!-- confetti bursts above Claude's head and RAINS DOWN, in sync with the jump -->
    <g transform="translate(52 2)">${[
      [-32, -26, 44], [-22, -38, 38], [-12, -30, 48], [0, -40, 40], [12, -32, 46],
      [24, -38, 36], [32, -24, 50], [-6, -40, 34], [18, -40, 42],
    ].map((c, i) => {
      const [dx, topY, fall] = c;
      const col = CONFETTI[i % CONFETTI.length];
      const sz = 5 + (i % 3) * 2;
      const drift = (dx * 0.12).toFixed(0);
      return `<rect x="${dx - sz / 2}" y="${topY - sz / 2}" width="${sz}" height="${sz}" fill="${col}" opacity="0">
        <animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes="0;0.6;0.66;0.86;0.96;1" dur="${LOOP}" repeatCount="indefinite"/>
        <animateTransform attributeName="transform" type="translate" values="0 0;0 0;${drift} ${fall}" keyTimes="0;0.62;1" calcMode="spline" keySplines="0 0 1 1;0.4 0 0.9 0.6" dur="${LOOP}" repeatCount="indefinite"/>
      </rect>`;
    }).join("")}</g>`;

  // ===== idle scene =====
  const idleScene = `
    <ellipse cx="68" cy="98" rx="44" ry="7" fill="#000" opacity="0.14"/>
    <g><animateTransform attributeName="transform" type="translate" values="0 0;0 2;0 0" dur="2.5s" repeatCount="indefinite" calcMode="spline" keyTimes="0;0.5;1" keySplines="0.42 0 0.58 1;0.42 0 0.58 1"/>
      <rect x="24" y="50" width="11" height="20" fill="${bodyDark}"/>
      <rect x="42" y="50" width="11" height="20" fill="${bodyDark}"/>
      <rect x="84" y="50" width="11" height="20" fill="${bodyDark}"/>
      <rect x="102" y="50" width="11" height="20" fill="${bodyDark}"/>
      <rect x="20" y="8" width="96" height="56" rx="3" fill="${body}"/>
      <rect x="18" y="14" width="100" height="8" fill="${accent}" opacity="0.85"/>
      <rect x="40" y="36" width="14" height="3" fill="${EYE}"/>
      <rect x="82" y="36" width="14" height="3" fill="${EYE}"/>
    </g>
    <text x="118" y="20" font-family="${font}" font-size="16" font-weight="700" fill="${ZS}" opacity="0">z<animate attributeName="opacity" values="0;1;0" dur="2.5s" repeatCount="indefinite"/><animateTransform attributeName="transform" type="translate" values="0 0;6 -16;12 -32" dur="2.5s" repeatCount="indefinite"/></text>
    <text x="128" y="10" font-family="${font}" font-size="13" font-weight="700" fill="${ZS}" opacity="0">z<animate attributeName="opacity" values="0;1;0" dur="2.5s" begin="0.6s" repeatCount="indefinite"/><animateTransform attributeName="transform" type="translate" values="0 0;6 -16;12 -32" dur="2.5s" begin="0.6s" repeatCount="indefinite"/></text>
    <text x="138" y="0" font-family="${font}" font-size="11" font-weight="700" fill="${ZS}" opacity="0">z<animate attributeName="opacity" values="0;1;0" dur="2.5s" begin="1.2s" repeatCount="indefinite"/><animateTransform attributeName="transform" type="translate" values="0 0;6 -16;12 -32" dur="2.5s" begin="1.2s" repeatCount="indefinite"/></text>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="220" viewBox="0 0 480 220" role="img" aria-label="${esc(title)}">
  <defs>
    <linearGradient id="card" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${t.bg}" stop-opacity="0.6"/>
      <stop offset="1" stop-color="${t.bg}"/>
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="0%" r="80%">
      <stop offset="0" stop-color="${accent}" stop-opacity="0.16"/>
      <stop offset="1" stop-color="${accent}" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <rect x="3" y="3" width="474" height="214" rx="${t.radius}" fill="${cardFill}"${t.border ? ` stroke="${accent}" stroke-opacity="0.3" stroke-width="2"` : ""}/>
  ${t.bg === "transparent" ? "" : `<rect x="3" y="3" width="474" height="120" rx="${t.radius}" fill="url(#glow)"/>`}

  <g transform="translate(40 44)" shape-rendering="crispEdges">
    ${coding ? codingScene : idleScene}
  </g>

  <text x="250" y="92" font-family="${font}" font-size="25" font-weight="700" fill="${text}">${esc(title)}</text>
  <text x="250" y="120" font-family="${font}" font-size="15" fill="${text}" fill-opacity="0.6">${esc(sub)}</text>
  ${coding
    ? `<circle cx="258" cy="151" r="5" fill="${accent}"><animate attributeName="opacity" values="1;0.25;1" dur="1.3s" repeatCount="indefinite"/></circle>`
    : `<circle cx="258" cy="151" r="5" fill="none" stroke="${text}" stroke-opacity="0.4" stroke-width="2"/>`}
  <text x="272" y="156" font-family="${font}" font-size="14" font-weight="600" fill="${coding ? accent : text}" fill-opacity="${coding ? 1 : 0.55}">${esc(pillText)}</text>
  <text x="250" y="192" font-family="${font}" font-size="11" fill="${text}" fill-opacity="0.4">powered by ${esc(t.label)} · live on view</text>
</svg>`;
}

export { formatElapsed };
