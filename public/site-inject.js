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

  var sessionKey = 'ciq_telemetry_session';
  var sessionId = '';
  try {
    sessionId = sessionStorage.getItem(sessionKey);
    if (!sessionId) {
      sessionId = 's_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
      sessionStorage.setItem(sessionKey, sessionId);
    }
  } catch(e) {}

  function logEvent(payload) {
    if (!navigator.sendBeacon) return;
    try {
      var base = typeof payload === 'object' && payload !== null ? Object.assign({}, payload) : {};
      base.ts = Date.now();
      base.path = base.path || location.pathname;
      base.sessionToken = sessionId;
      if (base.type === 'pageview' || base.type === 'nav') {
        base.loc = location.href;
        base.ref = document.referrer || '';
      }
      base.tool = ['bond-estimator','cbp-hold-decoder','compliance-checklist','duty-calculator','hts-lookup','supplier-checklist']
        .find(function(t){ return location.pathname.indexOf(t) !== -1; });
      navigator.sendBeacon('/api/telemetry', JSON.stringify(base));
    } catch (e) { /* noop */ }
  }

  window.CIQ = window.CIQ || {};
  window.CIQ.logEvent = logEvent;
  window.CIQ.resumeSession = function () { try { sessionStorage.setItem(sessionKey, sessionId); } catch(e) {} };

  try { sessionStorage.setItem('ciq_telem_v', '1'); } catch (e) {}

  // Expose email for inline training-data hooks
  try {
    var storedEmail = localStorage.getItem('ciq_email');
    if (storedEmail) window.__CIQ_EMAIL__ = storedEmail;
  } catch { }

  // Auto-update usage badge from API key if present
  function updateUsageBadge() {
    var apiKey = localStorage.getItem('ciq_api_key');
    var badge = document.getElementById('usageBadge');
    var counters = document.getElementById('usageCounters');
    if (!apiKey || !badge) return;

    fetch('/api/usage', {
      headers: { 'X-API-Key': apiKey },
      credentials: 'same-origin'
    })
    .then(function(res){ return res.json(); })
    .then(function(data){
      if (!data || !data.ok) return;
      var remaining = Math.max(0, (data.limit || 100) - (data.used || 0));
      var tier = data.tier === 'free' ? 'Free' : (data.tier || 'Free');
      badge.innerHTML = 'Usage: <strong>' + remaining + ' left</strong> · ' + tier;
      if (counters) {
        counters.style.display = 'grid';
        var used = document.getElementById('usedCount');
        var rem = document.getElementById('remainingCount');
        var tierEl = document.getElementById('tierLabel');
        if (used) used.textContent = data.used || 0;
        if (rem) rem.textContent = remaining;
        if (tierEl) tierEl.textContent = tier;
      }
    })
    .catch(function(){ /* noop */ });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', updateUsageBadge);
  } else {
    updateUsageBadge();
  }
})();

// Hero signup: auto-issue key + training capture
(function () {
  var form = document.getElementById('heroSignup');
  var status = document.getElementById('signupStatus');
  if (!form) return;

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (status) status.textContent = 'Issuing key…';
    var fd = new FormData(form);
    var email = String(fd.get('email') || '').trim();
    if (!email) { if (status) status.textContent = 'Email required.'; return; }

    fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: email }),
      credentials: 'same-origin'
    })
    .then(function (res) { return res.json(); })
    .then(function (data) {
      if (data && data.key) {
        try { localStorage.setItem('ciq_api_key', data.key); } catch {}
        try { localStorage.setItem('ciq_email', email); } catch {}
        if (window.__CIQ_EMAIL__) window.__CIQ_EMAIL__ = email;
        if (status) status.textContent = 'Key issued. Your limit: ' + (data.tier === 'free' ? '100/day' : 'unlimited') + '.';
        if (window.CIQ && typeof window.CIQ.logEvent === 'function') {
          window.CIQ.logEvent({ type: 'signup', email: email, tier: data.tier || 'free' });
        }
      } else {
        if (status) status.textContent = (data && data.message) ? data.message : 'Signup failed. Try again.';
      }
    })
    .catch(function () {
      if (status) status.textContent = 'Network error. Try again.';
    });
  });
})();

// --- Conversion telemetry: affiliate click + kit view (added for marketing plan) ---
(function () {
  if (window.__CIQ_CONV_INIT__) return;
  window.__CIQ_CONV_INIT__ = true;

  var HELIUM = 'https://i.helium10.com/c/7475003/3054775/37271';
  var log = function (p) { if (window.CIQ && window.CIQ.logEvent) window.CIQ.logEvent(p); };

  // Kit view on kit page load
  if (/kit/i.test(location.pathname)) log({ type: 'kit_view' });

  // Affiliate card on tool result pages
  var toolHits = ['hts-lookup','duty-calculator','cbp-hold-decoder','product-lookup','bond-estimator','supplier-checklist'];
  var onTool = toolHits.some(function (t) { return location.pathname.indexOf('/tools/' + t) !== -1; });
  function buildCard() {
    var box = document.createElement('div');
    box.id = 'ciq-aff-card';
    box.style.cssText = 'margin:18px 0;padding:14px 16px;border:1px solid rgba(148,163,184,.35);border-radius:12px;background:rgba(15,23,42,.25)';
    box.innerHTML = '<strong style="display:block;margin-bottom:6px">Sourcing from Alibaba / 1688?</strong>'
      + '<span style="display:block;margin-bottom:10px;color:var(--muted);font-size:14px">Helium 10 helps you find winning products and verify suppliers before you order.</span>'
      + '<a href="' + HELIUM + '" target="_blank" rel="sponsored noopener" class="ciq-aff-link" '
      + 'style="display:inline-block;padding:9px 14px;border-radius:8px;background:#3b82f6;color:#fff;text-decoration:none;font-weight:600">Try Helium 10 free</a>';
    var link = box.querySelector('.ciq-aff-link');
    link.addEventListener('click', function () { log({ type: 'affiliate_click', target: 'helium10' }); });
    return box;
  }
  function placeCard() {
    if (!onTool || document.getElementById('ciq-aff-card')) return;
    var host = document.querySelector('#result_body, #result, .result, main .container, main') || document.body;
    if (host) { host.appendChild(buildCard()); }
  }
  if (onTool) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function(){ setTimeout(placeCard, 500); });
    else setTimeout(placeCard, 500);
    var mo = new MutationObserver(placeCard);
    if (document.body) mo.observe(document.body, { childList: true, subtree: true });
    setTimeout(function(){ mo.disconnect(); }, 9000);
  }

  // Kit checkout click tracking
  document.addEventListener('click', function (e) {
    var el = e.target.closest && e.target.closest('a,button');
    if (!el) return;
    var sig = ((el.getAttribute('href') || '') + ' ' + (el.textContent || '') + ' ' + (el.getAttribute('data-stripe') || '')).toLowerCase();
    if (/checkout|stripe|import.{0,3}kit|buy.{0,3}now|\/api\/checkout/.test(sig)) {
      log({ type: 'kit_view', action: 'checkout_click' });
    }
  }, true);
})();
