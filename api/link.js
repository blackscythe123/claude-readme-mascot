// POST /api/link  — turn a secret key into its public README id.
// Body or query: { key }. Returns { id } = sha256(key) (one-way).
// The site uses this so the secret key never has to appear in the README URL.
import { publicIdFor } from "../src/store.js";

export default function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "content-type");
  if (req.method === "OPTIONS") return res.status(204).end();

  const key = (req.body && req.body.key) || (req.query && req.query.key);
  if (!key || String(key).length < 8) {
    return res.status(400).json({ error: "key required (min 8 chars)" });
  }
  res.json({ id: publicIdFor(String(key)) });
}
