'use strict';

/* ---------- State ---------- */
const DEFAULT_ACCOUNTS = [
  { id: 'gmail1', label: 'perso@gmail.com', type: 'gmail', color: '#4285F4', sound: 'default' },
  { id: 'gmail2', label: 'perso2@gmail.com', type: 'gmail', color: '#34A853', sound: 'default' },
  { id: 'gmail3', label: 'perso3@gmail.com', type: 'gmail', color: '#EA4335', sound: 'default' },
  { id: 'pro', label: 'me@pro-company.com', type: 'smtp', color: '#5b5bf0', sound: 'pro' },
];
const ACCOUNTS_KEY = 'mono.accounts';
const HIDDEN_FOLDERS_KEY = 'mono.hiddenFolders';

const DEFAULT_FOLDERS = ['Inbox', 'Sent', 'Junk'];

const state = {
  accounts: loadAccounts(),
  hiddenFolders: JSON.parse(localStorage.getItem(HIDDEN_FOLDERS_KEY) || '["Archive","Drafts","Scheduled","Trash"]'),
  folder: 'Inbox',
  selectedId: null,
  readerId: null,
  emails: [],
  settings: {
    aiApiKey: '',
    garbageDetection: true,
    readReceipts: true,
  },
};

function loadAccounts() {
  try {
    const saved = JSON.parse(localStorage.getItem(ACCOUNTS_KEY) || 'null');
    if (Array.isArray(saved) && saved.length) return saved;
  } catch (e) { /* fall through */ }
  return DEFAULT_ACCOUNTS;
}
function saveAccounts() {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(state.accounts));
}

function seedEmails() {
  const mk = (id, account, folder, sender, subject, snippet, hoursAgo, opts = {}) => ({
    id, account, folder, sender, subject, snippet,
    date: new Date(Date.now() - hoursAgo * 3600e3).toISOString(),
    unread: true, followUp: false, garbage: false, opened: false, ...opts,
  });
  state.emails = [
    mk('e1', 'pro', 'Inbox', 'Client Corp', 'Contract signature needed', 'Hi, please review the attached contract and sign before Friday…', 1),
    mk('e2', 'gmail1', 'Inbox', 'Newsletter Weekly', '50% off everything this week', 'Deals deals deals — unsubscribe anytime.', 3, { garbage: true }),
    mk('e3', 'gmail2', 'Inbox', 'Mom', 'Dinner on Sunday?', 'Are you coming for lunch this Sunday? Let me know!', 5),
    mk('e4', 'pro', 'Inbox', 'Hostinger Billing', 'Invoice #4821 due', 'Your hosting invoice is now available in your account.', 8),
    mk('e5', 'gmail3', 'Inbox', 'GitHub', '[repo] PR #42 merged', 'Pull request #42 was merged into main.', 10, { garbage: true }),
    mk('e6', 'gmail1', 'Inbox', 'Spaaaaam Offer', 'You won a free cruise!!!', 'Congratulations! Click here to claim your prize.', 12, { garbage: true }),
    mk('e7', 'pro', 'Sent', 'Client Corp', 'Re: Contract signature needed', 'Thanks, signing today.', 2, { unread: false, followUp: true }),
    mk('e8', 'gmail1', 'Sent', 'Mom', 'Re: Dinner on Sunday?', 'Yes, see you at noon!', 6, { unread: false }),
    mk('e9', 'gmail2', 'Junk', 'Casino Ads', 'Play now and win big', 'Limited time offer.', 20),
  ];
}

/* ---------- Helpers ---------- */
const $ = (sel) => document.querySelector(sel);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function visibleFolders() {
  return DEFAULT_FOLDERS.filter((f) => !state.hiddenFolders.includes(f));
}
function accountById(id) { return state.accounts.find((a) => a.id === id); }
function fmtDate(iso) {
  const d = new Date(iso);
  const sameDay = d.toDateString() === new Date().toDateString();
  return sameDay
    ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}
function toast(msg, undoFn) {
  const t = $('#toast');
  t.innerHTML = '';
  t.appendChild(document.createTextNode(msg));
  t.classList.remove('hidden');
  let timer;
  if (undoFn) {
    const b = document.createElement('button');
    b.textContent = 'Undo (⌘Z)';
    b.onclick = () => { clearTimeout(timer); undoFn(); t.classList.add('hidden'); };
    t.appendChild(b);
    timer = setTimeout(() => t.classList.add('hidden'), 10000);
  } else {
    timer = setTimeout(() => t.classList.add('hidden'), 3000);
  }
}

