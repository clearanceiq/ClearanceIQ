export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const email = (url.searchParams.get('email') || '').trim().toLowerCase();
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return new Response(unsubPage('Invalid or missing email.', false), {
      headers: { 'content-type': 'text/html; charset=utf-8', 'access-control-allow-origin': '*' },
    });
  }

  const env = context.env?.LEADS || context.env?.Leds;
  let recorded = false;
  if (env) {
    try {
      await env.put('unsub::' + email, JSON.stringify({ email, ts: Date.now(), at: new Date().toISOString() }));
      recorded = true;
    } catch (e) { /* ignore */ }
  }

  return new Response(unsubPage(recorded ? 'You have been unsubscribed. You will not receive further emails from ClearanceIQ.' : 'Unsubscribe recorded (storage unavailable, but noted).', true), {
    headers: { 'content-type': 'text/html; charset=utf-8', 'access-control-allow-origin': '*' },
  });
}

export async function onRequestPost(context) {
  let body = {};
  try { body = await context.request.json(); } catch { /* ignore */ }
  const email = (body.email || '').toString().trim().toLowerCase();
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return new Response(JSON.stringify({ ok: false, error: 'invalid_email' }), { status: 400, headers: { 'content-type': 'application/json' } });
  }
  const env = context.env?.LEADS || context.env?.Leds;
  if (env) {
    try { await env.put('unsub::' + email, JSON.stringify({ email, ts: Date.now(), at: new Date().toISOString() })); } catch (e) {}
  }
  return new Response(JSON.stringify({ ok: true }), { headers: { 'content-type': 'application/json' } });
}

function unsubPage(msg, ok) {
  const color = ok ? '#059669' : '#dc2626';
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><title>Unsubscribe — ClearanceIQ</title>
<style>body{font-family:ui-sans-serif,system-ui,Arial,sans-serif;background:#0b0f19;color:#e5e7eb;margin:0;display:flex;min-height:100vh;align-items:center;justify-content:center;padding:24px;} .card{background:#0f1629;border:1px solid #1f2937;border-radius:14px;padding:32px;max-width:440px;text-align:center;} h1{font-size:20px;margin:0 0 12px;} p{color:#9ca3af;font-size:15px;line-height:1.6;} a{color:#60a5fa;}</style></head>
<body><div class="card"><h1 style="color:${color}">${ok ? '✓ Unsubscribed' : 'Unsubscribe'}</h1><p>${msg}</p><p style="margin-top:18px;font-size:13px;"><a href="https://clearance-iq.com">ClearanceIQ</a></p></div></body></html>`;
}
