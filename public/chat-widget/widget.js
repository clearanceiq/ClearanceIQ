/* ClearanceIQ — Customs Compliance Expert Chat Widget */

(function() {
  const WIDGET_ID = 'ciq-chat-widget';
  const API_URL = '/api/chat';

  function init() {
    if (document.getElementById(WIDGET_ID)) return;
    injectStyles();
    injectHTML();
    bindEvents();
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
          <span>ClearanceIQ Customs Expert</span>
          <button class="close">✕</button>
        </div>
        <div class="messages">
          <div class="msg bot">Hi! Ask me anything about US imports, HTS codes, duties, CBP holds, or bonds. What do you need help with?</div>
        </div>
        <div class="composer">
          <input type="text" placeholder="Type your question...">
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

    launcher.addEventListener('click', () => win.classList.toggle('open'));
    close.addEventListener('click', () => win.classList.remove('open'));

    async function sendMessage() {
      const text = input.value.trim();
      if (!text) return;
      input.value = '';
      appendMsg('user', text);
      const typing = document.createElement('div');
      typing.className = 'typing';
      typing.textContent = 'Expert is typing...';
      messages.appendChild(typing);

      try {
        const res = await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: text })
        });
        const data = await res.json();
        typing.remove();
        if (data.reply) {
          if (data.reply === 'No response from expert.' || data.reply === 'Connection issue. Please try again.' || (typeof data.reply === 'string' && data.reply.startsWith && data.reply.startsWith('Provider error:'))) {
            appendMsg('bot', data.reply);
          } else {
            appendMsg('bot', data.reply);
          }
        } else if (data.error) {
          appendMsg('bot', 'Error: ' + String(data.error));
        } else {
          appendMsg('bot', 'Sorry, I couldn’t process that. Try again.');
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

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