/* ---------- Render: sidebar ---------- */
function renderFolders() {
  const nav = $('#folderNav');
  nav.innerHTML = '';
  visibleFolders().forEach((f) => {
    const count = state.emails.filter((e) => e.folder === f).length;
    const div = document.createElement('div');
    div.className = 'folder' + (state.folder === f ? ' active' : '');
    div.innerHTML = `<span class="label">${esc(f)}</span><span class="count">${count}</span>`;
    const x = document.createElement('button');
    x.className = 'hide-x';
    x.textContent = '×';
    x.title = `Hide ${f} completely`;
    x.onclick = (ev) => { ev.stopPropagation(); hideFolder(f); };
    div.appendChild(x);
    div.onclick = () => { state.folder = f; state.readerId = null; closeReader(); renderAll(); };
    nav.appendChild(div);
  });
}

function hideFolder(f) {
  state.hiddenFolders.push(f);
  localStorage.setItem(HIDDEN_FOLDERS_KEY, JSON.stringify(state.hiddenFolders));
  if (state.folder === f) state.folder = 'Inbox';
  renderAll();
  toast(`${f} hidden completely`);
}

/* ---------- Render: list (full-width rows, no cards) ---------- */
function renderList() {
  $('#folderTitle').textContent = state.folder;
  const list = $('#emailList');
  const empty = $('#emptyState');
  const items = state.emails
    .filter((e) => e.folder === state.folder)
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  const actions = $('#toolbarActions');
  actions.innerHTML = '';
  if (state.folder === 'Inbox' && items.length > 0 && state.settings.garbageDetection) {
    const btn = document.createElement('button');
    btn.className = 'ghost-btn ai-btn';
    btn.innerHTML = '✦';
    btn.title = 'AI: select likely-garbage emails for review';
    btn.setAttribute('aria-label', 'Select garbage with AI');
    btn.onclick = preselectGarbage;
    actions.appendChild(btn);
  }

  if (items.length === 0) {
    list.innerHTML = '';
    if (state.folder === 'Inbox') renderRecap(empty);
    else empty.classList.add('hidden');
    return;
  }
  empty.classList.add('hidden');
  list.innerHTML = '';
  items.forEach((e) => {
    const row = document.createElement('div');
    row.className = 'email-row' + (e.unread ? ' unread' : '') + (state.selectedId === e.id || e._preselected ? ' selected' : '');
    const acc = accountById(e.account);
    row.innerHTML = `
      <span class="sender">${esc(e.sender)}</span>
      <span class="snippet"><strong style="font-weight:inherit">${esc(e.subject)}</strong> — ${esc(e.snippet)}</span>
      <span class="meta">${fmtDate(e.date)}<br><span class="flags">${e.followUp ? '<span class="followup-tag">⏰ follow-up</span> ' : ''}${e.opened ? '👁 opened' : ''}${acc ? `<br><span style="color:${acc.color}">${esc(acc.label)}</span>` : ''}</span></span>`;
    bindSwipe(row, e);
    row.onclick = () => openReader(e.id);
    list.appendChild(row);
  });
}

function preselectGarbage() {
  const garbage = state.emails.filter((e) => e.folder === 'Inbox' && e.garbage);
  garbage.forEach((e) => { e._preselected = true; });
  renderList();
  toast(`AI preselected ${garbage.length} likely-garbage emails — press Backspace to delete, or click a row to unselect`);
}

/* ---------- Render: empty inbox recap ---------- */
function renderRecap(container) {
  const today = new Date().toDateString();
  const sent = state.emails.filter((e) => e.folder === 'Sent' && new Date(e.date).toDateString() === today);
  const followUps = state.emails.filter((e) => e.followUp);
  const dueToday = state.emails.filter((e) => e.folder === 'Inbox' && /sign|invoice|due|review|reply/i.test(e.subject));
  container.classList.remove('hidden');
  container.innerHTML = `
    <div class="recap">
      <h2>Inbox zero 🎉</h2>
      <p class="sub">Here's your recap for today.</p>
      <div class="recap-card"><h3>Sent today</h3><ul>${
        sent.length ? sent.map((e) => `<li>→ ${esc(e.sender)}: ${esc(e.subject)}</li>`).join('') : '<li>Nothing sent yet</li>'
      }</ul></div>
      <div class="recap-card"><h3>Follow-ups awaiting an answer</h3><ul>${
        followUps.length ? followUps.map((e) => `<li>⏰ ${esc(e.sender)}: ${esc(e.subject)}</li>`).join('') : '<li>None — everything is answered</li>'
      }</ul></div>
      <div class="recap-card"><h3>Email-related tasks</h3><ul>${
        dueToday.length ? dueToday.map((e) => `<li>☐ ${esc(e.subject)} (${esc(e.sender)})</li>`).join('') : '<li>No pending tasks</li>'
      }</ul></div>
    </div>`;
}

