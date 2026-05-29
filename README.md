# 🦀 Claude Coding Mascot

A **live AI-coding mascot for your GitHub profile README**. When your AI agent
(Claude Code, Codex, Gemini, …) is working, the mascot wakes up and codes. When
you stop, it naps. The status updates whenever someone views your profile.

> Nobody had built this — desktop AI-pets stay on the desktop, and README widgets
> (WakaTime, GitCity) only show *historical* activity. This fills the gap by
> combining the Discord/Spotify live-SVG-endpoint pattern with an AI-agent signal.

![coding](assets/preview-coding.svg)
![idle](assets/preview-idle.svg)

*(The SVG above is the always-available placeholder. The real 3D mascot — your
Spline/Blender render — drops in later with zero code changes; see [3D upgrade](#-the-3d-upgrade).)*

---

## How it works

```
 Claude Code hook ──POST /coding-now──►  ┌────────────────┐   GET /mascot(.svg|.png)
 (or manual button)                      │ Cloudflare     │ ◄─────────────────────────
 SessionEnd ──────POST /coding-stopped─► │ Worker + KV    │   embedded in your README
                                         └────────────────┘
```

- **Signal** — a Claude Code `http` hook POSTs on session start / every turn / tool
  use (heartbeat) and on `SessionEnd` (stop). A 5-minute TTL flips you to *idle*
  if a session is killed without a clean exit. No hook? Use the manual button.
- **State** — stored in Cloudflare KV (`{ status, tool, sinceMs, lastSeenMs }`).
- **Render** — `GET /mascot` returns the mascot in the matching pose with
  `Cache-Control: max-age=60`, so GitHub's camo proxy serves it ~1-min fresh.

**The one honest limit:** README images only refresh when someone loads the page,
and camo caches on the order of minutes. So "coding now / idle" works great — a
live token-by-token counter would not. The *animation* is always smooth (it's
self-contained in the image); only the *status* is minutes-fresh.

---

## Run it locally (30 seconds)

```bash
npm install
npm run preview          # writes assets/preview-*.svg — open one in a browser
npm run dev              # starts the Worker at http://127.0.0.1:8787 (KV simulated)
```

Then drive it:

```bash
./scripts/test.ps1                         # Windows / PowerShell
./scripts/test.sh                          # macOS / Linux
# or open public/manual-button.html in a browser and click the buttons
```

Watch `http://127.0.0.1:8787/mascot.svg` flip between coding ↔ idle.

---

## Deploy

```bash
npx wrangler login
npm run kv:create        # creates the KV namespaces — copy the printed ids
# paste id + preview_id into wrangler.toml [[kv_namespaces]]
npm run deploy           # -> https://claude-coding-mascot.<you>.workers.dev
```

Optional — lock down the POST endpoints:

```bash
npx wrangler secret put MASCOT_TOKEN      # then send Authorization: Bearer <token>
```

---

## Wire up Claude Code

Copy the `hooks` block from [`hooks/claude-settings.sample.json`](hooks/claude-settings.sample.json)
into your **`~/.claude/settings.json`** (global) or a project's `.claude/settings.json`.
Replace `YOUR-WORKER` and `YOUR_TOKEN`. Restart Claude Code. Done — start a session
and your README mascot starts coding.

Other agents: any tool that can run a command on start/stop works — just
`curl -X POST .../coding-now` and `.../coding-stopped`. Or rely on the manual button.

---

## Put it in your README

```md
![coding status](https://claude-coding-mascot.<you>.workers.dev/mascot)
```

`/mascot` auto-serves the 3D APNG once you've uploaded frames, otherwise the SVG.
Use `/mascot.svg` to force vector, `/mascot.png` to force the 3D render.

---

## 🎨 The 3D upgrade

The placeholder is a hand-drawn animated SVG. To get the Codex-pet-grade 3D look,
model the mascot in **Spline or Blender**, export PNG frame sequences, and drop them in:

```
assets/frames/idle/    frame_001.png frame_002.png ...
assets/frames/coding/  frame_001.png frame_002.png ...
```

(Spec + tips in [`assets/frames/README.md`](assets/frames/README.md).) Then:

```bash
npm run build:frames     # frames -> dist/*.png (looping APNG)
npm run upload:assets     # push into KV
```

No code change — `/mascot.png` now serves your 3D mascot, SVG stays as fallback.

---

## Project layout

| Path | What |
|---|---|
| `src/worker.js` | Cloudflare Worker — routes, state, TTL |
| `src/mascot.js` | placeholder mascot SVG (pure, state-aware) |
| `scripts/preview.mjs` | emit static preview SVGs |
| `scripts/build-apng.mjs` | 3D frames → APNG |
| `scripts/upload-assets.mjs` | push APNGs into KV |
| `hooks/claude-settings.sample.json` | Claude Code hook config |
| `public/manual-button.html` | manual "I started / stopped" control |

## Supported agents (mascot accent color)

`claude` · `codex` · `gemini` · `copilot` · `cursor` — pass `?tool=` on the POST,
or `{"tool":"..."}` in the body. Defaults to `claude`.
