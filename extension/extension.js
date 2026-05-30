// Claude Coding Mascot — VS Code extension.
//
// Generates one secret key (stored in SecretStorage), watches your editor
// activity, and POSTs `coding` / `idle` to your deployed site. The README uses a
// PUBLIC id = sha256(key); the extension computes that id LOCALLY and shows your
// exact embed URL, so it always matches what you're posting.
//
// Use the SAME key on all your laptops (Set Key → paste) to drive one mascot.
// If the configured server is private (allowlisted to its owner), POSTs return
// 403 and the panel tells you to deploy your own and set claudeMascot.baseUrl.

const vscode = require("vscode");
const crypto = require("crypto");

const SECRET_KEY = "claudeMascot.key";
const TICK_MS = 30000;
const HEARTBEAT_MS = 600000; // refresh while coding at most every 10 min (< 15-min TTL)
const DEPLOY_URL = "https://vercel.com/new/clone?repository-url=https://github.com/blackscythe123/claude-readme-mascot&project-name=claude-coding-mascot&repository-name=claude-coding-mascot&stores=%5B%7B%22type%22%3A%22kv%22%7D%5D";

let ctx;
let key = null;
let statusBar;
let panelView = null;
let lastActivity = 0;
let lastCodingPost = 0;
let codingSince = 0;
let currentStatus = "idle";
let locked = false;
let warnedLocked = false;
let timer = null;

function cfg() { return vscode.workspace.getConfiguration("claudeMascot"); }
function baseUrl() { return String(cfg().get("baseUrl") || "").replace(/\/+$/, ""); }
function idleTimeoutMs() { return (Number(cfg().get("idleTimeoutSeconds")) || 300) * 1000; }

function publicId(k) { return crypto.createHash("sha256").update(String(k)).digest("hex").slice(0, 32); }
function embedUrl() { return key ? `${baseUrl()}/mascot.svg?id=${publicId(key)}` : ""; }
function embedMarkdown() { return key ? `![coding status](${embedUrl()})` : ""; }

async function post(path) {
  if (!key || typeof fetch !== "function") return null;
  try {
    const r = await fetch(baseUrl() + path, { method: "POST", headers: { authorization: "Bearer " + key } });
    return r.status;
  } catch { return null; }
}

function setLocked(b) {
  if (b && !warnedLocked) {
    warnedLocked = true;
    vscode.window.showWarningMessage(
      "This mascot server is private to its owner. Deploy your own copy and set claudeMascot.baseUrl to use it.",
      "Deploy your own"
    ).then((p) => { if (p) vscode.env.openExternal(vscode.Uri.parse(DEPLOY_URL)); });
  }
  if (locked !== b) { locked = b; render(); }
}

function render() {
  if (statusBar) {
    if (!key) {
      statusBar.text = "$(circle-slash) Claude: not linked";
      statusBar.tooltip = "Click to generate a key and link your README";
    } else if (locked) {
      statusBar.text = "$(lock) Claude: server private";
      statusBar.tooltip = "Deploy your own server and set claudeMascot.baseUrl";
    } else {
      statusBar.text = currentStatus === "coding" ? "$(pulse) Claude: coding" : "$(coffee) Claude: idle";
      statusBar.tooltip = "Claude mascot — click for options";
    }
  }
  updatePanel();
}

function updatePanel() {
  if (!panelView) return;
  panelView.webview.postMessage({
    type: "state",
    hasKey: !!key,
    status: currentStatus,
    locked,
    baseUrl: baseUrl(),
    id: key ? publicId(key) : null,
    embed: embedMarkdown(),
    deployUrl: DEPLOY_URL,
  });
}

function markActivity() { lastActivity = Date.now(); }

async function tick() {
  if (!key) return;
  const now = Date.now();
  const active = now - lastActivity <= idleTimeoutMs();
  if (active) {
    if (currentStatus !== "coding") codingSince = now; // start of a new coding session
    if (currentStatus !== "coding" || now - lastCodingPost > HEARTBEAT_MS) {
      const code = await post(`/api/coding-now?since=${codingSince}`);
      if (code === 403) return setLocked(true);
      if (code) setLocked(false);
      lastCodingPost = now;
      currentStatus = "coding";
      render();
    }
  } else if (currentStatus !== "idle") {
    await post("/api/coding-stopped");
    currentStatus = "idle";
    render();
  }
}

async function generateKey() {
  key = "ck_" + crypto.randomBytes(16).toString("hex");
  await ctx.secrets.store(SECRET_KEY, key);
  warnedLocked = false; locked = false;
  await vscode.env.clipboard.writeText(embedMarkdown());
  render();
  markActivity();
  tick();
  const pick = await vscode.window.showInformationMessage(
    "Linked! Your README embed is copied — paste it into your GitHub profile README.",
    "Show embed", "Copy key"
  );
  if (pick === "Show embed") vscode.window.showInformationMessage(embedMarkdown());
  if (pick === "Copy key") vscode.env.clipboard.writeText(key);
}

