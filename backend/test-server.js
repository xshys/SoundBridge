import { test } from "node:test";
import assert from "node:assert/strict";
import { audioConfig, buildYtDlpArgs, getPlaylistId, isValidYouTubeUrl, parseProgress } from "./ytdlp.js";

const args = (env) => buildYtDlpArgs({ youtubeUrl: "URL", folder: "Test" }, audioConfig(env));
const valueAfter = (arr, flag) => arr[arr.indexOf(flag) + 1];

test("default: no normalization, mp3 q0 (pre-existing behaviour)", () => {
  const a = args({});
  assert.equal(a.includes("--postprocessor-args"), false);
  assert.equal(valueAfter(a, "--audio-format"), "mp3");
  assert.equal(valueAfter(a, "--audio-quality"), "0");
  assert.equal(a.at(-1), "URL");
  assert.equal(valueAfter(a, "-o"), "/music/Test/%(artist,uploader)s - %(title)s.%(ext)s");
});

test("NORMALIZE_AUDIO=1 adds loudnorm on the ExtractAudio postprocessor", () => {
  const a = args({ NORMALIZE_AUDIO: "1" });
  assert.equal(
    valueAfter(a, "--postprocessor-args"),
    "ExtractAudio:-af loudnorm=I=-14:TP=-1.5:LRA=11"
  );
});

test("custom LOUDNORM_TARGET, falling back on a non-numeric value", () => {
  assert.match(valueAfter(args({ NORMALIZE_AUDIO: "1", LOUDNORM_TARGET: "-16" }), "--postprocessor-args"), /I=-16:/);
  assert.match(valueAfter(args({ NORMALIZE_AUDIO: "1", LOUDNORM_TARGET: "molto" }), "--postprocessor-args"), /I=-14:/);
});

test("a valid AUDIO_FORMAT passes through, an invalid one falls back to mp3", () => {
  assert.equal(audioConfig({ AUDIO_FORMAT: "OPUS" }).format, "opus");
  assert.equal(audioConfig({ AUDIO_FORMAT: "wav; rm -rf /" }).format, "mp3");
});

test("the title is cleaned before being split into artist/track", () => {
  const a = args({});
  assert.ok(a.indexOf("--replace-in-metadata") < a.indexOf("--parse-metadata"));
  assert.equal(valueAfter(a, "--parse-metadata"), "title:%(artist)s - %(title)s");
  assert.ok(a.includes("%(playlist_title|)s:(?P<meta_album>.+)"));
});

test("the album is cleaned AFTER being derived from the playlist", () => {
  const a = args({});
  const parsed = a.findIndex(x => String(x).includes("(?P<meta_album>"));
  const cleaned = a.indexOf("meta_album");

  assert.ok(parsed > -1 && cleaned > -1, "both flags must be present");
  // swapping them fails silently: the replace would run on a field that does not exist yet
  assert.ok(cleaned > parsed, "the meta_album replace must come after the parse");
  assert.equal(a[cleaned + 1], a[a.indexOf("title") + 1], "same regex as the title");
});

test("the title cleanup regex covers the common promo suffixes", () => {
  // same semantics as the Python side: (?i:...) and identical character classes
  const re = new RegExp(
    args({})[args({}).indexOf("--replace-in-metadata") + 2].replace("(?i:", "(?:"),
    "gi"
  );
  assert.equal("Artista - Brano (Official Video)".replace(re, ""), "Artista - Brano");
  assert.equal("Artista - Brano [Lyrics]".replace(re, ""), "Artista - Brano");
  assert.equal("Artista - Brano (Live 2019)".replace(re, ""), "Artista - Brano (Live 2019)");
});

/* ---------- Playlist ---------- */

test("accepted and rejected URLs", () => {
  const ok = [
    "https://www.youtube.com/watch?v=abc123",
    "https://youtu.be/abc123",
    "https://www.youtube.com/shorts/abc123",
    "https://music.youtube.com/watch?v=abc123",
    "https://www.youtube.com/playlist?list=PLabc",
    "https://www.youtube.com/watch?v=abc123&list=PLabc",
    "https://www.youtube.com/watch?v=abc123&list=RDabc&index=18",   // mix: supported
  ];
  const ko = [
    "https://vimeo.com/123",
    "https://www.youtube.com/watch",              // missing v=
    "https://www.youtube.com/playlist",           // missing list=
    "https://www.youtube.com/playlist?list=WL",    // needs a login
    "https://www.youtube.com/@channel/videos",     // whole channel
    "non un url",
  ];
  ok.forEach(u => assert.equal(isValidYouTubeUrl(u), true, u));
  ko.forEach(u => assert.equal(isValidYouTubeUrl(u), false, u));
});

test("getPlaylistId: only lists that can actually be downloaded", () => {
  assert.equal(getPlaylistId("https://www.youtube.com/playlist?list=PLabc"), "PLabc");
  assert.equal(getPlaylistId("https://www.youtube.com/watch?v=x&list=PLabc"), "PLabc");
  assert.equal(getPlaylistId("https://www.youtube.com/watch?v=x"), "");
  assert.equal(getPlaylistId("https://youtu.be/x?list=PLabc"), "");   // short link: video only

  // mixes are public and downloadable, Watch Later and Liked are not (they need login cookies)
  assert.equal(getPlaylistId("https://www.youtube.com/watch?v=x&list=RDabc"), "RDabc");
  ["WL", "LL"].forEach(p =>
    assert.equal(getPlaylistId(`https://www.youtube.com/playlist?list=${p}`), "", p));
});

test("playlist:true switches the flags, the default stays exactly as before", () => {
  const pl = buildYtDlpArgs({ youtubeUrl: "U", folder: "T", playlist: true, maxPlaylistItems: 30 });
  assert.ok(pl.includes("--yes-playlist"));
  assert.ok(pl.includes("--ignore-errors"));
  assert.equal(valueAfter(pl, "--playlist-end"), "30");
  assert.equal(pl.includes("--no-playlist"), false);

  const single = buildYtDlpArgs({ youtubeUrl: "U", folder: "T" });
  assert.ok(single.includes("--no-playlist"));
  assert.equal(single.includes("--yes-playlist"), false);
  assert.equal(single.includes("--ignore-errors"), false);

  // the file name does not change: no playlist index in the template
  assert.equal(valueAfter(pl, "-o"), valueAfter(single, "-o"));
});

test("parseProgress reads both yt-dlp wordings", () => {
  assert.deepEqual(parseProgress("[download] Downloading item 3 of 12"), { current: 3, total: 12 });
  assert.deepEqual(parseProgress("[download] Downloading video 3 of 12"), { current: 3, total: 12 });
  assert.equal(parseProgress("[download]  41.5% of 614.43KiB at 3.21MiB/s"), null);
  assert.equal(parseProgress("[ExtractAudio] Destination: /music/x.mp3"), null);
});
