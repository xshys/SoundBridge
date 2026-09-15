🎧 SoundBridge

SoundBridge lets you download audio from videos directly into your self-hosted music library, without copy-paste, external websites, or cloud services.

Everything runs locally on your infrastructure.

✨ Key Features

🎵 Download audio from YouTube videos
📜 Download a whole playlist (or a YouTube mix) in one click, with "Track 3/12" progress
📁 Save directly into existing or new music folders
⭐ Favorite folders: up to 10, one click away in the popup
📌 Remembers the last folder you used
🏷️ Clean tags: artist, title, album and cover art, with "(Official Video)" and similar noise removed
🔊 Optional volume normalization, so every track plays at the same loudness
🔔 Optional desktop notification when a download finishes, even with the popup closed
🔄 Close the popup anytime: reopen it and logs and progress are right where you left them
🧠 Smart folder caching (no unnecessary API calls)
⚡ Asynchronous downloads with real-time logs
🖥️ Clean Material-style UI (dark mode by default)
🔐 API-key protected backend
🧩 No ads, no tracking, no analytics

🛠️ How It Works

SoundBridge is composed of:

- A browser extension (this)
- A self-hosted backend API
- A yt-dlp container running on your server
- Your existing media server (Jellyfin, Navidrome, etc.)

The extension:

- Detects the current video or playlist
- Sends a request to your backend
- Downloads and converts audio server-side
- Saves it into your media music library folder

No third-party servers are involved.

🔐 Privacy-First & Self-Hosted

SoundBridge is designed with privacy as a core principle:
- No tracking
- No telemetry
- No analytics
- No data collection

The extension communicates only with the backend you configure.
Notifications are off by default and ask for permission only when you turn them on.
You stay in full control of your data.

⚙️ Requirements

To use SoundBridge, you need:
- A self-hosted server (local machine, NAS, or VPS)
- Jellyfin, Navidrome, Gonic, etc. installed and configured, or simply a shared Samba folder
- Docker (for yt-dlp & Node.js backend)
- The SoundBridge backend API (open source)

Setup instructions are provided in the GitHub repository.

💚 Free & Open Source

SoundBridge is free and open source. You can:
- Inspect the code
- Host it yourself
- Modify it to fit your workflow

📝 Changelog

🆕 Version 1.0.5
- 📜 Playlist and YouTube mix download, with per-track progress
- ⭐ Favorite folders and last used folder
- 🔔 Optional desktop notifications when a download finishes
- 🔄 Logs and progress survive closing and reopening the popup
- 🏷️ Cleaner tags: artist and title split from the video title, playlist name as album, promo suffixes removed
- 🔊 Optional loudness normalization (enabled on the server)
- 🔒 The download button stays locked until the job is really finished
- 🔧 The API address works even if you type it without http://
👉 Playlist download, tagging and normalization need the updated backend. With an older backend the extension keeps working as before and simply hides the new options.

📦 Version 1.0.4
- 🎵 Download audio from YouTube videos into your music library
- 📁 Existing or new target folders, with smart folder caching
- ⚡ Asynchronous downloads with real-time logs
- 🖥️ Material-style UI with dark and light theme
- 🔐 API-key protected backend

⚠️ Disclaimer

SoundBridge does not bypass DRM or paid content protections.
You are responsible for complying with YouTube's Terms of Service and local copyright laws.

🔗 Links

📦 Source code & documentation: GitHub

🔐 Privacy policy: see Privacy tab
