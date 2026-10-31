# email

Minimal unified-inbox email client prototype (vanilla HTML/CSS/JS, no build step).

Open `index.html` in a browser to run it.

**Gmail live connect:** create a Desktop-type OAuth client at console.cloud.google.com, register both redirect URIs — `https://pixelstoproducts.github.io/email/callback.html` (hosted) and `http://localhost:8484/callback.html` (local) — paste the client ID in Settings, click Connect on a Gmail account.

## Run fully locally (recommended for privacy)

Download this repo as a ZIP (Code → Download ZIP), unzip, then serve it from your machine — no internet needed except for receiving/sending mail:

```
cd email-main
python3 -m http.server 8484
# open http://localhost:8484
```

Register only `http://localhost:8484/callback.html` as the redirect URI in Google Cloud. In local mode the app talks online **only** to Gmail's API (receive/send) and your AI provider (only when you click ✦); all state (emails, tokens, settings) stays in your browser's localStorage on your machine. For stronger protection, the future native macOS/iOS app will store tokens in the Keychain instead.

Features: hideable folders, unified multi-account inbox (3x Gmail + 1x SMTP), keyboard shortcuts (Backspace delete, Enter open, arrows navigate, Space compose), mobile swipe left = delete / swipe right = move, 10s undo on delete, follow-up reminders, inline AI compose refine (selection or full message, signature-aware, attachment-mention check), inbox-zero daily recap, AI garbage preselection, read receipts, per-account notification sounds, custom AI API key in settings.
