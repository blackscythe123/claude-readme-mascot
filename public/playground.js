// Playground: build the /mascot.svg query string from the controls, live-preview
// it, and produce copyable Markdown / HTML / URL. Pure vanilla JS, no build.

const $ = (id) => document.getElementById(id);
const els = {
  status: $("status"), theme: $("theme"), font: $("font"), label: $("label"),
  body: $("body"), accent: $("accent"), text: $("text"), bg: $("bg"),
  transparent: $("transparent"), hide_time: $("hide_time"), border: $("border"),
  radius: $("radius"), radiusVal: $("radiusVal"), mins: $("mins"),
  out: $("out"), md: $("md"), html: $("html"), url: $("url"), reset: $("reset"),
};

// Defaults per theme (mirror src/mascot.js so the color pickers track the preset).
const THEMES = {
  light:    { bg: "#FBF3EC", text: "#2B2622", body: "#C27C5C", accent: "#C27C5C" },
  dark:     { bg: "#16120F", text: "#F0E9E3", body: "#C27C5C", accent: "#E0936F" },
  terminal: { bg: "#08140E", text: "#B9F5D8", body: "#3FB984", accent: "#7CF5C0" },
  candy:    { bg: "#FFE9F1", text: "#5A2A3E", body: "#FF9FB2", accent: "#FF6FA0" },
};

const base = () => `${location.origin}/mascot.svg`;
const hex = (v) => v.replace(/^#/, "");

function applyThemeDefaults() {
  const t = THEMES[els.theme.value] || THEMES.light;
  els.body.value = t.body;
  els.accent.value = t.accent;
  els.text.value = t.text;
  els.bg.value = t.bg;
}

function buildQuery() {
  const t = THEMES[els.theme.value] || THEMES.light;
  const p = new URLSearchParams();
  p.set("status", els.status.value);
  if (els.theme.value !== "light") p.set("theme", els.theme.value);
  if (els.font.value !== "system") p.set("font", els.font.value);
  if (els.label.value && els.label.value !== "Claude") p.set("label", els.label.value);

  // only include a color if it differs from the active theme's default
  if (hex(els.body.value).toLowerCase() !== hex(t.body).toLowerCase()) p.set("body", hex(els.body.value));
  if (hex(els.accent.value).toLowerCase() !== hex(t.accent).toLowerCase()) p.set("accent", hex(els.accent.value));
  if (hex(els.text.value).toLowerCase() !== hex(t.text).toLowerCase()) p.set("text", hex(els.text.value));
  if (els.transparent.checked) p.set("bg", "transparent");
  else if (hex(els.bg.value).toLowerCase() !== hex(t.bg).toLowerCase()) p.set("bg", hex(els.bg.value));

  if (els.hide_time.checked) p.set("hide_time", "true");
  if (!els.border.checked) p.set("border", "false");
  if (els.radius.value !== "26") p.set("radius", els.radius.value);
  if (els.status.value === "coding" && els.mins.value !== "23") p.set("mins", els.mins.value);
  return p.toString();
}

function update() {
  els.radiusVal.textContent = els.radius.value;
  els.bg.disabled = els.transparent.checked;
  const url = `${base()}?${buildQuery()}`;
  els.out.src = url;
  els.url.textContent = url;
  els.md.textContent = `![coding status](${url})`;
  els.html.textContent = `<img src="${url}" alt="coding status" width="480" height="220">`;
}

document.querySelectorAll("#controls input, #controls select").forEach((el) => {
  el.addEventListener("input", (e) => {
    if (e.target === els.theme) applyThemeDefaults();
    update();
  });
});

document.querySelectorAll("[data-copy]").forEach((btn) => {
  btn.addEventListener("click", async () => {
    const map = { md: els.md, html: els.html, url: els.url };
    await navigator.clipboard.writeText(map[btn.dataset.copy].textContent);
    const old = btn.textContent;
    btn.textContent = "Copied!";
    setTimeout(() => (btn.textContent = old), 1200);
  });
});

els.reset.addEventListener("click", () => {
  els.status.value = "coding"; els.theme.value = "light"; els.font.value = "system";
  els.label.value = "Claude"; els.transparent.checked = false;
  els.hide_time.checked = false; els.border.checked = true;
  els.radius.value = "26"; els.mins.value = "23";
  applyThemeDefaults();
  update();
});

update();
