const qs = (id) => document.getElementById(id);

const ICONS = {
  moon: `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M21 12.8A8.5 8.5 0 1 1 11.2 3a6.5 6.5 0 0 0 9.8 9.8Z" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    </svg>`,
  sun: `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 18a6 6 0 1 0 0-12a6 6 0 0 0 0 12Z" stroke="currentColor" stroke-width="2"/>
      <path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.4 1.4M17.6 17.6L19 19M19 5l-1.4 1.4M6.4 17.6L5 19"
            stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    </svg>`,
  ok: `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M20 6L9 17l-5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`,
  err: `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 9v4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      <path d="M12 17h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      <path d="M10.3 4.3 2.6 18.1A2 2 0 0 0 4.3 21h15.4a2 2 0 0 0 1.7-2.9L13.7 4.3a2 2 0 0 0-3.4 0Z"
            stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
    </svg>`,
  info: `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 16v-5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      <path d="M12 8h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      <path d="M21 12a9 9 0 1 1-18 0a9 9 0 0 1 18 0Z" stroke="currentColor" stroke-width="2"/>
    </svg>`
};

// ---------- Theme ----------
async function getConfig() {
  const { apiBaseUrl, apiKey, theme } = await chrome.storage.sync.get(["apiBaseUrl", "apiKey", "theme"]);
  return {
    apiBaseUrl: (apiBaseUrl || "").trim(),
    apiKey: (apiKey || "").trim(),
    theme: (theme || "dark").trim()
  };
}

function applyTheme(theme) {
  const wrap = qs("wrap");
  const t = theme === "light" ? "light" : "dark";
  wrap.setAttribute("data-theme", t);

  const btn = qs("themeToggle");
  btn.innerHTML = (t === "dark") ? ICONS.sun : ICONS.moon;
  btn.title = (t === "dark") ? "Switch to light" : "Switch to dark";
}

async function toggleTheme() {
  const { theme } = await getConfig();
  const next = (theme === "light") ? "dark" : "light";
  await chrome.storage.sync.set({ theme: next });
  applyTheme(next);
  toast(`Theme: ${next}`, "info");
}

function setEyeIcon(isHidden) {
  qs("toggleApiKey").innerHTML = isHidden
    ? `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M2 12s3.5-7 10-7s10 7 10 7s-3.5 7-10 7S2 12 2 12Z" stroke="currentColor" stroke-width="2"/>
        <path d="M12 15a3 3 0 1 0 0-6a3 3 0 0 0 0 6Z" stroke="currentColor" stroke-width="2"/>
      </svg>`
    : `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M3 3l18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M10.6 10.6a3 3 0 0 0 4.2 4.2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M9.4 5.2A10.6 10.6 0 0 1 12 5c6.5 0 10 7 10 7a18.3 18.3 0 0 1-4.1 5.1" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M6.1 6.1C3.4 8.2 2 12 2 12s3.5 7 10 7c1.1 0 2.1-.2 3.1-.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>`;
}

function toggleApiKeyVisibility() {
  const input = qs("apiKey");
  const hidden = input.type === "password";
  input.type = hidden ? "text" : "password";
  setEyeIcon(!hidden);
  toast(hidden ? "API Key visible" : "API Key hidden", "info", 1200);
}

// ---------- Pill ----------
function setPill(kind, text) {
  const pill = qs("pill");
  const pillText = qs("pillText");

  pill.className = `pill ${kind}`.trim();
  pillText.textContent = text;
}