/* ---------- Reader ---------- */
function openReader(id) {
  const e = state.emails.find((x) => x.id === id);
  if (!e) return;
  state.readerId = id;
  e.unread = false;
  if (state.settings.readReceipts) e.opened = true;
  $('#main').classList.add('hidden');
  $('#reader').classList.remove('hidden');
  $('#readerBody').innerHTML = `
    <h1>${esc(e.subject)}</h1>
    <div class="from">${esc(e.sender)} · ${esc(accountById(e.account)?.label || '')} · ${fmtDate(e.date)}</div>
    <p>${esc(e.snippet)} This is a demo body. In a real client the full thread would render here.</p>`;
  renderList();
}
function closeReader() {
  state.readerId = null;
  $('#reader').classList.add('hidden');
  $('#main').classList.remove('hidden');
}

/* ---------- Delete: permanent, with 10s undo ---------- */
function deleteEmail(id) {
  const e = state.emails.find((x) => x.id === id);
  if (!e) return;
  const idx = state.emails.indexOf(e);
  const snapshot = { ...e };
  state.emails.splice(idx, 1);
  if (state.readerId === id) closeReader();
  renderAll();
  toast('Deleted', () => {
    state.emails.splice(Math.min(idx, state.emails.length), 0, snapshot);
    renderAll();
  });
}

/* ---------- Swipe gestures (mobile) ---------- */
function bindSwipe(row, email) {
  let startX = 0, startY = 0, dx = 0, swiping = false;
  row.addEventListener('touchstart', (ev) => {
    startX = ev.touches[0].clientX; startY = ev.touches[0].clientY; swiping = true; dx = 0;
  }, { passive: true });
  row.addEventListener('touchmove', (ev) => {
    if (!swiping) return;
    dx = ev.touches[0].clientX - startX;
    const dy = ev.touches[0].clientY - startY;
    if (Math.abs(dx) > Math.abs(dy)) {
      row.style.transform = `translateX(${dx}px)`;
      row.style.background = dx < -40 ? '#fdecea' : dx > 40 ? '#eef4ff' : '';
    }
  }, { passive: true });
  row.addEventListener('touchend', () => {
    if (!swiping) return;
    swiping = false;
    row.style.transform = '';
    row.style.background = '';
    if (dx < -60) deleteEmail(email.id);          // swipe left = delete permanently
    else if (dx > 60) moveToFolder(email.id);      // swipe right = move to folder
  });
}
function moveToFolder(id) {
  const targets = visibleFolders().filter((f) => f !== state.folder);
  const target = targets[0] || 'Inbox';
  const e = state.emails.find((x) => x.id === id);
  if (e) { e.folder = target; renderAll(); toast(`Moved to ${target}`); }
}

/* ---------- Keyboard shortcuts ---------- */
document.addEventListener('keydown', (ev) => {
  if (ev.target.matches('input, [contenteditable]')) return;
  const items = state.emails.filter((e) => e.folder === state.folder);
  const current = items.findIndex((e) => e.id === state.selectedId);
  switch (ev.key) {
    case 'Backspace':
      ev.preventDefault();
      if (state.readerId) deleteEmail(state.readerId);
      else if (current >= 0) deleteEmail(items[current].id);
      else {
        const pre = items.filter((e) => e._preselected);
        pre.forEach((e) => deleteEmail(e.id));
      }
      break;
    case 'Enter':
      if (state.readerId) openComposeReply();
      else if (current >= 0) openReader(items[current].id);
      break;
    case 'ArrowDown':
      ev.preventDefault();
      state.selectedId = items[Math.min(current + 1, items.length - 1)]?.id;
      renderList();
      break;
    case 'ArrowUp':
      ev.preventDefault();
      state.selectedId = items[Math.max(current - 1, 0)]?.id;
      renderList();
      break;
    case ' ':
      ev.preventDefault();
      if (state.readerId) openComposeReply();
      else openCompose();
      break;
    case 'Escape':
      closeReader(); closeCompose(); closeSettings();
      break;
  }
});

