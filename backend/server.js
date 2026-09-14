import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { spawn } from "child_process";
import { audioConfig, buildYtDlpArgs, getPlaylistId, isValidYouTubeUrl, parseProgress } from "./ytdlp.js";

const app = express();

const PORT = parseInt(process.env.PORT || "8787", 10);
const API_KEY = (process.env.API_KEY || "").trim();
const MUSIC_ROOT = (process.env.MUSIC_ROOT || "/music").trim();
const YTDLP_CONTAINER = (process.env.YTDLP_CONTAINER || "yt-dlp-music").trim();
const CORS_ORIGINS = (process.env.CORS_ORIGINS || "").split(",").map(s => s.trim()).filter(Boolean);
const VERSION = process.env.npm_package_version || "unknown";
const AUDIO = audioConfig();
const MAX_PLAYLIST_ITEMS = parseInt(process.env.MAX_PLAYLIST_ITEMS || "50", 10);
const MAX_CONCURRENT_JOBS = parseInt(process.env.MAX_CONCURRENT_JOBS || "2", 10);

if (!API_KEY) {
  console.error("Missing API_KEY in env");
  process.exit(1);
}

app.use(helmet());
app.use(express.json({ limit: "256kb" }));

app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (CORS_ORIGINS.length === 0) return cb(null, true);
    const ok = CORS_ORIGINS.some(rule => rule.endsWith("*") ? origin.startsWith(rule.slice(0, -1)) : origin === rule);
    cb(ok ? null : new Error("CORS blocked"), ok);
  }
}));

app.use(rateLimit({
  windowMs: 60 * 1000,
  limit: 40,
  standardHeaders: true,
  legacyHeaders: false
}));

