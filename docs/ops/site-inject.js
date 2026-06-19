(function () {
  if (window.__CIQ_TELEMETRY_INIT__) return;
  window.__CIQ_TELEMETRY_INIT__ = true;
  function logEvent(payload) {
    if (!navigator.sendBeacon) return;
    navigator.sendBeacon("/api/telemetry", JSON.stringify(Object.assign({}, payload, { ts: Date.now(), path: location.pathname })));
  }
  window.CIQ = window.CIQ || {};
  window.CIQ.logEvent = logEvent;
})();