/* ---------- Compose + inline AI ---------- */
function openCompose(to = '', subject = '') {
  $('#cTo').value = to;
  $('#cSubject').value = subject;
  $('#cBody').innerText = '';
  $('#composeWarnings').innerHTML = '';
  $('#aiStatus').textContent = '';
  state._attachmentAdded = false;
  $('#composeModal').classList.remove('hidden');
  $('#cTo').focus();
}
function openComposeReply() {
  const e = state.emails.find((x) => x.id === state.readerId);
  if (!e) return;
  const subject = e.subject.startsWith('Re:') ? e.subject : `Re: ${e.subject}`;
  openCompose(e.sender, subject);
}
function closeCompose() { $('#composeModal').classList.add('hidden'); }

function hasSignature(text) {
  return /(best regards|kind regards|regards|cheers|sincerely|--\s*\n|\n[A-Z][a-z]+ [A-Z][a-z]+\s*$)/m.test(text);
}
function mentionsAttachment(text) {
  return /(attach|enclosed|see the file|pdf|document attached)/i.test(text);
}

function runAIRefine() {
  const body = $('#cBody');
  const text = body.innerText;
  if (!text.trim()) { $('#aiStatus').textContent = 'Nothing to refine yet.'; return; }
  const sel = window.getSelection();
  const selected = sel && sel.toString().trim();
  $('#aiStatus').textContent = state.settings.aiApiKey
    ? 'Refining with your model…'
    : 'Refining with built-in model…';
  // Simulated AI pass (real implementation would call the configured model endpoint).
  setTimeout(() => {
    let result;
    if (selected) {
      result = text.replace(selected, selected.charAt(0).toUpperCase() + selected.slice(1).replace(/[.!]?$/, '. Reworded clearly and concisely.'));
    } else {
      result = text.trim();
      if (!hasSignature(result)) result += '\n\nBest regards,\nAlex';
      else result = result.replace(/(best regards|kind regards|regards)[^\n]*\n?/i, '');
    }
    body.innerText = result;
    $('#aiStatus').textContent = selected ? 'Selection refined.' : 'Message rewritten.';
    checkWarnings();
  }, 600);
}

function checkWarnings() {
  const w = $('#composeWarnings');
  w.innerHTML = '';
  const text = $('#cBody').innerText;
  if (mentionsAttachment(text) && !state._attachmentAdded) {
    const d = document.createElement('div');
    d.textContent = '⚠ You mention an attachment but none is attached.';
    w.appendChild(d);
  }
}

function sendEmail() {
  checkWarnings();
  const to = $('#cTo').value.trim();
  const subject = $('#cSubject').value.trim() || '(no subject)';
  if (!to) { toast('Add a recipient first'); return; }
  const account = state.accounts.find((a) => a.id === 'pro') || state.accounts[0];
  const sent = {
    id: 'e' + Date.now(), account: account.id, folder: 'Sent',
    sender: account.label, subject,
    snippet: $('#cBody').innerText.slice(0, 80),
    date: new Date().toISOString(), unread: false,
    followUp: true, // automatic: reappears in follow-ups if no answer arrives
    garbage: false, opened: false,
  };
  state.emails.unshift(sent);
  closeCompose();
  renderAll();
  toast('Sent — follow-up armed automatically (reappears if no answer)');
}

/* ---------- Settings ---------- */
function openSettings() { renderSettings(); $('#settingsModal').classList.remove('hidden'); }
function closeSettings() { $('#settingsModal').classList.add('hidden'); }

function switchHtml(id, checked) {
  return `<label class="switch"><input type="checkbox" id="${id}" ${checked ? 'checked' : ''}><span class="slider"></span></label>`;
}

