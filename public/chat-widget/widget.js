/* ClearanceIQ — Customs Compliance Expert Chat Widget
 *
 * Guardrails:
 *  - Cloudflare Turnstile token required per message (non-interactive)
 *  - session cookie for per-session rate limiting
 *  - client-side max input length
 *  - never logs message content
 *  - error text is generic; no internals are surfaced
 */
(function() {
  'use strict';

  const WIDGET_ID = 'ciq-chat-widget';
  const API_URL = '/api/chat';
  const TURNSTILE_SITEKEY = '0x4AAAAAAF9fbna-3kJBdQhE';
  const MAX_LEN = 600;
  const NOTICE = 'General information only — not customs-broker or legal advice.';

  let turnstileToken = null;

  function getCookie(name) {
    const m = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
    return m ? decodeURIComponent(m[1]) : null;
  }

  function setCookie(name, value, days) {
    const d = new Date();
    d.setTime(d.getTime() + days * 864e5);
    document.cookie = name + '=' + encodeURIComponent(value) +
      '; expires=' + d.toUTCString() + '; path=/; SameSite=Lax' +
      (location.protocol === 'https:' ? '; Secure' : '');
  }

  function getSessionId() {
    let sid = getCookie('ciq_sid');
    if (!sid) {
      sid = (window.crypto && crypto.randomUUID)
        ? crypto.randomUUID()
        : 's' + Date.now().toString(36) + Math.random().toString(36).slice(2);
      setCookie('ciq_sid', sid, 1);
    }
    return sid;
  }

  function loadTurnstile() {
    if (window.turnstile) { renderTurnstile(); return; }
    const s = document.createElement('script');
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    s.async = true;
    s.defer = true;
    s.onload = renderTurnstile;
    document.head.appendChild(s);
  }

  function renderTurnstile() {
    const widgetEl = document.getElementById(WIDGET_ID);
    const host = widgetEl && widgetEl.querySelector('.turnstile');
    const win = widgetEl && widgetEl.querySelector('.window');
    // Turnstile cannot execute inside a hidden container — only render when open.
    if (!host || !win || !win.classList.contains('open')) return;
    if (!window.turnstile) return;
    try {
      host.innerHTML = '';
      window.turnstile.render(host, {
        sitekey: TURNSTILE_SITEKEY,
        callback: function(t) { turnstileToken = t; },
        'expired-callback': function() { turnstileToken = null; renderTurnstile(); },
        'error-callback': function() { turnstileToken = null; }
      });
    } catch (e) { turnstileToken = null; }
  }

  function injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
      #${WIDGET_ID} {
        position: fixed;
        bottom: 20px;
        right: 20px;
        z-index: 9999;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      }
      #${WIDGET_ID} button.launcher {
        width: 60px;
        height: 60px;
        border-radius: 50%;
        border: none;
        background: #0f172a;
        color: #fff;
        font-size: 24px;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      }
      #${WIDGET_ID} .window {
        display: none;
        position: absolute;
        bottom: 72px;
        right: 0;
        width: 360px;
        max-width: calc(100vw - 40px);
        height: 480px;
        max-height: calc(100vh - 120px);
        background: #fff;
        border-radius: 12px;
        box-shadow: 0 8px 24px rgba(0,0,0,0.15);
        flex-direction: column;
        overflow: hidden;
      }
      #${WIDGET_ID} .window.open { display: flex; }
      #${WIDGET_ID} .header {
        background: #0f172a;
        color: #fff;
        padding: 16px;
        font-weight: 600;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      #${WIDGET_ID} .header button {
        background: none;
        border: none;
        color: #fff;
        font-size: 18px;
        cursor: pointer;
      }
      #${WIDGET_ID} .messages {
        flex: 1;
        overflow-y: auto;
        padding: 12px;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      #${WIDGET_ID} .msg {
        max-width: 80%;
        padding: 10px 12px;
        border-radius: 12px;
        font-size: 14px;
        line-height: 1.4;
      }
      #${WIDGET_ID} .msg.user {
        align-self: flex-end;
        background: #0f172a;
        color: #fff;
      }
      #${WIDGET_ID} .msg.bot {
        align-self: flex-start;
        background: #f1f5f9;
        color: #0f172a;
      }
      #${WIDGET_ID} .notice {
        font-size: 11px;
        color: #64748b;
        padding: 6px 12px;
        border-top: 1px solid #e2e8f0;
        background: #f8fafc;
      }
      #${WIDGET_ID} .turnstile {
        padding: 0 12px 8px;
      }
      #${WIDGET_ID} .composer {
        display: flex;
        padding: 12px;
        border-top: 1px solid #e2e8f0;
        gap: 8px;
      }
      #${WIDGET_ID} input {
        flex: 1;
        padding: 10px;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        font-size: 14px;
      }
      #${WIDGET_ID} button.send {
        background: #0f172a;
        color: #fff;
        border: none;
        padding: 10px 14px;
        border-radius: 8px;
        cursor: pointer;
        font-size: 14px;
      }
      #${WIDGET_ID} .typing {
        font-style: italic;
        color: #64748b;
        font-size: 12px;
        padding: 4px 12px;
      }
    `;
    document.head.appendChild(style);
  }

  function injectHTML() {
    const root = document.getElementById('ciq-chat-root') || document.body;
    const div = document.createElement('div');
    div.id = WIDGET_ID;
    div.innerHTML = `
      <button class="launcher" title="Ask ClearanceIQ Expert">💬</button>
      <div class="window">
        <div class="header">
          <span>ClearanceIQ Compliance Assistant</span>
          <button class="close">✕</button>
        </div>
        <div class="messages">
          <div class="msg bot">Ask about CBP holds, duty calculation, HTS classification, bonds, or ISF. ${NOTICE}</div>
        </div>
        <div class="turnstile"></div>
        <div class="notice">${NOTICE}</div>
        <div class="composer">
          <input type="text" maxlength="${MAX_LEN}" placeholder="Type your import question…" autocomplete="off">
          <button class="send">Send</button>
        </div>
      </div>
    `;
    root.appendChild(div);
  }

  function bindEvents() {
    const widget = document.getElementById(WIDGET_ID);
    const launcher = widget.querySelector('.launcher');
    const close = widget.querySelector('.close');
    const win = widget.querySelector('.window');
    const input = widget.querySelector('input');
    const send = widget.querySelector('.send');
    const messages = widget.querySelector('.messages');

    launcher.addEventListener('click', () => {
      win.classList.toggle('open');
      if (win.classList.contains('open')) renderTurnstile();
    });
    close.addEventListener('click', () => win.classList.remove('open'));

    async function sendMessage() {
      const text = input.value.trim();
      if (!text) return;
      if (text.length > MAX_LEN) {
        appendMsg('bot', 'That question is too long. Please keep it under ' + MAX_LEN + ' characters.');
        return;
      }
      input.value = '';
      appendMsg('user', text);
      const typing = document.createElement('div');
      typing.className = 'typing';
      typing.textContent = 'Expert is typing...';
      messages.appendChild(typing);

      try {
        const res = await fetch(API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-ciq-sid': getSessionId()
          },
          body: JSON.stringify({ message: text, turnstile: turnstileToken || '' })
        });
        const data = await res.json().catch(() => ({}));
        typing.remove();

        if (data.reply) {
          appendMsg('bot', data.reply);
        } else if (data.error === 'rate_limited') {
          appendMsg('bot', 'You have sent quite a few messages. Please wait a minute and try again.');
        } else if (data.error === 'captcha_failed') {
          turnstileToken = null;
          renderTurnstile();
          appendMsg('bot', 'The security check did not complete. Please try again in a moment.');
        } else {
          appendMsg('bot', 'Sorry, I couldn’t process that. Please try again.');
        }
      } catch (e) {
        typing.remove();
        appendMsg('bot', 'Connection issue. Please try again.');
      }
    }

    function appendMsg(role, text) {
      const div = document.createElement('div');
      div.className = `msg ${role}`;
      div.textContent = text;
      messages.appendChild(div);
      messages.scrollTop = messages.scrollHeight;
    }

    send.addEventListener('click', sendMessage);
    input.addEventListener('keydown', e => { if (e.key === 'Enter') sendMessage(); });
  }

  function init() {
    if (document.getElementById(WIDGET_ID)) return;
    getSessionId();
    injectStyles();
    injectHTML();
    bindEvents();
    loadTurnstile();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