// ---------- Toasts ----------
function toast(message, type = "info", timeoutMs = 2600) {
  const host = qs("toasts");
  const el = document.createElement("div");
  el.className = `toast ${type}`;

  const icon = (type === "ok") ? ICONS.ok : (type === "err") ? ICONS.err : ICONS.info;

  el.innerHTML = `
    <div class="ico">${icon}</div>
    <div class="txt">${escapeHtml(message)}</div>
    <button class="close" aria-label="Close toast" title="Close">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
    </button>
  `;

  const closeBtn = el.querySelector(".close");
  closeBtn.addEventListener("click", () => el.remove());

  host.appendChild(el);

  if (timeoutMs > 0) {
    setTimeout(() => el.remove(), timeoutMs);
  }
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// ---------- Actions ----------
// Without a scheme the value is treated as a relative path and every request
// resolves against chrome-extension://<id>/ (ERR_FILE_NOT_FOUND), so normalize here:
// this is the only place the base URL is written.
function normalizeBaseUrl(raw) {
  const s = (raw || "").trim();
  if (!s) return "";

  // Only http/https: a mistyped or unsupported scheme must not be silently prefixed.
  if (/:\/\//.test(s) && !/^https?:\/\//i.test(s)) return "";

  // Scheme first, trailing slashes after: stripping them first turns "http://" into "http:".
  const withScheme = /^https?:\/\//i.test(s) ? s : `http://${s}`;
  try {
    const u = new URL(withScheme);
    // Rejects a mistyped scheme ("htp://host" would otherwise parse with host "htp").
    return /^[a-z0-9.\-\[\]:]+$/i.test(u.host) ? withScheme.replace(/\/+$/, "") : "";
  } catch {
    return "";
  }
}

async function save() {
  const apiBaseUrl = normalizeBaseUrl(qs("apiBaseUrl").value);
  const apiKey = qs("apiKey").value.trim();

  if (!apiBaseUrl) {
    setPill("err", "Invalid API Base URL");
    toast("Invalid API Base URL. Example: http://192.168.1.10:8787", "err");
    return;
  }

  qs("apiBaseUrl").value = apiBaseUrl;   // show the corrected value
  await chrome.storage.sync.set({ apiBaseUrl, apiKey });

  toast("Saved ✅", "ok");
  setPill("warn", "Saved. Run a test to validate connectivity.");
}

// ---------- Notifications ----------
const ALARM = "pollJobs";

async function loadNotifyToggle() {
  // The permission can also be revoked from the browser settings: that is the real state.
  const granted = await chrome.permissions.contains({ permissions: ["notifications"] });
  const { notificationsEnabled } = await chrome.storage.sync.get("notificationsEnabled");

  qs("notifyToggle").checked = !!notificationsEnabled && granted;
}

function onNotifyToggle(e) {
  const el = e.target;

  if (!el.checked) {
    chrome.storage.sync.set({ notificationsEnabled: false })
      .then(() => chrome.alarms.clear(ALARM))
      .then(() => chrome.permissions.remove({ permissions: ["notifications"] }))
      .then(() => toast("Notifications disabled", "info"))
      .catch(err => toast(err.message, "err"));
    return;
  }

  // chrome.permissions.request must come from the user gesture: no await before this line.
  chrome.permissions.request({ permissions: ["notifications"] })
    .then(async (granted) => {
      el.checked = granted;
      await chrome.storage.sync.set({ notificationsEnabled: granted });
      toast(granted ? "Notifications enabled \u2705" : "Permission denied", granted ? "ok" : "err");
    })
    .catch(err => {
      el.checked = false;
      toast(err.message, "err");
    });
}

// ---------- Preset folders ----------
const MAX_PRESETS = 10;

async function getPresets() {
  const { presetFolders } = await chrome.storage.sync.get("presetFolders");
  return Array.isArray(presetFolders) ? presetFolders : [];
}

function renderPresets(list) {
  const host = qs("presetList");
  host.innerHTML = "";

  list.forEach((name) => {
    const chip = document.createElement("span");
    chip.className = "chip";

    const label = document.createElement("span");
    label.textContent = name;   // user input: textContent, never innerHTML

    const del = document.createElement("button");
    del.type = "button";
    del.textContent = "\u00D7";
    del.title = `Remove ${name}`;
    del.setAttribute("aria-label", `Remove ${name}`);
    del.addEventListener("click", () => removePreset(name).catch(e => toast(e.message, "err")));

    chip.append(label, del);
    host.appendChild(chip);
  });
}

async function savePresets(list) {
  const sorted = [...list].sort((a, b) => a.localeCompare(b, "it"));
  await chrome.storage.sync.set({ presetFolders: sorted });
  renderPresets(sorted);
}

async function addPreset() {
  // Only trim + length cap here: the authoritative sanitization is server side
  // (sanitizeFolderName in backend/server.js), duplicating it would mean two sources of truth.
  const name = qs("presetInput").value.trim().slice(0, 80);
  if (!name) return;

  const list = await getPresets();
  if (list.some(p => p.toLowerCase() === name.toLowerCase())) {
    toast("Already in your favorites", "info");
    return;
  }
  if (list.length >= MAX_PRESETS) {
    toast(`Maximum ${MAX_PRESETS} favorites`, "err");
    return;
  }

  await savePresets([...list, name]);
  qs("presetInput").value = "";
  toast("Favorite added \u2705", "ok");
}

async function removePreset(name) {
  const list = await getPresets();
  await savePresets(list.filter(p => p !== name));
  toast("Favorite removed", "info");
}

async function load() {
  const { apiBaseUrl, apiKey, theme } = await getConfig();
  qs("apiBaseUrl").value = apiBaseUrl || "";
  qs("apiKey").value = apiKey || "";
  applyTheme(theme);

  // Non-blocking: a failure here must not leave the API fields unrendered.
  getPresets().then(renderPresets).catch(e => toast(e?.message || "Favorites unavailable", "err"));
  loadNotifyToggle().catch(() => {});
}

async function test() {
  const { apiBaseUrl, apiKey } = await getConfig();

  if (!apiBaseUrl || !apiKey) {
    setPill("warn", "Missing configuration (API Base URL / API Key)");
    toast("Please set API Base URL and API Key first.", "err");
    return;
  }

  setPill("warn", "Testing connection...");

  try {
    const url = apiBaseUrl.replace(/\/+$/, "") + "/api/health";

    const res = await fetch(url, {
      headers: { "Authorization": `Bearer ${apiKey}` }
    });

    const text = await res.text();

    if (!res.ok) {
      setPill("err", `Error: HTTP ${res.status}`);
      toast(`Test failed: HTTP ${res.status}`, "err");
      return;
    }

    // try to parse JSON if present (optional)
    try { JSON.parse(text); } catch { /* ignore */ }

    setPill("ok", "Connected ✅ API is reachable");
    toast("Connection OK ✅", "ok");
  } catch (e) {
    setPill("err", "Network error / blocked by firewall");
    toast(e?.message || "Network error", "err");
  }
}

// ---------- Init ----------
qs("save").addEventListener("click", () => save().catch(e => toast(e.message, "err")));
qs("test").addEventListener("click", () => test().catch(e => toast(e.message, "err")));
qs("themeToggle").addEventListener("click", () => toggleTheme().catch(() => {}));
qs("toggleApiKey").addEventListener("click", toggleApiKeyVisibility);
qs("notifyToggle").addEventListener("change", onNotifyToggle);
qs("presetAdd").addEventListener("click", () => addPreset().catch(e => toast(e.message, "err")));
qs("presetInput").addEventListener("keydown", (e) => {
  if (e.key === "Enter") addPreset().catch(err => toast(err.message, "err"));
});

load().catch(() => {});
setEyeIcon(true);

/*
 * MIT License
 * Copyright (c) 2026 Antonio Viola
 */