async function setKey() {
  const k = await vscode.window.showInputBox({ prompt: "Paste your Claude key (same key on every laptop)", password: true, ignoreFocusOut: true });
  if (!k) return;
  key = k.trim();
  await ctx.secrets.store(SECRET_KEY, key);
  warnedLocked = false; locked = false;
  await vscode.env.clipboard.writeText(embedMarkdown());
  vscode.window.showInformationMessage("Key saved. README embed copied to clipboard.");
  render();
  markActivity();
  tick();
}

async function copyEmbed() {
  if (!key) return vscode.window.showWarningMessage("No key yet — generate one first.");
  await vscode.env.clipboard.writeText(embedMarkdown());
  vscode.window.showInformationMessage("README embed copied.");
}

async function copyKey() {
  if (!key) return vscode.window.showWarningMessage("No key yet.");
  await vscode.env.clipboard.writeText(key);
  vscode.window.showInformationMessage("Key copied — paste it on your other laptops via Set Key.");
}

async function showKey() {
  if (!key) return vscode.window.showWarningMessage("No Claude key set.");
  const pick = await vscode.window.showInformationMessage("Key: " + key, "Copy");
  if (pick === "Copy") vscode.env.clipboard.writeText(key);
}

async function unlink() {
  await ctx.secrets.delete(SECRET_KEY);
  key = null; currentStatus = "idle"; locked = false;
  render();
  vscode.window.showInformationMessage("Claude unlinked (key cleared).");
}

const panelProvider = {
  resolveWebviewView(view) {
    panelView = view;
    view.webview.options = { enableScripts: true };
    view.webview.html = panelHtml();
    view.webview.onDidReceiveMessage((m) => {
      switch (m && m.cmd) {
        case "generate": return generateKey();
        case "setKey": return setKey();
        case "copyEmbed": return copyEmbed();
        case "copyKey": return copyKey();
        case "copyId": return key ? (vscode.env.clipboard.writeText(publicId(key)), vscode.window.showInformationMessage("Public id copied — set it as ALLOWED_IDS to lock your server.")) : null;
        case "openSite": return vscode.env.openExternal(vscode.Uri.parse(baseUrl()));
        case "customize": return vscode.env.openExternal(vscode.Uri.parse(baseUrl() + (key ? "/?id=" + publicId(key) : "/")));
        case "openSettings": return vscode.commands.executeCommand("workbench.action.openSettings", "claudeMascot.baseUrl");
        case "deploy": return vscode.env.openExternal(vscode.Uri.parse(DEPLOY_URL));
        case "unlink": return unlink();
        case "ready": return updatePanel();
      }
    });
    view.onDidChangeVisibility(() => { if (view.visible) updatePanel(); });
    updatePanel();
  },
};

