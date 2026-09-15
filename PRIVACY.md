# Privacy Policy — SoundBridge

Last updated: September 2026 (extension version 1.0.5)

SoundBridge is a browser extension designed to help users download audio from YouTube videos directly into their self-hosted server media music library.

Your privacy is a core principle of this project.
SoundBridge is intentionally designed to be local-first, self-hosted, and free of tracking.

1. Data Collection

SoundBridge does NOT collect, store, sell, or share any personal data.

Specifically:

❌ No analytics

❌ No telemetry

❌ No tracking pixels

❌ No advertising identifiers

❌ No user profiling

2. Data Stored in the Browser

The extension stores a small amount of data in the browser using chrome.storage. Nothing is sent to the maintainer or to any service run by SoundBridge.

Settings (chrome.storage.sync):

API Base URL (user-defined, typically a local or VPN server)

API Key (used only to authenticate with the user’s own backend)

UI preferences (theme: dark/light)

Favorite folders (up to 10 folder names chosen by the user)

Notifications on/off preference

Working data (chrome.storage.local, never synchronized):

Cached list of the folder names in the user’s music library (refreshed every 24 hours)

The last folder the user downloaded into

Downloads in progress: job ID, target folder name and start time. Each entry is removed when the download finishes, and in any case after 2 hours

A technical record of the last background check (time and number of downloads checked), used only for troubleshooting

About browser sync:

Settings saved with chrome.storage.sync are synchronized across the user’s devices by the browser itself, through the user’s browser account (for example a Google account in Chrome or a Mozilla account in Firefox), and only if browser sync is enabled. This synchronization is performed and controlled by the browser vendor, not by SoundBridge, and the extension has no access to it. Users who do not want these settings, including the API Key, to be synchronized can disable extension or settings sync in their browser.

All of this data:

Is never transmitted by SoundBridge to third-party services

Can be removed at any time by uninstalling the extension or clearing browser storage

3. Network Requests

SoundBridge makes network requests only to:

The backend API explicitly configured by the user (usually on the local network or via VPN)

These requests are used to check that the backend is reachable, list the music folders, start a download and read its progress. When notifications are enabled, a background check contacts the same backend about once per minute, and only while a download is in progress.

The extension never communicates with SoundBridge servers, because:

There are no SoundBridge servers

The project is fully self-hosted

SoundBridge does not send data to:

Google

YouTube

Analytics providers

Any external third-party endpoints

The only exception is the browser sync described in section 2, which is a feature of the browser and not of the extension.

4. Authentication & Security

The API Key is used only to authenticate requests to the user’s own backend.

The API Key is never logged, shared, or transmitted elsewhere by the extension.

The backend is under full control of the user. It keeps the progress log of each download in memory for 2 hours, on the user’s own server, and does not use a database.

Users are responsible for securing their backend (e.g. LAN-only access, VPN, firewall rules).

5. Permissions Explanation

SoundBridge requests the following browser permissions:

storage
Used to save the settings and working data listed in section 2.

tabs and activeTab
Used to read the URL of the currently active tab in order to detect YouTube videos and playlists. The URL is read only when the user opens the extension popup.

alarms
Used to wake the extension about once per minute while a download is in progress, so it can check whether the download has finished. The alarm stops as soon as there is nothing left to check. When notifications are disabled, the extension makes no background requests to the backend.

host permissions (http://*/, https://*/)
Required to allow the extension to communicate with the backend API specified by the user.
The extension does not make requests to arbitrary websites beyond the user-configured endpoint.

Optional permission:

notifications
Used only to show a desktop notification when a download finishes or fails. It is not granted at installation: the browser asks for it only when the user turns notifications on in the extension settings, and it is released when the user turns them off. Notifications are displayed locally by the browser and operating system and contain only the download result and the folder name.

No other permissions are requested.

6. Third-Party Services

SoundBridge does not integrate with or embed any third-party services.

Any interaction with YouTube or personal media server happens:

Indirectly

On the user’s infrastructure

Through tools and services configured and controlled by the user

7. Children’s Privacy

SoundBridge is not intended for use by children under the age of 13 and does not knowingly collect any information from children.

8. Open Source Transparency

SoundBridge is open source.

Users are encouraged to review the source code to verify:

How data is handled

What network requests are made

That no tracking or analytics are present

9. Changes to This Policy

This Privacy Policy may be updated to reflect changes in functionality or legal requirements.

Any changes will be documented in the project repository.

10. Contact

If you have questions or concerns about this Privacy Policy, you can contact the project maintainer via the GitHub repository:

Project: SoundBridge
Maintainer: Antonio Viola
Repository: https://github.com/xShys/SoundBridge
