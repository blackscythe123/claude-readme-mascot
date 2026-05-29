// Claude coding mascot — Cloudflare Worker.
//
// Routes
//   POST /coding-now       agent started / heartbeat   -> state = coding, refresh lastSeen
//   POST /coding-stopped   agent finished              -> state = idle
//   GET  /status           JSON of current state (debug)
//   GET  /mascot           auto: 3D APNG if uploaded, else animated SVG
//   GET  /mascot.svg       always the vector mascot (works today)
//   GET  /mascot.png       the pre-rendered 3D APNG (falls back to SVG until uploaded)
//   GET  /                 a tiny dashboard
//
// State + 3D assets are stored in KV (binding MASCOT_KV):
//   state          -> { status, tool, sinceMs, lastSeenMs, task }
//   asset:coding    -> APNG bytes (your Spline/Blender export, optional)
//   asset:idle      -> APNG bytes (optional)

import { renderMascotSVG } from "./mascot.js";

const STATE_KEY = "state";
const TTL_MS = 5 * 60 * 1000; // no heartbeat for 5 min -> treated as idle

const CORS = { "access-control-allow-origin": "*", "access-control-allow-headers": "authorization, content-type", "access-control-allow-methods": "GET, POST, OPTIONS" };
const IMG_CACHE = "public, max-age=60, s-maxage=60"; // ~1 min freshness through GitHub's camo proxy

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj, null, 2), { status, headers: { "content-type": "application/json; charset=utf-8", ...CORS } });

const svgResponse = (svg) =>
  new Response(svg, { headers: { "content-type": "image/svg+xml; charset=utf-8", "cache-control": IMG_CACHE, ...CORS } });

function authed(request, env) {
  if (!env.MASCOT_TOKEN) return true;
  return (request.headers.get("authorization") || "") === `Bearer ${env.MASCOT_TOKEN}`;
}

function basename(p) {
  if (!p) return "";
  return String(p).replace(/[\\/]+$/, "").split(/[\\/]/).pop() || "";
}

async function readBody(request) {
  try {
    const ct = request.headers.get("content-type") || "";
    if (ct.includes("application/json")) return (await request.json()) || {};
    const txt = await request.text();
    return txt ? JSON.parse(txt) : {};
  } catch {
    return {};
  }
}

async function getRawState(env) {
  try { return (await env.MASCOT_KV.get(STATE_KEY, "json")) || null; } catch { return null; }
}

// effective state with TTL applied
async function getState(env) {
  const now = Date.now();
  const s = await getRawState(env);
  if (!s) return { status: "idle", tool: "claude", sinceMs: 0, lastSeenMs: 0, task: "", nowMs: now };
  let status = s.status || "idle";
  if (status === "coding" && now - (s.lastSeenMs || 0) > TTL_MS) status = "idle";
  return {
    status,
    tool: s.tool || "claude",
    sinceMs: s.sinceMs || 0,
    lastSeenMs: s.lastSeenMs || 0,
    task: s.task || "",
    nowMs: now,
  };
}

async function setCoding(request, env, url) {
  if (!authed(request, env)) return json({ error: "unauthorized" }, 401);
  const body = await readBody(request);
  const now = Date.now();
  const prev = await getRawState(env);
  const tool = (url.searchParams.get("tool") || body.tool || "claude").toLowerCase();
  const task = body.task || basename(body.cwd) || (prev && prev.task) || "";
  // keep the original start time if we're already in a coding session
  const stillCoding = prev && prev.status === "coding" && now - (prev.lastSeenMs || 0) <= TTL_MS;
  const sinceMs = stillCoding ? prev.sinceMs || now : now;
  const next = { status: "coding", tool, sinceMs, lastSeenMs: now, task };
  await env.MASCOT_KV.put(STATE_KEY, JSON.stringify(next));
  return json({ ok: true, state: next });
}

async function setIdle(request, env, url) {
  if (!authed(request, env)) return json({ error: "unauthorized" }, 401);
  const body = await readBody(request);
  const now = Date.now();
  const prev = await getRawState(env);
  const tool = (url.searchParams.get("tool") || body.tool || (prev && prev.tool) || "claude").toLowerCase();
  const next = { status: "idle", tool, sinceMs: now, lastSeenMs: now, task: "" };
  await env.MASCOT_KV.put(STATE_KEY, JSON.stringify(next));
  return json({ ok: true, state: next });
}

async function serveMascot(env, fmt) {
  const state = await getState(env);
  // try the pre-rendered 3D APNG first for png/auto
  if (fmt === "png" || fmt === "auto") {
    let asset = null;
    try { asset = await env.MASCOT_KV.get(`asset:${state.status}`, "arrayBuffer"); } catch {}
    if (asset) {
      return new Response(asset, { headers: { "content-type": "image/apng", "cache-control": IMG_CACHE, ...CORS } });
    }
  }
  return svgResponse(renderMascotSVG(state));
}

function home(state) {
  const html = `<!doctype html><meta charset="utf-8"><title>Claude coding mascot</title>
<style>body{font:15px/1.6 system-ui,sans-serif;max-width:640px;margin:40px auto;padding:0 16px;color:#2b2622}
code{background:#f3ece6;padding:2px 6px;border-radius:6px}a{color:#d97757}img{margin:16px 0;border-radius:14px}</style>
<h1>🦀 Claude coding mascot</h1>
<p>Current status: <b>${state.status}</b> (${state.tool})</p>
<img src="/mascot.svg" alt="mascot" width="480" height="220">
<h3>Embed in your README</h3>
<pre><code>![coding status](${"<your-worker-url>"}/mascot.svg)</code></pre>
<h3>Endpoints</h3>
<ul>
<li><code>POST /coding-now</code> — agent started / heartbeat</li>
<li><code>POST /coding-stopped</code> — agent finished</li>
<li><code>GET /status</code> — <a href="/status">JSON state</a></li>
<li><code>GET /mascot.svg</code> — <a href="/mascot.svg">vector mascot</a></li>
<li><code>GET /mascot.png</code> — your 3D APNG (once uploaded)</li>
</ul>`;
  return new Response(html, { headers: { "content-type": "text/html; charset=utf-8" } });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "") || "/";
    const method = request.method;

    if (method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });

    if (path === "/" && method === "GET") return home(await getState(env));
    if (path === "/coding-now" && method === "POST") return setCoding(request, env, url);
    if (path === "/coding-stopped" && method === "POST") return setIdle(request, env, url);
    if (path === "/status" && method === "GET") return json(await getState(env));
    if (path === "/mascot" && method === "GET") return serveMascot(env, "auto");
    if (path === "/mascot.svg" && method === "GET") return serveMascot(env, "svg");
    if (path === "/mascot.png" && method === "GET") return serveMascot(env, "png");

    return json({ error: "not found", path }, 404);
  },
};
