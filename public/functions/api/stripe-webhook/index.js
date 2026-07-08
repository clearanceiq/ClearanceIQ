// ClearanceIQ — Stripe webhook: marks orders paid in LEADS KV
// Cloudflare env: CIQ_WH (Stripe webhook signing secret)
async function hmacHex(key, msg) {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey('raw', enc.encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, enc.encode(msg));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function onRequestPost(context) {
  const whSecret = context.env.CIQ_WH;
  const sigHeader = context.request.headers.get('stripe-signature') || '';
  const payload = await context.request.text();

  if (whSecret) {
    const elements = sigHeader.split(',').reduce((acc, p) => {
      const idx = p.indexOf('=');
      if (idx > -1) acc[p.slice(0, idx)] = p.slice(idx + 1);
      return acc;
    }, {});
    const expected = await hmacHex(whSecret, payload);
    if (!elements.v1 || elements.v1 !== expected) {
      return new Response(JSON.stringify({ error: 'invalid signature' }), { status: 400, headers: { 'content-type': 'application/json' } });
    }
  }

  let event;
  try { event = JSON.parse(payload); } catch { return new Response(JSON.stringify({ error: 'bad json' }), { status: 400 }); }

  if (event.type === 'checkout.session.completed') {
    const obj = event.data.object;
    const kv = context.env.LEADS || context.env.Leads;
    if (kv) {
      try {
        await kv.put('order_' + obj.id, JSON.stringify({
          paid: true,
          id: obj.id,
          email: obj.customer_email || (obj.customer && obj.customer.email) || null,
          amount: obj.amount_total,
          currency: obj.currency,
          paidAt: new Date().toISOString(),
        }), { expirationTtl: 31536000 });
      } catch {}
    }
  }

  return new Response(JSON.stringify({ received: true }), { headers: { 'content-type': 'application/json' } });
}
