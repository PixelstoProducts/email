# Requirements synthesis — mono. email client prototype

Purpose: hand-off document for a design review / alternative proposal.
Scope: a minimal, unified, multi-account web email client (prototype, static HTML/CSS/JS).

## 1. Original requirements (from product discussion)

### Folders & inbox management
- Hide folders **totally** (not in a dropdown) — e.g. Archive, Drafts, Scheduled are noise
- Main folders: Inbox, Sent/Outbox, Junk, (Trash optional — user later said Trash should not exist)
- Drafts / scheduled sending could live in the same folder as sent, distinguished by **tags/badges** rather than folders
- Delete should be a single action from the inbox (native-provider behavior), with a short undo window (~10 s, ⌘Z) instead of a separate Trash step
- Follow-up: an email can **reappear automatically** if no answer arrives

### Input: keyboard & mobile
- Shortcuts: **Backspace** = delete, **Enter** = open/read, **arrows** = next/previous, **Space** = reply
- Mobile: **swipe left = delete**, **swipe right = move to folder**, tap = read; no multi-option slide menus

### AI (on-demand only, never automatic)
- Summarize / expand / explain — typed **inline in the compose body**: select a sentence to refine it, or nothing selected = rewrite the whole message (no separate AI field)
- Signature-aware: do not append "best regards" + name if a signature already exists
- Flag when the body mentions an attachment but none is attached
- Settings: option to plug in an **API key of any model** to do all AI work

### Inbox-zero experience & UI taste
- Empty inbox shows a **daily recap** (sent today, follow-ups pending, email-related tasks) — not a background image
- Smart button to **preselect garbage** for review (titles visible, unselectable) before deletion
- Modern, minimal, no badges/categories clutter (promotions, social, etc.) — everything at the same level; AI should learn what the user opens vs. deletes over time
- Know when your email is **opened** (read receipts)
- Sender reputation / spam-risk score with AI recommendations (not yet implemented)

### Accounts & notifications
- Unified inbox over **3 personal Gmail + 1 professional SMTP (Hostinger)**
- **Different notification sounds per account**, set in settings

## 2. What is implemented so far (prototype in this repo)

| Requirement | Status | Where |
|---|---|---|
| Hide folders totally | ✅ hover × on folder, persisted (localStorage) | app.js `hideFolder` |
| Trash removed, permanent delete + 10 s undo | ✅ Backspace/swipe-left/w button delete permanently, toast with Undo | app.js `deleteEmail` |
| Drafts/scheduled in Outbox with badges | ✅ Sent renamed **Outbox**; pill badges: Draft, Outbox, Follow-up, Opened | app.js `renderList`, styles.css `.badge-tag` |
| Automatic follow-up | ✅ every sent email arms a follow-up (⏰ badge + recap), no manual button | app.js `sendEmail` |
| Keyboard shortcuts | ✅ Backspace / Enter / arrows / Space / Esc | app.js keydown handler |
| Mobile swipes | ✅ swipe left delete, swipe right move, tap read | app.js `bindSwipe` |
| Inline AI compose | ✅ full-screen composer; selection → refine selection, none → rewrite all (simulated) | app.js `runAIRefine` |
| Signature-aware AI | ✅ regex detects signature, avoids duplicate closing | app.js `hasSignature` |
| Attachment-mention flag | ✅ red warning in composer | app.js `checkWarnings` |
| Custom AI API key in settings | ✅ settings field (UI only; AI call is simulated) | app.js `renderSettings` |
| Empty-inbox daily recap | ✅ sent today / follow-ups / tasks cards | app.js `renderRecap` |
| AI garbage preselect | ✅ ✦ button in Inbox toolbar preselects garbage rows; Backspace deletes | app.js `preselectGarbage` |
| Read receipts | ✅ 👁 Opened badge on sent mail (toggle in settings) | app.js `openReader` |
| Multi-account unified inbox | ✅ 4 seeded accounts (3 gmail + 1 smtp), per-account color on rows; add/remove accounts in Settings (persisted) | app.js accounts |
| Per-account notification sounds | ✅ dropdown per account in Settings (UI only, no audio) | app.js `renderSettings` |
| Full-screen reply/compose | ✅ dedicated composer view, not a modal; Reply button + Enter/Space in reader | index.html `#composer` |
| Settings at sidebar bottom, toggle switches, fixed select caret padding | ✅ | styles.css |
| Full-width rows (no cards) | ✅ | styles.css `.email-row` |
| Dark punchy sidebar, indigo accent | ✅ | styles.css |
| Persistence + reset | ✅ emails/accounts/hidden folders in localStorage; "Reset inbox" in Settings | app.js |

## 3. Known gaps / not implemented

- Real Gmail OAuth and SMTP/Hostinger connections (seed data only)
- Real AI calls behind the configured API key (currently simulated)
- Actual notification sounds (settings only)
- Swipe-right currently moves to the first non-current folder — no folder picker
- Sender reputation / spam score with AI recommendations
- Learning model (open vs. delete) — garbage flag is static seed data
- No search, no threading, no attachments upload (attach is a stub)
- Undo is toast-only (10 s); ⌘Z label is informational, not wired globally

## 4. Open design questions for the review

1. Is a single global compose/reader/composer full-screen flow right, or should reader+list stay side-by-side on wide screens?
2. Should swipe-right open a folder picker (given folders can be hidden)?
3. Where should the ✦ AI actions live in the reader (summarize/explain incoming mail)?
4. Badge system: keep pills in the row meta, or move status into the subject line?
5. Account switcher: keep accounts out of the nav entirely, or a tiny avatar menu?
