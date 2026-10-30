# Requirements synthesis — mono. email client prototype

Purpose: hand-off brief for a design review / alternative proposal. Section 1 reproduces the original product requirements in full detail; section 2 maps them to what the prototype implements today.

---

## 1. Original requirements (full detail)

### 1.1 Folders & noise
- Most email clients copy **all** folders from the native provider — it is noise. The user wants a way to **hide folders totally** (not collapse them into a dropdown). Example: they don't use Archive.
- Main folders they actually use: **Inbox** (receives), **Sent/Outbox** (what they sent), **Junk/spam**, and delete.
- Draft and scheduled-send could live **in the same folder as Sent**, distinguished by **tags** — "sent" as a folder name may not even be the right term.
- **Delete should be a single action**: deleting from the inbox deletes directly (like the native provider), with **⌘Z undo within ~10 seconds** if it was a mistake. A separate Trash folder + second delete action is redundant.

### 1.2 Follow-ups
- An email should be able to **reappear for follow-up if no answer is received**.

### 1.3 Keyboard shortcuts (essential)
- **Backspace** = delete
- **Enter** = read/open
- **Arrows** = next / previous
- **Space** = reply

### 1.4 Mobile gestures
- No slide menus revealing multiple options.
- **Swipe left = delete**, **swipe right = move to a folder**, **tap = read**.

### 1.5 Inside an email — AI (on user decision only, never automatic)
- AI synthesis is nice **only on demand**: when the email is too long, or when the user doesn't understand a term and wants an **explanation**. So AI = **summarizing, expanding, synthesizing, explaining**.
- **Drafting with AI**: from scratch with the context of the received email, or from a few typed words.
- Most tools have a separate AI field — the user prefers to **type in the email body itself**, then **select a specific sentence to refine with AI**; if nothing is selected, the **whole message** is rewritten.
- **Signature awareness**: most AI appends "best regards" + name, but that's usually part of the signature → duplicated. Rule: **if a signature exists, the closing words must not be added**.
- **Attachment intelligence**: if the body mentions an attachment but none is attached, it should **flag it**.
- **Custom model**: AI embedded in the tool is fine, but settings should allow associating an **API key of any model** to do all the AI work.

### 1.6 Inbox-zero experience
- User likes an **empty inbox**. Most clients show a decorative background image when empty — useless. Better: a **recap of the day** — which emails were sent, what follow-ups are pending, what email-related tasks could be done.

