// Claude Coding Mascot — VS Code extension.
//
// Generates one secret key (stored in SecretStorage), watches your editor
// activity, and POSTs `coding` / `idle` to your deployed site. The site derives
// a PUBLIC id = sha256(key) for your README, so the key never leaves your IDE.
// Multiple IDEs can use the same key (paste it via "Set Key") to drive one mascot.

const vscode = require("vscode");
const crypto = require("crypto");

const SECRET_KEY = "claudeMascot.key";
const TICK_MS = 30000;       // evaluate activity every 30s
const HEARTBEAT_MS = 120000; // re-ping while coding at most this often (< 5min TTL)

let ctx;
let key = null;
let statusBar;
let lastActivity = 0;
let lastCodingPost = 0;
let currentStatus = "idle";
let timer = null;

function cfg() { return vscode.workspace.getConfiguration("claudeMascot"); }
function baseUrl() { return String(cfg().get("baseUrl") || "").replace(/\/+$/, ""); }
function idleTimeoutMs() { return (Number(cfg().get("idleTimeoutSeconds")) || 300) * 1000; }

async function post(path) {
  if (!key || typeof fetch !== "function") return;
  try {
    await fetch(baseUrl() + path, { method: "POST", headers: { authorization: "Bearer " + key } });
  } catch { /* network hiccups are non-fatal */ }
}

function render() {
  if (!statusBar) return;
  if (!key) {
    statusBar.text = "$(circle-slash) Claude: not linked";
    statusBar.tooltip = "Click to generate a key and link your README";
  } else {
    statusBar.text = currentStatus === "coding" ? "$(pulse) Claude: coding" : "$(coffee) Claude: idle";
    statusBar.tooltip = "Claude mascot — click for options";
  }
}

function markActivity() { lastActivity = Date.now(); }

async function tick() {
  if (!key) return;
  const now = Date.now();
  const active = now - lastActivity <= idleTimeoutMs();
  if (active) {
    if (currentStatus !== "coding" || now - lastCodingPost > HEARTBEAT_MS) {
      await post("/api/coding-now");
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
  await vscode.env.clipboard.writeText(key);
  render();
  markActivity();
  tick();
  const pick = await vscode.window.showInformationMessage(
    "Generated your Claude key (copied to clipboard). Open the link page to get your README embed.",
    "Open link page", "Show key"
  );
  if (pick === "Open link page") vscode.env.openExternal(vscode.Uri.parse(baseUrl() + "/link.html"));
  if (pick === "Show key") vscode.window.showInformationMessage("Key: " + key);
}

async function setKey() {
  const k = await vscode.window.showInputBox({ prompt: "Paste your Claude key", password: true, ignoreFocusOut: true });
  if (!k) return;
  key = k.trim();
  await ctx.secrets.store(SECRET_KEY, key);
  vscode.window.showInformationMessage("Claude key saved. Your editor activity now drives the mascot.");
  render();
  markActivity();
  tick();
}

async function showKey() {
  if (!key) return vscode.window.showWarningMessage("No Claude key set.");
  const pick = await vscode.window.showInformationMessage("Key: " + key, "Copy");
  if (pick === "Copy") vscode.env.clipboard.writeText(key);
}

async function unlink() {
  await ctx.secrets.delete(SECRET_KEY);
  key = null;
  currentStatus = "idle";
  render();
  vscode.window.showInformationMessage("Claude unlinked (key cleared).");
}

async function menu() {
  const items = key ? ["Show key", "Set key (paste)", "Unlink"] : ["Generate key & link", "Set key (paste)"];
  const pick = await vscode.window.showQuickPick(items, { title: "Claude Coding Mascot" });
  if (pick === "Generate key & link") return generateKey();
  if (pick === "Set key (paste)") return setKey();
  if (pick === "Show key") return showKey();
  if (pick === "Unlink") return unlink();
}

function activate(context) {
  ctx = context;
  statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBar.command = "claudeMascot.menu";
  statusBar.show();
  context.subscriptions.push(statusBar);

  context.subscriptions.push(
    vscode.commands.registerCommand("claudeMascot.generateKey", generateKey),
    vscode.commands.registerCommand("claudeMascot.setKey", setKey),
    vscode.commands.registerCommand("claudeMascot.showKey", showKey),
    vscode.commands.registerCommand("claudeMascot.unlink", unlink),
    vscode.commands.registerCommand("claudeMascot.menu", menu),
    vscode.workspace.onDidChangeTextDocument(markActivity),
    vscode.window.onDidChangeActiveTextEditor(markActivity),
    vscode.window.onDidChangeTextEditorSelection(markActivity),
    vscode.window.onDidChangeWindowState((s) => { if (s.focused) markActivity(); })
  );

  timer = setInterval(tick, TICK_MS);
  context.subscriptions.push({ dispose: () => clearInterval(timer) });

  context.secrets.get(SECRET_KEY).then((k) => {
    key = k || null;
    render();
    if (key) { markActivity(); tick(); }
    else {
      vscode.window.showInformationMessage("Claude Coding Mascot: link your README to start.", "Generate key & link")
        .then((p) => { if (p) generateKey(); });
    }
  });
}

async function deactivate() {
  if (key && typeof fetch === "function") {
    try { await fetch(baseUrl() + "/api/coding-stopped", { method: "POST", headers: { authorization: "Bearer " + key } }); } catch {}
  }
}

module.exports = { activate, deactivate };
