// ClearanceIQ — Stripe Checkout Session creator (Import Kit $29.99)
// Cloudflare env required: CIQ_SK (Stripe secret key), CIQ_PRICE (Price ID)
export async function onRequestPost(context) {
  const cors = { 'content-type': 'application/json', 'access-control-allow-origin': 'https://clearance-iq.com' };
  const E = context.env;
  const sk = E.CIQ_SK;
  const priceId = E.CIQ_PRICE;
  if (!sk || !priceId) {
    return new Response(JSON.stringify({ ok: false, error: 'stripe_not_configured' }), { status: 500, headers: cors });
  }

  let body = {};
  try { body = await context.request.json(); } catch {}

  const origin = new URL(context.request.url).origin;
  const params = new URLSearchParams({
    mode: 'payment',
    'line_items[0][price]': priceId,
    'line_items[0][quantity]': '1',
    success_url: origin + '/thanks.html?session_id={CHECKOUT_SESSION_ID}',
    cancel_url: origin + '/import-kit.html',
    'metadata[product]': 'import-kit',
  });
  if (body.email) params.set('customer_email', String(body.email).slice(0, 200));

  const authScheme = 'Bearer';
  const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      Authorization: authScheme + ' ' + sk,
      'content-type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });
  const session = await res.json();
  if (session.error) {
    return new Response(JSON.stringify({ ok: false, error: session.error.message }), { status: 400, headers: cors });
  }

  const kv = E.LEADS || E.Leads;
  if (kv) {
    try {
      await kv.put('order_' + session.id, JSON.stringify({ paid: false, id: session.id, createdAt: new Date().toISOString() }), { expirationTtl: 2592000 });
    } catch {}
  }

  return new Response(JSON.stringify({ ok: true, url: session.url }), { headers: cors });
}

export const OPTIONS = async () => new Response(null, {
  headers: { 'access-control-allow-origin': 'https://clearance-iq.com', 'access-control-allow-methods': 'POST, OPTIONS', 'access-control-allow-headers': 'content-type' },
  status: 204,
});
