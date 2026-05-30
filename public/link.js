const $ = (id) => document.getElementById(id);
const base = () => `${location.origin}/mascot.svg`;

function randomKey() {
  // 32 hex chars of randomness — what the VS Code extension will generate too.
  const b = new Uint8Array(16);
  crypto.getRandomValues(b);
  return "ck_" + [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
}

$("gen").addEventListener("click", () => { $("key").value = randomKey(); });

$("go").addEventListener("click", async () => {
  $("err").textContent = "";
  const key = $("key").value.trim();
  if (key.length < 8) { $("err").textContent = "Enter a key (min 8 characters)."; return; }
  try {
    const r = await fetch("/api/link", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ key }),
    });
    const data = await r.json();
    if (!r.ok) { $("err").textContent = data.error || "Something went wrong."; return; }
    const url = `${base()}?id=${data.id}`;
    $("id").textContent = data.id;
    $("md").textContent = `![coding status](${url})`;
    $("out").src = `${url}&_t=${Date.now()}`;
  } catch (e) {
    $("err").textContent = "Request failed: " + e.message;
  }
});

document.querySelectorAll("[data-copy]").forEach((btn) => {
  btn.addEventListener("click", async () => {
    const el = $(btn.dataset.copy);
    await navigator.clipboard.writeText(el.textContent);
    const old = btn.textContent; btn.textContent = "Copied!";
    setTimeout(() => (btn.textContent = old), 1200);
  });
});
