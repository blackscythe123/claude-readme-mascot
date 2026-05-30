// POST /api/coding-stopped — the IDE pings this when the session ends.
// Auth: Authorization: Bearer <secret key>  (or { "key": "..." } in the body).
import { setStatus, publicIdFor, isAllowed } from "../src/store.js";

function getKey(req) {
  const h = req.headers.authorization || "";
  if (h.startsWith("Bearer ")) return h.slice(7).trim();
  if (req.body && req.body.key) return String(req.body.key);
  return null;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "authorization, content-type");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "method not allowed" });

  const key = getKey(req);
  if (!key || key.length < 8) return res.status(401).json({ error: "missing or too-short key" });
  if (!isAllowed(publicIdFor(key))) {
    return res.status(403).json({ error: "server private", deploy: "https://github.com/blackscythe123/claude-readme-mascot#self-host" });
  }

  try {
    const id = await setStatus(key, "idle");
    res.json({ ok: true, status: "idle", id });
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
}
