// Live state store (Upstash Redis) for the coding mascot.
//
// Key model (no accounts):
//   - The VS Code extension generates ONE secret `key`.
//   - The README uses a PUBLIC id = sha256(key) (one-way: the public id can't
//     be reversed to the key, so nobody can spoof your status from the README).
//   - State lives under the public id, with a 15-minute TTL → auto-idle when the
//     IDE stops pinging. Multiple IDEs / windows can share the same key.
//   - Each editor window reports under its own session id (`sess:<id>` hash), so
//     one window going idle or closing can't overwrite another that is coding:
//     the channel reads "coding" if ANY live session is coding. Old extensions
//     without a session id keep writing the single `chan:<id>` value, which is
//     merged in the same way.
//   - `last:<id>` remembers when coding was last seen (30 days), so "away for"
//     stays right even after the live entries expire.
//
// Env: works with the Vercel Upstash integration's vars, falling back to the
// classic KV_* names.

import { Redis } from "@upstash/redis";
import crypto from "node:crypto";

const TTL_SECONDS = 900; // no ping for 15 min → treated as idle (crash backstop)

let _redis;
export function getRedis() {
  if (_redis !== undefined) return _redis;
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  _redis = url && token ? new Redis({ url, token }) : null;
  return _redis;
}

export function publicIdFor(key) {
  return crypto.createHash("sha256").update(String(key)).digest("hex").slice(0, 32);
}

const chanKey = (publicId) => `chan:${publicId}`;
const sessKey = (publicId) => `sess:${publicId}`;
const lastKey = (publicId) => `last:${publicId}`;
// Account-wide Private: while set, every card shows idle whatever any window, editor or
// laptop reports (Private used to idle only the window that chose it, so any other session
// still coding kept the card on "In the zone"). Value = when Private began.
const holdKey = (publicId) => `hold:${publicId}`;
const HOLD_TTL_SECONDS = 60 * 60 * 24 * 30;
const LAST_TTL_SECONDS = 60 * 60 * 24 * 30;
const SESSION_RE = /^[A-Za-z0-9_-]{6,64}$/;

// Allowlist: if ALLOWED_IDS is set (comma-separated public ids), only those ids
// may write live status / be read from the store. Unset = open (self-hosters).
export function isAllowed(publicId) {
  const raw = process.env.ALLOWED_IDS;
  if (!raw || !raw.trim()) return true;
  return raw.split(",").map((s) => s.trim()).filter(Boolean).includes(publicId);
}

// Called by the IDE (with the secret key) to update live status.
// One pipelined round trip (write only) — the IDE sends its own `sinceMs` so we
// don't need a read to preserve the coding start time.
export async function setStatus(secretKey, status, sinceMs, session) {
  const r = getRedis();
  if (!r) throw new Error("store not configured (missing Upstash env vars)");
  const id = publicIdFor(secretKey);
  const now = Date.now();
  const coding = status === "coding";
  const value = coding
    ? { status: "coding", sinceMs: Number(sinceMs) || now, lastSeenMs: now }
    : { status: "idle", sinceMs: now, lastSeenMs: now };
  const p = r.pipeline();
  if (session && SESSION_RE.test(String(session))) {
    p.hset(sessKey(id), { [String(session)]: value });
    p.expire(sessKey(id), TTL_SECONDS);
  } else {
    p.set(chanKey(id), value, { ex: TTL_SECONDS });
  }
  if (coding) p.set(lastKey(id), now, { ex: LAST_TTL_SECONDS });
  await p.exec();
  return id;
}

// Merge the legacy single value and the per-window sessions into one status.
// Pure, so it can be tested without Redis.
export function mergeStatus(legacy, sessions, lastCodingMs, nowMs = Date.now(), privateSinceMs = 0) {
  if (Number(privateSinceMs) > 0) return { status: "idle", sinceMs: Number(privateSinceMs) };
  const parse = (v) => (typeof v === "string" ? safeJson(v) : v);
  const fresh = [legacy, ...Object.values(sessions || {})]
    .map(parse)
    .filter((v) => v && typeof v === "object" && nowMs - (Number(v.lastSeenMs) || 0) <= TTL_SECONDS * 1000);
  const coding = fresh.filter((v) => v.status === "coding");
  if (coding.length) {
    return { status: "coding", sinceMs: Math.min(...coding.map((v) => Number(v.sinceMs) || nowMs)) };
  }
  const last = Number(lastCodingMs) || 0;
  const idleSince = Math.max(0, ...fresh.map((v) => Number(v.sinceMs) || 0));
  return { status: "idle", sinceMs: last || idleSince || 0 };
}

function safeJson(s) {
  try { return JSON.parse(s); } catch { return null; }
}

// Called by the SVG endpoint (with the public id) to read live status.
// One pipelined round trip for the three keys.
export async function getStatus(publicId) {
  const r = getRedis();
  if (!r) return null;
  const p = r.pipeline();
  p.get(chanKey(publicId));
  p.hgetall(sessKey(publicId));
  p.get(lastKey(publicId));
  p.get(holdKey(publicId));
  const [legacy, sessions, last, hold] = await p.exec();
  return mergeStatus(legacy, sessions, last, Date.now(), hold);
}

// Account-wide mode, set by the extension's Auto / Private / Pin switch. Only Private is
// stored (Auto and Pin clear it): Pin stays per-window on purpose, so closing the laptop
// still lets the card fall back to idle.
export async function setMode(secretKey, mode, session) {
  const r = getRedis();
  if (!r) throw new Error("store not configured (missing Upstash env vars)");
  const id = publicIdFor(secretKey);
  if (mode === "private") {
    await r.set(holdKey(id), Date.now(), { ex: HOLD_TTL_SECONDS, nx: true }); // keep the original start
    await setStatus(secretKey, "idle", undefined, session);
  } else {
    await r.del(holdKey(id));
  }
  return id;
}
