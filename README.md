# email

Minimal unified-inbox email client prototype (vanilla HTML/CSS/JS, no build step).

Open `index.html` in a browser to run it.

**Gmail live connect:** create a Desktop-type OAuth client at console.cloud.google.com, register both redirect URIs — `https://pixelstoproducts.github.io/email/callback.html` (hosted) and `http://localhost:8484/callback.html` (local, serve with `python3 -m http.server 8484`) — paste the client ID in Settings, click Connect on a Gmail account.

Features: hideable folders, unified multi-account inbox (3x Gmail + 1x SMTP), keyboard shortcuts (Backspace delete, Enter open, arrows navigate, Space compose), mobile swipe left = delete / swipe right = move, 10s undo on delete, follow-up reminders, inline AI compose refine (selection or full message, signature-aware, attachment-mention check), inbox-zero daily recap, AI garbage preselection, read receipts, per-account notification sounds, custom AI API key in settings.