function panelHtml() {
  return `<!doctype html><html><head><meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src https: data:; style-src 'unsafe-inline'; script-src 'unsafe-inline';">
<style>
  body { font-family: var(--vscode-font-family); color: var(--vscode-foreground); padding: 10px 12px; font-size: 12px; }
  img { width: 100%; border-radius: 10px; display: block; margin: 6px 0; }
  .badge { display: inline-block; font-size: 11px; font-weight: 700; padding: 3px 9px; border-radius: 20px; margin: 2px 0 6px; }
  .coding { background: rgba(63,208,127,.18); color: #3fd07f; }
  .idle { background: rgba(128,128,128,.2); color: var(--vscode-descriptionForeground); }
  button { width: 100%; margin: 4px 0; padding: 7px; border: 0; border-radius: 6px; cursor: pointer; font-size: 12px;
    background: var(--vscode-button-background); color: var(--vscode-button-foreground); }
  button.secondary { background: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground); }
  code { display: block; font-size: 11px; background: var(--vscode-textCodeBlock-background); padding: 8px; border-radius: 6px;
    white-space: pre-wrap; word-break: break-all; margin: 6px 0; }
  p { color: var(--vscode-descriptionForeground); line-height: 1.5; }
  .muted { font-size: 11px; color: var(--vscode-descriptionForeground); margin-top: 8px; }
</style></head><body>
<div id="app"></div>
<script>
  const vscode = acquireVsCodeApi();
  let s = { hasKey: false };
  const app = document.getElementById("app");
  function esc(t){ return String(t).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
  function img(){ return s.baseUrl + "/mascot.svg?status=" + s.status; } // local status only — never reads the server DB
  function render(){
    if (!s.hasKey) {
      app.innerHTML =
        "<p>Link your README to start. Your editor activity drives the mascot automatically.</p>" +
        '<button data-cmd="generate">Generate key &amp; embed</button>' +
        '<button class="secondary" data-cmd="setKey">Set key (paste existing)</button>' +
        '<button class="secondary" data-cmd="openSite">Open playground</button>' +
        '<p class="muted">Server: <code>' + esc(s.baseUrl) + '</code><button class="secondary" data-cmd="openSettings">Change server</button></p>';
      return;
    }
    if (s.locked) {
      app.innerHTML =
        '<span class="badge idle">🔒 server private</span>' +
        "<p>This mascot server only accepts its owner's key. Deploy your own copy (1 click, free) and point the extension at it.</p>" +
        '<button data-cmd="deploy">Deploy your own to Vercel</button>' +
        '<p class="muted">Then set <b>claudeMascot.baseUrl</b> to your new URL in Settings.</p>' +
        '<button class="secondary" data-cmd="setKey">Set / change key</button>';
      return;
    }
    app.innerHTML =
      '<span class="badge ' + (s.status === "coding" ? "coding" : "idle") + '">' + (s.status === "coding" ? "● coding" : "○ idle") + "</span>" +
      '<img id="m" src="' + img() + '">' +
      "<p>Paste this in your GitHub README:</p>" +
      "<code>" + esc(s.embed) + "</code>" +
      '<button data-cmd="copyEmbed">Copy README embed</button>' +
      '<button class="secondary" data-cmd="customize">🎨 Customize on the website</button>' +
      '<button class="secondary" data-cmd="copyKey">Copy key (for your other laptops)</button>' +
      '<button class="secondary" data-cmd="setKey">Set / change key</button>' +
      '<button class="secondary" data-cmd="unlink">Unlink</button>' +
      '<p class="muted">Server: <code>' + esc(s.baseUrl) + '</code><button class="secondary" data-cmd="openSettings">Change server</button></p>' +
      '<p class="muted">Self-hosting? Your public id (for ALLOWED_IDS):<br><code>' + esc(s.id) + '</code><button class="secondary" data-cmd="copyId">Copy id</button></p>';
  }
  app.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (b) vscode.postMessage({ cmd: b.getAttribute("data-cmd") });
  });
  window.addEventListener("message", (e) => { if (e.data && e.data.type === "state") { s = e.data; render(); } });
  vscode.postMessage({ cmd: "ready" });
  render();
</script></body></html>`;
}

function activate(context) {
  ctx = context;
  statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBar.command = "claudeMascot.menu";
  statusBar.show();
  context.subscriptions.push(statusBar);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider("claudeMascot.panel", panelProvider),
    vscode.commands.registerCommand("claudeMascot.generateKey", generateKey),
    vscode.commands.registerCommand("claudeMascot.setKey", setKey),
    vscode.commands.registerCommand("claudeMascot.copyEmbed", copyEmbed),
    vscode.commands.registerCommand("claudeMascot.showKey", showKey),
    vscode.commands.registerCommand("claudeMascot.unlink", unlink),
    vscode.commands.registerCommand("claudeMascot.menu", async () => {
      const items = key ? ["Copy README embed", "Copy key (other laptops)", "Show key", "Set / change key", "Unlink"] : ["Generate key & embed", "Set key (paste)"];
      const pick = await vscode.window.showQuickPick(items, { title: "Claude Coding Mascot" });
      if (pick === "Generate key & embed") return generateKey();
      if (pick === "Copy README embed") return copyEmbed();
      if (pick === "Copy key (other laptops)") return copyKey();
      if (pick === "Set key (paste)" || pick === "Set / change key") return setKey();
      if (pick === "Show key") return showKey();
      if (pick === "Unlink") return unlink();
    }),
    vscode.workspace.onDidChangeTextDocument(markActivity),
    vscode.window.onDidChangeActiveTextEditor(markActivity),
    vscode.window.onDidChangeTextEditorSelection(markActivity),
    vscode.window.onDidChangeWindowState((st) => { if (st.focused) markActivity(); })
  );

  timer = setInterval(tick, TICK_MS);
  context.subscriptions.push({ dispose: () => clearInterval(timer) });

  context.secrets.get(SECRET_KEY).then((k) => {
    key = k || null;
    render();
    if (key) { markActivity(); tick(); }
  });
}

async function deactivate() {
  if (key && typeof fetch === "function") {
    try { await fetch(baseUrl() + "/api/coding-stopped", { method: "POST", headers: { authorization: "Bearer " + key } }); } catch {}
  }
}

module.exports = { activate, deactivate };
