;(function () {
  'use strict';
  if (window.__CIQ_THEME_TOGGLE_INIT__) return;
  window.__CIQ_THEME_TOGGLE_INIT__ = true;

  var STORAGE_KEY = 'ciq_theme_pref';
  var TOGGLE_ID = 'ciq-theme-toggle';

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
  }

  function getPreferredTheme() {
    try {
      var stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'light' || stored === 'dark') return stored;
    } catch { }
    return 'dark';
  }

  function persistTheme(theme) {
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch { }
  }

  function toggleTheme() {
    var next = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    applyTheme(next);
    persistTheme(next);
  }

  function injectStyles() {
    var css = [
      'html[data-theme="light"] {',
      '  --bg: #ffffff;',
      '  --surface: #f8fafc;',
      '  --muted: #475569;',
      '  --text: #0f172a;',
      '}'
    ].join('\n');

    var style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
  }

  function buildToggle() {
    if (document.getElementById(TOGGLE_ID)) return;
    var button = document.createElement('button');
    button.id = TOGGLE_ID;
    button.type = 'button';
    button.setAttribute('aria-label', 'Toggle light and dark theme');
    button.textContent = 'Theme';
    Object.assign(button.style, {
      position: 'fixed',
      top: '14px',
      right: '14px',
      zIndex: '9999',
      background: 'rgba(15, 23, 42, 0.35)',
      color: 'var(--text)',
      border: '1px solid rgba(148,163,184,0.35)',
      borderRadius: '999px',
      padding: '8px 12px',
      fontSize: '13px',
      cursor: 'pointer',
      backdropFilter: 'blur(6px)',
      WebkitBackdropFilter: 'blur(6px)',
      lineHeight: '1'
    });
    button.addEventListener('click', toggleTheme);
    document.body.appendChild(button);
  }

  function init() {
    injectStyles();
    applyTheme(getPreferredTheme());
    buildToggle();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

(function () {
  if (window.__CIQ_TELEMETRY_INIT__) return;
  window.__CIQ_TELEMETRY_INIT__ = true;
  function logEvent(payload) {
    if (!navigator.sendBeacon) return;
    navigator.sendBeacon('/api/telemetry', JSON.stringify(Object.assign({}, payload, { ts: Date.now(), path: location.pathname })));
  }
  window.CIQ = window.CIQ || {};
  window.CIQ.logEvent = logEvent;
  try {
    sessionStorage.setItem('ciq_telem_v', '1');
  } catch {}
})();
