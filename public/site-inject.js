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
  window.CIQ.resumeSession = function () { try { sessionStorage.setItem(sessionKey, sessionId); } catch(e) {} };
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
              var tier = data && data.tier === 'signed' ? '100/day signed' : '5/day anonymous';
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

  try { sessionStorage.setItem('ciq_telem_v', '1'); } catch (e) {}

  // Expose email for inline training-data hooks
  try {
    var storedEmail = localStorage.getItem('ciq_email');
    if (storedEmail) window.__CIQ_EMAIL__ = storedEmail;
  } catch { }
})();