function renderSettings() {
  const body = $('#settingsBody');
  body.innerHTML = '';
  const row = (label, controlHtml) => {
    const d = document.createElement('div');
    d.className = 'set-row';
    d.innerHTML = `<label>${label}</label>${controlHtml}`;
    body.appendChild(d);
    return d;
  };

  body.insertAdjacentHTML('beforeend', '<div class="set-section-title">Accounts</div>');
  state.accounts.forEach((a) => {
    const d = document.createElement('div');
    d.className = 'acct-row';
    d.innerHTML = `<span class="badge" style="background:${a.color}"></span>
      <span class="label">${esc(a.label)}</span><span class="type">${esc(a.type)}</span>`;
    const rm = document.createElement('button');
    rm.className = 'remove';
    rm.textContent = '×';
    rm.title = `Remove ${a.label}`;
    rm.onclick = () => {
      if (state.accounts.length <= 1) { toast('You need at least one account'); return; }
      state.accounts = state.accounts.filter((x) => x.id !== a.id);
      saveAccounts();
      renderSettings();
      toast(`Removed ${a.label}`);
    };
    d.appendChild(rm);
    body.appendChild(d);
  });
  const addDiv = document.createElement('div');
  addDiv.className = 'add-acct';
  addDiv.innerHTML = `
    <input type="text" id="newAcctEmail" placeholder="email address">
    <select id="newAcctType">
      <option value="gmail">Gmail</option>
      <option value="smtp">SMTP</option>
    </select>
    <button class="ghost-btn" id="addAcctBtn">Add</button>`;
  body.appendChild(addDiv);
  addDiv.querySelector('#addAcctBtn').onclick = () => {
    const email = addDiv.querySelector('#newAcctEmail').value.trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { toast('Enter a valid email address'); return; }
    const type = addDiv.querySelector('#newAcctType').value;
    const palette = ['#5b5bf0', '#4285F4', '#34A853', '#EA4335', '#b9770e', '#0e9f8a'];
    state.accounts.push({
      id: 'a' + Date.now(), label: email, type,
      color: palette[state.accounts.length % palette.length], sound: 'default',
    });
    saveAccounts();
    renderSettings();
    toast(`Added ${email}`);
  };

  body.insertAdjacentHTML('beforeend', '<div class="set-section-title">AI</div>');
  row('AI model API key (any provider)', `<input type="password" id="setApiKey" placeholder="sk-…" value="${esc(state.settings.aiApiKey)}">`)
    .querySelector('input').onchange = (e) => { state.settings.aiApiKey = e.target.value; };
  row('AI garbage preselection', switchHtml('setGarbage', state.settings.garbageDetection))
    .querySelector('input').onchange = (e) => { state.settings.garbageDetection = e.target.checked; };
  row('Read receipts (know when opened)', switchHtml('setReceipts', state.settings.readReceipts))
    .querySelector('input').onchange = (e) => { state.settings.readReceipts = e.target.checked; };

  body.insertAdjacentHTML('beforeend', '<div class="set-section-title">Notifications</div>');
  state.accounts.forEach((a) => {
    const d = row(`Sound — ${a.label}`, `<select id="snd-${a.id}">
      <option value="default" ${a.sound === 'default' ? 'selected' : ''}>Default</option>
      <option value="pro" ${a.sound === 'pro' ? 'selected' : ''}>Pro (distinct)</option>
      <option value="soft" ${a.sound === 'soft' ? 'selected' : ''}>Soft</option>
    </select>`);
    d.querySelector('select').onchange = (e) => { a.sound = e.target.value; saveAccounts(); };
  });

  const hiddenNote = document.createElement('div');
  hiddenNote.className = 'set-note';
  hiddenNote.innerHTML = `Hidden folders: ${state.hiddenFolders.map(esc).join(', ') || 'none'} — hover a folder in the sidebar and click × to hide it totally.`;
  body.appendChild(hiddenNote);
}

/* ---------- Wire up ---------- */
function renderAll() { renderFolders(); renderList(); }

$('#composeBtn').onclick = () => openCompose();
$('#closeCompose').onclick = closeCompose;
$('#sendBtn').onclick = sendEmail;
$('#aiBtn').onclick = runAIRefine;
$('#attachBtn').onclick = () => { state._attachmentAdded = true; $('#composeWarnings').innerHTML = ''; toast('Attachment added'); };
$('#cBody').addEventListener('input', checkWarnings);
$('#settingsBtn').onclick = openSettings;
$('#closeSettings').onclick = closeSettings;
$('#backBtn').onclick = closeReader;
$('#deleteBtn').onclick = () => state.readerId && deleteEmail(state.readerId);
$('#replyBtn').onclick = openComposeReply;

seedEmails();
renderAll();
