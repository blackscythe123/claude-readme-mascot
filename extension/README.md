# Claude Coding Mascot — VS Code extension

Drives your GitHub-README [Claude coding mascot](https://pet.simiyonvinscentsamuel.tech)
live: it flips to **coding** while you type and **idle** when you stop.

## How it works
1. The extension generates one **secret key** (stored in VS Code's SecretStorage).
2. You paste the key on the site's **link page** to get a **public id** for your README
   (the id is `sha256(key)` — one-way, so the key never appears publicly).
3. While you edit, the extension POSTs `coding` (heartbeat) / `idle` to the site
   using your key. The README image reads that status.

Multiple editors can share **one key** (use *Set Key* to paste it) → they all
drive the same mascot.

## Use it
- Command Palette → **Claude Mascot: Generate Key & Link** (or click the status-bar item).
- Press **Open link page**, paste the key, copy the README markdown into your profile.
- That's it — code, and the mascot wakes up.

## Settings
| Setting | Default | What |
|---|---|---|
| `claudeMascot.baseUrl` | `https://pet.simiyonvinscentsamuel.tech` | your deployed site |
| `claudeMascot.idleTimeoutSeconds` | `300` | inactivity before idle |

## Run it locally (dev)
Open this `extension/` folder in VS Code and press **F5** — it launches an
Extension Development Host with the extension loaded. Generate a key and start typing.

## Package / publish
```bash
npm i -g @vscode/vsce
vsce package           # -> claude-coding-mascot-0.1.0.vsix  (Install from VSIX…)
# vsce publish         # needs a real "publisher" in package.json + a marketplace token
```
