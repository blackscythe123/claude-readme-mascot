// Vercel serverless function — renders the themed mascot SVG.
//
//   GET /api/mascot?id=<publicId>            → LIVE status from the store
//   GET /api/mascot?status=coding&theme=dark → demo status from the query param
//   (also reachable as /mascot.svg via the rewrite in vercel.json)

import { renderMascotSVG, resolveTheme } from "../src/mascot.js";
import { getStatus } from "../src/store.js";

export default async function handler(req, res) {
  const opts = resolveTheme(req.query || {});
  const nowMs = Date.now();

  let status = opts.status;
  let sinceMs = nowMs - opts.mins * 60000;

  const id = req.query && req.query.id;
  if (id) {
    try {
      const live = await getStatus(String(id));
      if (live) {
        status = live.status;
        sinceMs = live.sinceMs || nowMs;
      }
    } catch { /* store unavailable → fall back to demo status */ }
  }

  const svg = renderMascotSVG({ ...opts, status, nowMs, sinceMs });

  res.setHeader("Content-Type", "image/svg+xml; charset=utf-8");
  // live (id) changes often → short cache; demo can cache a bit longer
  res.setHeader("Cache-Control", id ? "public, max-age=30, s-maxage=30" : "public, max-age=60, s-maxage=120");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.status(200).send(svg);
}