### 1.7 UI taste
- **Modern but simple, minimalist** (liked Sparrow's vibe). But often too many badges/categories (promotion, social, etc.) — not needed. Everything received should be **at the same level**; over time **AI should learn what the user opens vs. what they delete**.
- A **smart button could preselect all garbage emails** for review — with titles visible so the user can unselect ones they want to read; selected ones get deleted.

### 1.8 Trust & deliverability
- Know **when your email is opened** (read receipts) — nice to have.
- See if **email notoriety/deliverability is clean or considered spam**, with **AI recommendations to improve the score**.

### 1.9 Accounts & notifications
- **3 personal emails (Gmail, easy login) + 1 professional (SMTP via Hostinger)**, all in the **same unified inbox**.
- **Notification sound can differ between personal and pro** — set in settings.

---

## 2. What the prototype implements today

| Requirement | Status | Where |
|---|---|---|
| Hide folders totally | ✅ hover × on folder, persisted in localStorage (Archive/Drafts/Scheduled/Trash hidden by default) | app.js `hideFolder` |
| Draft/scheduled in Outbox with tags | ✅ "Sent" renamed **Outbox**; pill badges Draft / Outbox / Follow-up / Opened; Save draft button; clicking a draft reopens it | app.js `renderList`, `saveDraft` |
| Single-action delete + 10 s undo, no Trash | ✅ Backspace / swipe-left / Delete button remove permanently; undo toast with ⌘Z hint; Trash hidden | app.js `deleteEmail` |
| Automatic follow-up reappear | ✅ every sent email arms a follow-up automatically (⏰ badge + recap entry); no manual button | app.js `sendEmail` |
| Keyboard shortcuts | ✅ Backspace / Enter / arrows / Space / Esc | app.js keydown handler |
| Mobile gestures | ✅ swipe left delete, swipe right move, tap read | app.js `bindSwipe` |
| On-demand AI in reader | ⚠️ not yet (compose only) | — |
| Inline AI compose (selection vs. whole message) | ✅ full-screen composer; selection → refine selection, none → rewrite all (simulated) | app.js `runAIRefine` |
| AI drafting from few words / thread context | ⚠️ reply pre-fills To + "Re:" subject; free-text drafting simulated | app.js `openComposeReply` |
| Signature-aware AI | ✅ detects signature, won't duplicate closing | app.js `hasSignature` |
| Attachment-mention flag | ✅ red warning in composer | app.js `checkWarnings` |
| Custom AI API key in settings | ✅ settings field (UI only — AI call is simulated) | app.js `renderSettings` |
| Empty-inbox daily recap | ✅ cards: sent today, follow-ups awaiting answer, email tasks | app.js `renderRecap` |
| Minimalist UI, no category clutter | ✅ dark sidebar, indigo accent, full-width rows (no cards), no promo/social tabs | styles.css |
| AI garbage preselect with review | ✅ ✦ button in Inbox toolbar preselects garbage rows (visible, unselectable); Backspace deletes | app.js `preselectGarbage` |
| Learning from open/delete | ❌ garbage flags are static seed data; no learning yet | — |
| Read receipts | ✅ 👁 Opened badge on sent mail, toggle in settings | app.js `openReader` |
| Sender reputation / spam score + AI tips | ❌ not implemented | — |
| Unified inbox: 3× Gmail + 1× SMTP (Hostinger) | ✅ 4 seeded accounts, per-account color on rows; add/remove accounts in Settings (persisted) | app.js accounts |
| Per-account notification sounds | ✅ dropdown per account in Settings (UI only, no audio playback) | app.js `renderSettings` |
| Full-screen reply/compose (not modal) | ✅ dedicated composer view; Reply button + Enter/Space in reader | index.html `#composer` |
| Settings pinned at sidebar bottom, toggle switches, fixed select caret padding | ✅ | styles.css |
| Persistence + demo reset | ✅ emails/accounts/hidden folders in localStorage; "Reset inbox" button in Settings | app.js |

## 3. Known gaps

- Real Gmail OAuth login and SMTP/Hostinger sending (seed data only)
- Real AI inference behind the configured API key (currently simulated)
- Actual notification sounds (settings only)
- Swipe-right moves to the first non-current folder — no folder picker
- No learning model (open vs. delete); garbage detection is static
- No sender reputation / spam score
- No search, threading, real attachment upload, global ⌘Z wiring (undo is toast-only)

## 4. Open design questions for the review

1. Reader layout: full-screen takeover (current) vs. list + reader side-by-side on wide screens?
2. Should swipe-right open a folder picker, given folders can be hidden entirely?
3. Where do ✦ AI actions (summarize / explain / expand) belong in the reader view?
4. Badges: keep as pills in the row meta (current) or integrate status into the subject line?
5. Account switching: keep accounts out of the nav entirely (current) or a minimal avatar menu?

## 5. Next phase — real connections & native apps

### 5.1 Real Google connection (receive + send)
- Gmail API with **OAuth 2.0** (not IMAP scraping, not app passwords)
  - Scopes: `gmail.readonly` (receive), `gmail.send` (send), `gmail.modify` (archive / mark read server-side)
  - Auth: OAuth consent screen + **PKCE**; redirect URI is derived from `location.origin`, so it works both hosted (`https://pixelstoproducts.github.io/email/callback.html`) and locally (`http://localhost:8484/callback.html`) — register **both** in the Google Cloud console; refresh token stored in **Keychain** on macOS/iOS — never in repo or localStorage in production
  - Receive: `users.messages.list` + `users.messages.get`; live updates via `users.watch` + Cloud Pub/Sub push (poll fallback)
  - Send: `users.messages.send` with raw RFC 2822 MIME (base64url) — no SMTP needed for Gmail accounts
- Pro account stays on **SMTP/IMAP (Hostinger)** with its own credentials
- Architecture: a **mail-adapter interface** with two implementations — `gmail-api` and `smtp-imap` — so the UI is unchanged

### 5.2 iOS + macOS app, light to download
- Avoid Electron (too heavy). Options:
  - **Tauri** (Rust core + webview, ~5–15 MB): reuses this web UI almost as-is; one codebase for both platforms
  - **Native Swift**: one Xcode project with macOS + iOS targets sharing a Swift core package (~10–20 MB), Gmail via GoogleSignIn SDK, IMAP/SMTP via native libs — best Apple feel, App Store distribution
  - Flutter (~15–25 MB): one codebase, heavier UI rewrite
- Both wrap the same mail-adapter interface; AI stays pluggable behind the user's API key
- Sequencing: (1) adapter-based architecture in web prototype, (2) real Gmail OAuth receive/send, (3) port to Tauri or Swift with the adapter intact

### 5.3 Implemented in this phase
- `gmail.js`: Gmail adapter — PKCE OAuth sign-in (client_id + redirect via `http://localhost` or loopback), token refresh, `messages.list`/`get`/`send`, message mapping to the app model
- Demo mode remains the default; "Connect" per Gmail account in Settings switches that account to live data
- SMTP/IMAP adapter is a documented stub (needs a backend or native lib for credentials)
