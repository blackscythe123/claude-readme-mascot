// Live state store (Upstash Redis) for the coding mascot.
//
// Key model (no accounts):
//   - The VS Code extension generates ONE secret `key`.
//   - The README uses a PUBLIC id = sha256(key) (one-way: the public id can't
//     be reversed to the key, so nobody can spoof your status from the README).
//   - State lives under the public id, with a 5-minute TTL → auto-idle when the
//     IDE stops pinging. Multiple IDEs can share the same key (same channel).
//
// Env: works with the Vercel Upstash integration's vars, falling back to the
// classic KV_* names.

import { Redis } from "@upstash/redis";
import crypto from "node:crypto";

const TTL_SECONDS = 300; // no ping for 5 min → treated as idle (key expires)

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

// Allowlist: if ALLOWED_IDS is set (comma-separated public ids), only those ids
// may write live status / be read from the store. Unset = open (self-hosters).
export function isAllowed(publicId) {
  const raw = process.env.ALLOWED_IDS;
  if (!raw || !raw.trim()) return true;
  return raw.split(",").map((s) => s.trim()).filter(Boolean).includes(publicId);
}

// Called by the IDE (with the secret key) to update live status.
export async function setStatus(secretKey, status) {
  const r = getRedis();
  if (!r) throw new Error("store not configured (missing Upstash env vars)");
  const id = publicIdFor(secretKey);
  const now = Date.now();
  let value;
  if (status === "coding") {
    const prev = await r.get(chanKey(id));
    const sinceMs = prev && prev.status === "coding" && prev.sinceMs ? prev.sinceMs : now;
    value = { status: "coding", sinceMs, lastSeenMs: now };
  } else {
    value = { status: "idle", sinceMs: now, lastSeenMs: now };
  }
  await r.set(chanKey(id), value, { ex: TTL_SECONDS });
  return id;
}

// Called by the SVG endpoint (with the public id) to read live status.
export async function getStatus(publicId) {
  const r = getRedis();
  if (!r) return null;
  const s = await r.get(chanKey(publicId));
  return s || { status: "idle", sinceMs: 0 };
}
