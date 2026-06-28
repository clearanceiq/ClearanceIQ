import os, json, re
from pathlib import Path

site = Path(r'C:\Users\Najmi\Documents\Tycoon\site')
tools = [site/'tools'/'bond-estimator.html', site/'tools'/'cbp-hold-decoder.html', site/'tools'/'duty-calculator.html',
         site/'tools'/'hts-lookup.html', site/'tools'/'supplier-checklist.html']
public_tools = [site/'public'/'tools'/'bond-estimator.html', site/'public'/'tools'/'cbp-hold-decoder.html',
                site/'public'/'tools'/'duty-calculator.html', site/'public'/'tools'/'hts-lookup.html',
                site/'public'/'tools'/'supplier-checklist.html']
compliance = [site/'tools'/'compliance-checklist.html', site/'public'/'tools'/'compliance-checklist.html', site/'tools'/'start-here.html', site/'public'/'tools'/'start-here.html']

PAGEVIEW_SCRIPT = '<script defer src="/site-inject.js"></script>\n  <script>\n    if (window.CIQ && typeof window.CIQ.resumeSession === "function") window.CIQ.resumeSession();\n    window.addEventListener("pageshow", function(){ if (window.CIQ && typeof window.CIQ.resumeSession === "function") window.CIQ.resumeSession(); });\n    window.addEventListener("load", function(){\n      try { if (window.CIQ && typeof window.CIQ.logEvent === "function") window.CIQ.logEvent({ type: "pageview" }); } catch(e){}\n    });\n  </script>\n  <div id="telemetry-retry" style="position:fixed;bottom:16px;right:16px;display:none;">\n    <button id="telemetry-retry-btn" style="border-radius:999px;background:#0f172a;color:#fff;border:1px solid #334155;padding:8px 12px;font-weight:600;">Retry telemetry</button>\n  </div>\n  <script>\n    (function(){\n      function setup(){\n        var btn = document.getElementById("telemetry-retry-btn");\n        var el = document.getElementById("telemetry-retry-retry");\n        if (btn && window.CIQ && typeof window.CIQ.logEvent === "function") {\n          btn.style.display = "inline-flex";\n          btn.addEventListener("click", function(){\n            window.CIQ.logEvent({ type: "retry", path: location.pathname });\n            el = document.getElementById("telemetry-retry");\n            if (el) el.style.display = "none";\n          });\n        }\n      }\n      if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", setup); else setup();\n    })();\n  </script>\n'

OLD_LOGEVENT = '''function logEvent(payload) {
  if (!navigator.sendBeacon) return;
  const body = JSON.stringify({ ...payload, ts: Date.now(), path: location.pathname });
  navigator.sendBeacon('/api/telemetry', body);
}
'''

NEW_LOGEVENT_BLOCK = '''function logEvent(payload){
  if (window.CIQ && typeof window.CIQ.logEvent === "function") {
    window.CIQ.logEvent(payload);
    return;
  }
  if (!navigator.sendBeacon) return;
  try {
    var base = typeof payload === "object" && payload !== null ? Object.assign({}, payload) : {};
    base.ts = Date.now();
    base.path = base.path || location.pathname;
    navigator.sendBeacon('/api/telemetry', JSON.stringify(base));
  } catch(e){}
}
'''

def instrument(path):
    p = Path(path)
    if not p.exists():
        return False
    html = p.read_text(encoding='utf-8')
    changed = False

    if '/site-inject.js' not in html:
        html = html.replace('</head>', PAGEVIEW_SCRIPT + '</head>', 1)
        changed = True

    if 'function logEvent(payload)' in html:
        html = html.replace(
            html[html.index('function logEvent(payload)'):html.index('function logEvent(payload)')+len(OLD_LOGEVENT)],
            NEW_LOGEVENT_BLOCK, 1
        )
        changed = True

    for marker, pre in [
        ('logEvent({ type: \'pageview\'', 'window.addEventListener("load", function(){\n      try { if (window.CIQ && typeof window.CIQ.logEvent === "function") window.CIQ.logEvent({ type: "pageview" }); } catch(e){}\n    });\n  </script>\n'),
        ('logEvent({ type: "pageview"', 'window.addEventListener("load", function(){\n      try { if (window.CIQ && typeof window.CIQ.logEvent === "function") window.CIQ.logEvent({ type: "pageview" }); } catch(e){}\n    });\n  </script>\n')
    ]:
        if marker in html and pre not in html:
            if '</scr' in html and 'sendBeacon' in html and 'window.CIQ && typeof window.CIQ.logEvent === "function"' not in html:
                idx = html.index('navigator.sendBeacon')
                before = html[:idx]
                after = html[idx:]
                inject = '''try { if (window.CIQ && typeof window.CIQ.logEvent === "function") window.CIQ.logEvent({ type: "pageview" }); } catch(e){}
    }
  </script>
  '''
                html = before.replace('}`)', '});\n  ' + inject, 1) + after
                changed = True

    if 'window.CIQ && typeof window.CIQ.logEvent === "function"' not in html and '</body>' in html:
        html = html.replace('</body>', '  <script>try { if (window.CIQ && typeof window.CIQ.logEvent === "function") window.CIQ.logEvent({ type: "pageview" }); } catch(e){}</script>\n</body>', 1)
        changed = True

    if changed:
        p.write_text(html, encoding='utf-8')
    return changed

count = 0
for f in tools + public_tools + compliance + [site/'public'/'chat.html']:
    if instrument(f):
        count += 1

print(f'Instrumented tool pages: {count}')
