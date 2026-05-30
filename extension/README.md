# Claude Coding Mascot — VS Code extension

Drives your GitHub-README [Claude coding mascot](https://pet.simiyonvinscentsamuel.tech)
live: it flips to **coding** while you type and **idle** when you stop.

## Quick start
1. Click the **🦀 Claude Mascot** icon in the left activity bar to open the panel
   (or run **Claude Mascot: Generate Key & Embed**).
2. Click **Generate key & embed** → your README snippet is copied to the clipboard.
3. Paste it into your GitHub profile `README.md`.
4. Code. The mascot wakes up. 🦀

The panel shows your current status, a live-style preview, your ready-to-paste
embed, and a **🎨 Customize on the website** button.

## How it works
- The extension generates one **secret key** (stored in VS Code's SecretStorage).
- Your README uses a **public id = `sha256(key)`** — one-way, so the key never
  appears publicly and nobody can spoof your status. The extension computes the
  id locally and shows you the exact embed.
- While you edit, it POSTs `coding` (a refresh at most every ~10 min) / `idle`
  to your server. A 15-minute TTL is the crash backstop.

**Multiple laptops:** use the **same key** everywhere — *Set Key (paste)* on each
machine → they all drive one mascot. *Copy key (for your other laptops)* is in the panel.

## Settings
| Setting | Default | What |
|---|---|---|
| `claudeMascot.baseUrl` | `https://pet.simiyonvinscentsamuel.tech` | the server the extension talks to (shown in the panel; **self-hosters change this**) |
| `claudeMascot.idleTimeoutSeconds` | `300` | inactivity before idle |

## Self-host (run your own — free)
The default server is private to its owner (you'll see **🔒 server private** and a
**Deploy your own** button if you point at someone else's). To run your own:

1. **Deploy your own** → the Vercel wizard provisions a free database for you.
2. Set `claudeMascot.baseUrl` to your new URL (the panel has a **Change server** button).
3. Generate a key → copy your embed. Optionally set `ALLOWED_IDS` to your public id
   (shown in the panel) to lock your server to just you.

## Run it locally (dev)
Open the `extension/` folder in VS Code and press **F5** — it launches an Extension
Development Host with the extension loaded.
