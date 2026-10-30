'use strict';

/* Gmail adapter: OAuth 2.0 (PKCE, browser flow) + Gmail API.
   Stores tokens in localStorage for the prototype; production must use Keychain. */

const GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.modify',
].join(' ');

const gmail = {
  clientId: '', // set in Settings (Google Cloud OAuth client ID)
  tokens: {},   // accountId -> {accessToken, refreshToken, expiresAt}

  configure(clientId) { this.clientId = clientId; },

  isConnected(accountId) {
    const t = this.tokens[accountId];
    return !!(t && t.accessToken && t.expiresAt > Date.now());
  },

  async connect(accountId, clientId) {
    if (clientId) this.clientId = clientId;
    if (!this.clientId) throw new Error('Set a Google OAuth client ID in Settings first.');
    const verifier = this._b64url(crypto.getRandomValues(new Uint8Array(32)));
    const challenge = this._b64url(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)));
    const state = this._b64url(crypto.getRandomValues(new Uint8Array(16))) + ':' + accountId;
    const redirect = new URL('callback.html', location.href).href;
    const url = 'https://accounts.google.com/o/oauth2/v2/auth' +
      '?client_id=' + encodeURIComponent(this.clientId) +
      '&redirect_uri=' + encodeURIComponent(redirect) +
      '&response_type=code&scope=' + encodeURIComponent(GMAIL_SCOPES) +
      '&code_challenge=' + challenge + '&code_challenge_method=S256' +
      '&state=' + state + '&access_type=offline&prompt=consent';
    const win = window.open(url, 'gmail-auth', 'width=520,height=640');
    return new Promise((resolve, reject) => {
      const handler = async (ev) => {
        if (ev.origin !== location.origin) return;
        const data = ev.data || {};
        if (!data.code) return;
        window.removeEventListener('message', handler);
        try { win && win.close(); } catch (e) {}
        const [, acc] = (data.state || '').split(':');
        const tokens = await this._exchange(data.code, verifier, redirect);
        this.tokens[acc] = tokens;
        this._save();
        resolve(acc);
      };
      window.addEventListener('message', handler);
      setTimeout(() => { window.removeEventListener('message', handler); reject(new Error('Auth timed out')); }, 120000);
    });
  },

  async _exchange(code, verifier, redirect) {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: this.clientId, code, code_verifier: verifier,
        grant_type: 'authorization_code', redirect_uri: redirect,
      }),
    });
    if (!res.ok) throw new Error('Token exchange failed: ' + res.status);
    const j = await res.json();
    return { accessToken: j.access_token, refreshToken: j.refresh_token, expiresAt: Date.now() + (j.expires_in - 60) * 1000 };
  },

  async _token(accountId) {
    let t = this.tokens[accountId];
    if (!t) throw new Error('Not connected');
    if (t.expiresAt <= Date.now()) {
      const res = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: this.clientId, refresh_token: t.refreshToken, grant_type: 'refresh_token',
        }),
      });
      if (!res.ok) throw new Error('Refresh failed — reconnect the account');
      const j = await res.json();
      t = { ...t, accessToken: j.access_token, expiresAt: Date.now() + (j.expires_in - 60) * 1000 };
      this.tokens[accountId] = t;
      this._save();
    }
    return t.accessToken;
  },

  async _api(accountId, path, opts = {}) {
    const token = await this._token(accountId);
    const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/' + path, {
      ...opts,
      headers: { Authorization: 'Bearer ' + token, ...(opts.headers || {}) },
    });
    if (!res.ok) throw new Error('Gmail API ' + res.status + ' on ' + path);
    return res.status === 204 ? null : res.json();
  },

  async listMessages(accountId, { max = 30, query = 'in:inbox' } = {}) {
    const list = await this._api(accountId, `messages?q=${encodeURIComponent(query)}&maxResults=${max}`);
    const msgs = await Promise.all((list.messages || []).slice(0, max).map((m) =>
      this._api(accountId, `messages/${m.id}?format=full`)));
    return msgs.map((m) => this._toEmail(accountId, m));
  },

  async send(accountId, { to, subject, body }) {
    const raw = this._b64url(new TextEncoder().encode(
      `To: ${to}\r\nSubject: ${subject}\r\nContent-Type: text/plain; charset="UTF-8"\r\n\r\n${body}`));
    return this._api(accountId, 'messages/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ raw }),
    });
  },

  _toEmail(accountId, m) {
    const h = (name) => (m.payload.headers.find((x) => x.name.toLowerCase() === name.toLowerCase()) || {}).value || '';
    const part = m.payload.parts && m.payload.parts.length ? m.payload.parts[0] : m.payload;
    const data = part.body && part.body.data ? atob(part.body.data.replace(/-/g, '+').replace(/_/g, '/')) : '';
    return {
      id: m.id, account: accountId, folder: 'Inbox',
      sender: h('From'), subject: h('Subject') || '(no subject)', snippet: data.slice(0, 120),
      date: new Date(parseInt(m.internalDate, 10)).toISOString(),
      unread: (m.labelIds || []).includes('UNREAD'), followUp: false, garbage: false, opened: false, status: null,
    };
  },

  _save() { localStorage.setItem('mono.gmailTokens', JSON.stringify(this.tokens)); },
  _load() {
    try { this.tokens = JSON.parse(localStorage.getItem('mono.gmailTokens') || '{}'); } catch (e) { this.tokens = {}; }
  },
  _b64url(buf) {
    return btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  },
};
gmail._load();