function auth(req, res, next) {
  if (req.method === "OPTIONS") return res.sendStatus(204);

  const h = req.headers.authorization || "";
  const token = h.startsWith("Bearer ") ? h.slice(7).trim() : "";
  if (!token || token !== API_KEY) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

function sanitizeFolderName(name) {
  const raw = (name || "").trim();
  if (!raw) return "";
  if (raw.includes("..") || raw.includes("/") || raw.includes("\\")) return "";
  return raw
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .replace(/[<>:"|?*]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

function ensureInsideRoot(targetPath) {
  const root = path.resolve(MUSIC_ROOT);
  const t = path.resolve(targetPath);
  return t.startsWith(root + path.sep) || t === root;
}

function listDirs(root) {
  const entries = fs.readdirSync(root, { withFileTypes: true });
  return entries.filter(e => e.isDirectory()).map(e => e.name).sort((a, b) => a.localeCompare(b, "it"));
}

// -------------------- Jobs (in-memory) --------------------
const JOBS = new Map();
/**
 * job = {
 *  id, status: queued|running|done|error,
 *  folder, youtubeUrl,
 *  createdAt, startedAt, finishedAt,
 *  exitCode, error,
 *  logs: string[], cursor: number,
 * }
 */
const JOB_TTL_MS = 2 * 60 * 60 * 1000; // keep finished jobs for 2 hours

function newJobId() {
  return crypto.randomBytes(12).toString("hex");
}

function appendLog(job, line) {
  // cap log size to avoid memory growth
  const MAX_LINES = 2000;
  job.logs.push(line);
  if (job.logs.length > MAX_LINES) job.logs.splice(0, job.logs.length - MAX_LINES);
}

function cleanupJobs() {
  const now = Date.now();
  for (const [id, job] of JOBS.entries()) {
    if ((job.status === "done" || job.status === "error") && job.finishedAt && (now - job.finishedAt > JOB_TTL_MS)) {
      JOBS.delete(id);
    }
  }
}
setInterval(cleanupJobs, 60 * 1000).unref();

// -------------------- yt-dlp runner (async) --------------------
function spawnDockerExecYtDlp({ youtubeUrl, folder, playlist, job }) {
  const args = [
    "exec",
    "-i",
    YTDLP_CONTAINER,
    "yt-dlp",
    ...buildYtDlpArgs({ youtubeUrl, folder, playlist, maxPlaylistItems: MAX_PLAYLIST_ITEMS }, AUDIO)
  ];

  const p = spawn("docker", args, { stdio: ["ignore", "pipe", "pipe"] });

  const onData = (buf, src) => {
    const text = buf.toString();
    text.split(/\r?\n/).filter(Boolean).forEach(line => {
      const progress = parseProgress(line);
      if (progress) job.progress = progress;
      appendLog(job, `[${src}] ${line}`);
    });
  };

  p.stdout.on("data", d => onData(d, "out"));
  p.stderr.on("data", d => onData(d, "err"));

  p.on("error", (err) => {
    job.status = "error";
    job.error = err?.message || "spawn error";
    job.finishedAt = Date.now();
    appendLog(job, `[err] ${job.error}`);
  });

  p.on("close", (code) => {
    job.exitCode = code;
    job.finishedAt = Date.now();
    if (code === 0) {
      job.status = "done";
      appendLog(job, "[out] ✅ Completed");
    } else {
      job.status = "error";
      job.error = `yt-dlp failed (code ${code})`;
      appendLog(job, `[err] ${job.error}`);
    }
  });

  return p;
}

// -------------------- Routes --------------------
app.get("/api/health", (req, res) => res.json({
  ok: true,
  version: VERSION,
  features: AUDIO.normalize ? ["playlist", "normalize"] : ["playlist"]
}));

app.get("/api/music/folders", auth, (req, res) => {
  try {
    if (!fs.existsSync(MUSIC_ROOT)) return res.status(500).json({ error: "MUSIC_ROOT missing" });
    res.json(listDirs(MUSIC_ROOT));
  } catch {
    res.status(500).json({ error: "Failed to list folders" });
  }
});

// POST now returns jobId immediately
app.post("/api/youtube/download", auth, async (req, res) => {
  const youtubeUrl = (req.body?.youtubeUrl || "").trim();
  const folderIn = (req.body?.folder || "").trim();
  const folder = sanitizeFolderName(folderIn);
  const playlist = req.body?.playlist === true;   // default: single video, same as older extensions

  if (!youtubeUrl || !isValidYouTubeUrl(youtubeUrl)) return res.status(400).json({ error: "Invalid youtubeUrl" });
  if (playlist && !getPlaylistId(youtubeUrl)) return res.status(400).json({ error: "Unsupported or sign-in only playlist" });
  if (!folder) return res.status(400).json({ error: "Invalid folder" });
  if (!fs.existsSync(MUSIC_ROOT)) return res.status(500).json({ error: "MUSIC_ROOT missing" });

  // A playlist is a single job but N downloads: with no cap, two requests saturate the line.
  const running = [...JOBS.values()].filter(j => j.status === "queued" || j.status === "running").length;
  if (running >= MAX_CONCURRENT_JOBS) return res.status(429).json({ error: "Too many concurrent jobs" });

  const targetDir = path.join(MUSIC_ROOT, folder);
  if (!ensureInsideRoot(targetDir)) return res.status(400).json({ error: "Folder outside root" });

  // The folder is created by yt-dlp, not here: this container runs as root (it needs the
  // docker socket), so a folder created here would be root-owned and unwritable by the
  // yt-dlp container running as a normal user. One writer, one owner, no split permissions.

  const id = newJobId();
  const job = {
    id,
    status: "queued",
    folder,
    youtubeUrl,
    playlist,
    progress: null,
    createdAt: Date.now(),
    startedAt: null,
    finishedAt: null,
    exitCode: null,
    error: null,
    logs: [],
  };

  JOBS.set(id, job);
  appendLog(job, `[out] Job queued: ${id}`);
  appendLog(job, `[out] Folder: ${folder}`);

  // Start async (next tick)
  setTimeout(() => {
    job.status = "running";
    job.startedAt = Date.now();
    appendLog(job, "[out] ▶ Starting yt-dlp...");
    spawnDockerExecYtDlp({ youtubeUrl, folder, playlist, job });
  }, 0);

  return res.json({ ok: true, jobId: id });
});

// Poll status + incremental logs
// GET /api/downloads/:jobId?since=<n>
app.get("/api/downloads/:jobId", auth, (req, res) => {
  const jobId = req.params.jobId;
  const job = JOBS.get(jobId);
  if (!job) return res.status(404).json({ error: "Job not found" });

  const since = Number.isFinite(Number(req.query.since)) ? Number(req.query.since) : 0;
  const logs = job.logs.slice(Math.max(0, since));
  const nextSince = since + logs.length;

  res.json({
    ok: true,
    job: {
      id: job.id,
      status: job.status,
      folder: job.folder,
      youtubeUrl: job.youtubeUrl,
      playlist: job.playlist,
      progress: job.progress,
      createdAt: job.createdAt,
      startedAt: job.startedAt,
      finishedAt: job.finishedAt,
      exitCode: job.exitCode,
      error: job.error,
    },
    logs,
    nextSince
  });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`API listening on :${PORT}`);
  console.log(`MUSIC_ROOT=${MUSIC_ROOT}`);
  console.log(`YTDLP_CONTAINER=${YTDLP_CONTAINER}`);
  console.log(`AUDIO=${AUDIO.format}/q${AUDIO.quality} normalize=${AUDIO.normalize ? AUDIO.loudnormTarget + " LUFS" : "off"}`);
});

/*
 * MIT License
 * Copyright (c) 2026 Antonio Viola
 */