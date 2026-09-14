/**
 * yt-dlp argument building.
 * Kept out of server.js so the tests can import it without starting the server.
 */

const AUDIO_FORMATS = ["mp3", "m4a", "opus", "flac", "best"];

// Promo suffixes stripped from the title before artist/track are derived from it.
const TITLE_NOISE =
  "\\s*[\\(\\[](?i:official\\s*(video|audio|music\\s*video)|lyrics?|hd|4k)[\\)\\]]\\s*";

// Watch Later and Liked are tied to the account: without login cookies yt-dlp cannot see them.
// Mixes (RD...) are public and downloadable instead: they declare no total, but --playlist-end
// ends them all the same, so there is no reason to reject them.
const BLOCKED_LIST_PREFIXES = ["WL", "LL"];

const YT_HOSTS = ["youtube.com", "m.youtube.com", "music.youtube.com", "youtu.be"];

/** The playlist id, or "" when the URL has no downloadable one. */
export function getPlaylistId(url) {
  try {
    const u = new URL(url);
    if (u.hostname.replace(/^www\./, "") === "youtu.be") return "";  // short link: video only

    const id = u.searchParams.get("list") || "";
    if (!id) return "";

    return BLOCKED_LIST_PREFIXES.some(p => id.startsWith(p)) ? "" : id;
  } catch {
    return "";
  }
}

export function isValidYouTubeUrl(url) {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    if (!YT_HOSTS.includes(host)) return false;

    if (host === "youtu.be") return u.pathname.length > 1;
    if (u.pathname === "/watch") return !!u.searchParams.get("v");
    if (u.pathname === "/playlist") return !!getPlaylistId(url);
    if (u.pathname.startsWith("/shorts/")) return u.pathname.split("/").filter(Boolean).length >= 2;

    return false;
  } catch {
    return false;
  }
}

// The wording changed between yt-dlp versions: "item" in recent ones, "video" in older ones.
const PROGRESS_RE = /^\[download\] Downloading (?:item|video) (\d+) of (\d+)/;

/** {current, total} from the playlist progress line, null otherwise. */
export function parseProgress(line) {
  const m = PROGRESS_RE.exec(line);
  return m ? { current: Number(m[1]), total: Number(m[2]) } : null;
}

export function audioConfig(env = process.env) {
  const format = (env.AUDIO_FORMAT || "mp3").trim().toLowerCase();
  const target = (env.LOUDNORM_TARGET || "-14").trim();

  return {
    format: AUDIO_FORMATS.includes(format) ? format : "mp3",
    quality: (env.AUDIO_QUALITY || "0").trim(),
    normalize: (env.NORMALIZE_AUDIO || "0").trim() === "1",
    loudnormTarget: Number.isFinite(Number(target)) ? target : "-14",
  };
}

export function buildYtDlpArgs({ youtubeUrl, folder, playlist = false, maxPlaylistItems = 50 }, audio = audioConfig()) {
  const args = [
    "--extractor-args", "youtube:player_client=android",
    "--retries", "10",
    "--fragment-retries", "10",
    "-x",
    "--audio-format", audio.format,
    "--audio-quality", audio.quality,
    "--embed-metadata",
    "--embed-thumbnail",
    // Order matters: clean the title first, then split it into artist/track.
    "--replace-in-metadata", "title", TITLE_NOISE, "",
    "--parse-metadata", "title:%(artist)s - %(title)s",
    // %(playlist_title|)s is "" outside a playlist, and (?P<meta_album>.+) does not match the
    // empty string: without the default, yt-dlp would write album="NA" on every single video.
    "--parse-metadata", "%(playlist_title|)s:(?P<meta_album>.+)",
    // Same cleanup as the title, but after the parse: meta_album does not exist before it.
    "--replace-in-metadata", "meta_album", TITLE_NOISE, "",
    // --ignore-errors on playlists only: one removed track must not stop the other 30.
    ...(playlist
      ? ["--yes-playlist", "--playlist-end", String(maxPlaylistItems), "--ignore-errors"]
      : ["--no-playlist"]),
    "--restrict-filenames",
    "--newline",
    "-o", `/music/${folder}/%(artist,uploader)s - %(title)s.%(ext)s`,
  ];

  if (audio.normalize) {
    // ponytail: single-pass loudnorm, less accurate than two-pass (about 1 LUFS off).
    // Move to two passes only if the measured result is not good enough.
    args.push(
      "--postprocessor-args",
      `ExtractAudio:-af loudnorm=I=${audio.loudnormTarget}:TP=-1.5:LRA=11`
    );
  }

  args.push(youtubeUrl);
  return args;
}

/*
 * MIT License
 * Copyright (c) 2026 Antonio Viola
 */
