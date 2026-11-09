// POST /api/mode?m=auto|private|pinned — the extension's mode switch.
// Auth: Authorization: Bearer <secret key>. Private hides the card account-wide
// (every window, editor and laptop) until Auto or Pin is chosen again.
import { setMode, publicIdFor, isAllowed } from "../src/store.js";

const MODES = ["auto", "private", "pinned"];

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "authorization, content-type");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "method not allowed" });

  const h = req.headers.authorization || "";
  const key = h.startsWith("Bearer ") ? h.slice(7).trim() : null;
  if (!key || key.length < 8) return res.status(401).json({ error: "missing or too-short key" });
  if (!isAllowed(publicIdFor(key))) return res.status(403).json({ error: "server private" });

  const mode = String((req.query && req.query.m) || "");
  if (!MODES.includes(mode)) return res.status(400).json({ error: `m must be one of ${MODES.join(", ")}` });
  const session = (req.query && req.query.session) || undefined;
  try {
    const id = await setMode(key, mode, session);
    res.json({ ok: true, mode, id });
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
}
