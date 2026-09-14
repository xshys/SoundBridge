/**
 * Service worker (Chrome/Edge) ed event page (Firefox).
 *
 * Follows the jobs started by the popup and notifies when they finish: closing the popup must
 * not mean losing track of a download.
 *
 * This file must load in both browsers, so no imports: the config read and the authenticated
 * fetch below duplicate popup.js (apiFetch) on purpose. Sharing them would need importScripts
 * (Chrome only) or ES modules in the background, whose support differs between Chrome and
 * Firefox - more expensive than duplicating fifteen lines.
 */

const ALARM = "pollJobs";
const JOB_MAX_AGE_MS = 2 * 60 * 60 * 1000;   // matches the job TTL on the backend

async function apiGetJob(jobId) {
  const { apiBaseUrl, apiKey } = await chrome.storage.sync.get(["apiBaseUrl", "apiKey"]);
  if (!apiBaseUrl || !apiKey) throw new Error("Missing config");

  const res = await fetch(`${apiBaseUrl.replace(/\/+$/, "")}/api/downloads/${jobId}`, {
    headers: { "Authorization": `Bearer ${apiKey}` }
  });

  return { status: res.status, body: res.ok ? await res.json() : null };
}

async function notificationsAllowed() {
  const { notificationsEnabled } = await chrome.storage.sync.get("notificationsEnabled");
  if (!notificationsEnabled) return false;

  return chrome.permissions.contains({ permissions: ["notifications"] });
}

function notify(title, message) {
  // getURL, not a relative path: a bad iconUrl makes create() fail silently.
  // lastError is the only way to see that failure - there is no exception.
  chrome.notifications.create({
    type: "basic",
    iconUrl: chrome.runtime.getURL("icon128.png"),
    title,
    message: message || ""
  }, (id) => {
    if (chrome.runtime.lastError) console.error("[SoundBridge] notification failed:", chrome.runtime.lastError.message);
    else console.log("[SoundBridge] notified:", id, title, message);
  });
}

// The service worker is terminated when idle, so nothing can be observed live without keeping
// DevTools open - which itself keeps it alive and changes the behaviour being debugged.
// This leaves a breadcrumb in storage instead: read it later from any extension console with
//   chrome.storage.local.get("swLastTick", console.log)
async function trace(outcome, extra = {}) {
  await chrome.storage.local.set({ swLastTick: { at: new Date().toISOString(), outcome, ...extra } });
}

async function tick() {
  // Toggle off: no calls to the server from the background. The popup prunes the list instead.
  if (!(await notificationsAllowed())) {
    console.log("[SoundBridge] tick: notifications off or not granted, stopping the alarm");
    await trace("not-allowed");
    await chrome.alarms.clear(ALARM);
    return;
  }

  const { watchedJobs } = await chrome.storage.local.get("watchedJobs");
  const jobs = Array.isArray(watchedJobs) ? watchedJobs : [];
  console.log("[SoundBridge] tick: watching", jobs.length, "job(s)");
  if (jobs.length === 0) {
    await chrome.alarms.clear(ALARM);
    return;
  }

  const keep = [];
  const notified = [];

  for (const job of jobs) {
    if (Date.now() - (job.createdAt || 0) > JOB_MAX_AGE_MS) continue;   // expired on the server too

    let res;
    try {
      res = await apiGetJob(job.id);
    } catch {
      keep.push(job);   // offline or unconfigured: retry on the next tick
      continue;
    }

    if (res.status === 404) continue;              // job is gone: no notification
    if (!res.body?.job) { keep.push(job); continue; }

    const { status, error } = res.body.job;
    console.log("[SoundBridge]", job.id, "->", status);
    if (status === "done") { notify("Download completed", job.folder); notified.push(job.id); }
    else if (status === "error") { notify("Download failed", error || job.folder); notified.push(job.id); }
    else { keep.push(job); continue; }
  }

  await chrome.storage.local.set({ watchedJobs: keep });
  await trace("polled", { seen: jobs.length, notified: notified.length, kept: keep.length });
  if (keep.length === 0) await chrome.alarms.clear(ALARM);
}

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM) tick().catch(e => console.error("[SoundBridge] tick failed:", e));
});

// An alarm can be lost: browser restart, or the popup being closed mid-creation. Re-arm it
// whenever the worker starts, if there is still something to watch.
async function rearm() {
  const { watchedJobs } = await chrome.storage.local.get("watchedJobs");
  if (Array.isArray(watchedJobs) && watchedJobs.length > 0) {
    await chrome.alarms.create(ALARM, { when: Date.now() + 15000, periodInMinutes: 1 });
  }
}

chrome.runtime.onStartup.addListener(() => rearm().catch(() => {}));
chrome.runtime.onInstalled.addListener(() => rearm().catch(() => {}));

// Debug hook: from the service worker console, `await soundbridgeTick()` runs a poll right away
// instead of waiting for the alarm. Not reachable from web pages.
globalThis.soundbridgeTick = tick;

/*
 * MIT License
 * Copyright (c) 2026 Antonio Viola
 */
