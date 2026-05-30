<div align="center">

# 🦀 Claude Coding Mascot

**A live coding-status mascot for your GitHub profile README.**
Clawd sits at a laptop and **codes while you code** (headband on, confetti when he's on a roll), and **naps when you stop** — fully themeable, served from Vercel.

[![VS Code Marketplace](https://img.shields.io/visual-studio-marketplace/v/blackscythe123.claude-coding-mascot?label=VS%20Code%20Marketplace&logo=visualstudiocode&color=007ACC)](https://marketplace.visualstudio.com/items?itemName=blackscythe123.claude-coding-mascot)
[![Installs](https://img.shields.io/visual-studio-marketplace/i/blackscythe123.claude-coding-mascot?logo=visualstudiocode&label=installs)](https://marketplace.visualstudio.com/items?itemName=blackscythe123.claude-coding-mascot)
[![Stars](https://img.shields.io/github/stars/blackscythe123/claude-readme-mascot?style=flat&logo=github)](https://github.com/blackscythe123/claude-readme-mascot/stargazers)
[![License: MIT](https://img.shields.io/github/license/blackscythe123/claude-readme-mascot)](LICENSE)

![Claude is coding](https://pet.simiyonvinscentsamuel.tech/mascot.svg?status=coding&theme=dark)

**[🎨 Playground](https://pet.simiyonvinscentsamuel.tech)** ·
**[🧩 VS Code Extension](https://marketplace.visualstudio.com/items?itemName=blackscythe123.claude-coding-mascot)** ·
**[▲ Deploy your own](https://vercel.com/new/clone?repository-url=https://github.com/blackscythe123/claude-readme-mascot&project-name=claude-coding-mascot&repository-name=claude-coding-mascot&stores=%5B%7B%22type%22%3A%22kv%22%7D%5D)**

</div>

---

It's all one animated **SVG** with **SMIL** animation — no JavaScript — so it plays
inside a GitHub README `<img>`. Install the extension, and it flips to *coding* /
*idle* automatically while you work. No editor running? It just naps.

## Install (live in ~1 minute)
1. Install the **[Claude Coding Mascot](https://marketplace.visualstudio.com/items?itemName=blackscythe123.claude-coding-mascot)** VS Code extension.
2. Open the 🦀 panel (left activity bar) → **Generate key & embed** → your README snippet is copied.
3. Paste it into your profile `README.md`. Code — the mascot wakes up.

**Modes** (panel + status bar): 🟢 **Auto** (tracks typing) · 🔒 **Private** (always idle) · 📌 **Pin** (always coding while open). Your mode is remembered locally.

## Customize

Everything is a URL query param. Use the **[playground](https://pet.simiyonvinscentsamuel.tech)**
to configure it visually and copy the snippet, or build it by hand:

```md
![coding status](https://pet.simiyonvinscentsamuel.tech/mascot.svg?id=YOUR_ID&theme=dark&label=you)
```

| Param | Type | Default | Notes |
|---|---|---|---|
| `id` | string | — | your public id (live status). Omit for a `?status=` demo. |
| `status` | `coding` \| `idle` | `idle` | demo scene when no `id` |
| `theme` | `light` \| `dark` \| `terminal` \| `candy` | `light` | preset; colors below override it |
| `body` · `accent` · `text` · `bg` | hex (no `#`) | theme | crab / headband / text / background (`bg=transparent` ok) |
| `font` | `system` \| `mono` \| `inter` \| `serif` | `system` | font family |
| `label` | text | `Claude` | name shown ("X is coding") |
| `hide_time` | bool | `false` | hide the elapsed `· 23m` |
| `border` | bool | `true` | card border |
| `radius` | int 0–40 | `26` | corner radius |

Auto light/dark on GitHub? Use a `<picture>` with both URLs (light + `&theme=dark`).

## How it works

```
 VS Code extension ──POST /api/coding-now──►  Vercel + Upstash Redis  ◄──GET /mascot.svg?id=──  your README
 (your secret key)        (5-min TTL)          status: coding / idle        (your public id)
```

- The extension makes **one secret key** (in SecretStorage). The README uses a **public id = `sha256(key)`** — one-way, so the key never appears publicly and nobody can spoof your status.
- It refreshes at most every ~10 min while coding; a TTL flips you to idle if the editor dies. Multiple laptops can share one key.

## Self-host (free)

The public server is **locked to its owner**, so to drive your *own* mascot:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/blackscythe123/claude-readme-mascot&project-name=claude-coding-mascot&repository-name=claude-coding-mascot&stores=%5B%7B%22type%22%3A%22kv%22%7D%5D)

1. **Deploy** → the wizard provisions a free Upstash Redis as a step.
2. Set the extension's `claudeMascot.baseUrl` to your new URL.
3. Generate a key → copy your embed. Optionally set `ALLOWED_IDS` (your public id, shown in the panel) to lock the server to just you.

## Project layout

| Path | What |
|---|---|
| `src/mascot.js` | the themeable, state-aware SVG renderer (pure) |
| `src/store.js` | Upstash helpers + `sha256(key)` → public id + allowlist |
| `api/` | `mascot` (SVG), `coding-now` / `coding-stopped` (IDE pings), `link` |
| `public/` | playground (`index.html`) + IDE link page (`link.html`) |
| `extension/` | the VS Code extension (modes, panel, activity → live signal) |

## Credits

The mascot is **Clawd** (the Claude crab), ported from
[`clawd-react`](https://github.com/stevysmith/clawd-react) by Steve Smith (MIT — see
[`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md)). The headband + jump/confetti beat
nods to the [Codrops Claude-mascot breakdown](https://tympanus.net/codrops/2026/05/05/reverse-engineering-claude-ais-mascot-animations-with-svg-and-gsap/).
MIT licensed.
