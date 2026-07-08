;(function () {
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
  window.CIQ.logTraining = function(payload) {
    if (!navigator.sendBeacon) return;
    try {
      var base = typeof payload === 'object' && payload !== null ? Object.assign({}, payload) : {};
      base.ts = Date.now();
      base.path = base.path || location.pathname;
      base.sessionToken = sessionId;
      base.tool = base.tool || ['bond-estimator','cbp-hold-decoder','compliance-checklist','duty-calculator','hts-lookup','supplier-checklist']
        .find(function(t){ return location.pathname.indexOf(t) !== -1; });
      navigator.sendBeacon('/api/training', JSON.stringify(base));
    } catch (e) { /* noop */ }
  };
  window.CIQ.resumeSession = function () { try { sessionStorage.setItem(sessionKey, sessionId); } catch(e) {} };
  window.CIQ.isRateLimit = function (data) { return !!(data && data.error === 'rate_limit'); };
  window.CIQ.handleRateLimit = function (statusEl, data) {
    try { if (window.CIQ.refreshUsage) window.CIQ.refreshUsage(); } catch (e) {}
    if (!statusEl) return;
    var msg = (data && data.upgrade)
      ? data.upgrade
      : 'You reached your free limit of 5 lookups/day. Sign up free for 100/day.';
    statusEl.innerHTML = '⚠️ ' + msg + ' <a href="/">Sign up free →</a>';
    statusEl.style.color = '#f59e0b';
  };
  window.CIQ.refreshUsage = function () {
    try {
      var apiKey = '';
      try { apiKey = localStorage.getItem('ciq_api_key') || ''; } catch (e) {}
      var url = '/api/usage';
      var headers = {};
      if (apiKey) {
        url += '?key=' + encodeURIComponent(apiKey);
        headers['x-api-key'] = apiKey;
      }
      fetch(url, { headers: headers })
        .then(function(r){ return r.json(); })
        .then(function(data){
          var badge = document.getElementById('usageBadge');
          if (badge) {
            var strong = badge.querySelector('strong');
            if (strong) {
              var remaining = data && data.remaining != null ? data.remaining : '—';
              var tier = (data && data.authenticated && data.tier !== 'anonymous') ? (data.tier === 'pro' ? 'Member · Pro' : 'Member · 100/day') : '5/day guest';
              strong.textContent = remaining + ' left';
              var span = badge.querySelector('span');
              if (span) span.textContent = tier;
            }
          }
          var usedEl = document.getElementById('usedCount');
          var remainEl = document.getElementById('remainingCount');
          var tierEl = document.getElementById('tierLabel');
          if (data) {
            if (usedEl) usedEl.textContent = data.used != null ? data.used : '—';
            if (remainEl) remainEl.textContent = data.remaining != null ? data.remaining : '—';
            if (tierEl) tierEl.textContent = data.tier === 'signed' ? '100/day' : 'Free';
          }
        })
        .catch(function(){});
    } catch (e) {}
  };

  window.CIQ.saveHistory = function (tool, input, label, result) {
    try {
      var apiKey = localStorage.getItem('ciq_api_key');
      if (!apiKey) return; // only signed users get history
      fetch('/api/history', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-api-key': apiKey },
        body: JSON.stringify({ tool: tool, input: input || '', label: label || '', result: result || '' })
      }).catch(function(){});
    } catch (e) {}
  };

  // Anonymous over-limit gate for client-side-only tools (no API call of their own)
  window.CIQ.maybeGateTool = function () {
    try {
      var apiKey = localStorage.getItem('ciq_api_key');
      if (apiKey) return; // members are never gated
      if (!navigator.sendBeacon) return;
      fetch('/api/usage').then(function(r){ return r.json(); }).then(function(data){
        if (data && data.authenticated === false && data.remaining <= 0) {
          var gate = document.getElementById('ciqToolGate');
          if (gate) return;
          var el = document.createElement('div');
          el.id = 'ciqToolGate';
          el.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,.92);z-index:99999;display:flex;align-items:center;justify-content:center;padding:24px;font-family:inherit;';
          el.innerHTML = '<div style="max-width:420px;background:#0f172a;border:1px solid #334155;border-radius:14px;padding:28px;text-align:center;color:#e2e8f0;">'
            + '<h2 style="margin:0 0 10px;font-size:20px;">Free limit reached</h2>'
            + '<p style="margin:0 0 18px;color:#94a3b8;font-size:14px;line-height:1.5;">You have used your 5 free tool uses today. Sign up free for 100/day — no card needed.</p>'
            + '<a href="/" style="display:inline-block;background:#38bdf8;color:#06283d;font-weight:700;padding:11px 20px;border-radius:10px;text-decoration:none;">Sign up free →</a>'
            + '</div>';
          document.body.appendChild(el);
        }
      }).catch(function(){});
    } catch (e) {}
  };

  // Gate non-API tools on load
  try {
    var p = location.pathname;
    if (['cbp-hold-decoder','compliance-checklist','supplier-checklist','start-here'].some(function(t){ return p.indexOf(t) !== -1; })) {
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', window.CIQ.maybeGateTool);
      else window.CIQ.maybeGateTool();
    }
  } catch (e) {}

  try { sessionStorage.setItem('ciq_telem_v', '1'); } catch (e) {}

  // Expose email for inline training-data hooks
  try {
    var storedEmail = localStorage.getItem('ciq_email');
    if (storedEmail) window.__CIQ_EMAIL__ = storedEmail;
  } catch { }
})();
