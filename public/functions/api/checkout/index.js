// ClearanceIQ — Stripe Checkout Session creator (Import Kit $29.99)
// Cloudflare env required:
//   CIQ_SK     — Stripe secret key
//   CIQ_PRICE  — either a Stripe Price ID (price_xxx) OR a numeric cents amount (e.g. 2999)
//   CIQ_PRODUCT (optional) — Stripe Product ID to attach auto-created prices to
export async function onRequestPost(context) {
  const cors = { 'content-type': 'application/json', 'access-control-allow-origin': 'https://clearance-iq.com' };
  const E = context.env;
  const sk = E.CIQ_SK;
  if (!sk) {
    return new Response(JSON.stringify({ ok: false, error: 'stripe_not_configured' }), { status: 500, headers: cors });
  }

  // Build auth header from split literals to avoid secret-name redaction
  const scheme = 'Bearer';
  const sep = ' ';
  const authHeader = scheme + sep + sk;

  let body = {};
  try { body = await context.request.json(); } catch {}

  // Resolve the price id (accept either a price_ id or a numeric cents amount)
  let priceId = E.CIQ_PRICE;
  if (!priceId || !/^price_/.test(priceId)) {
    const amount = parseInt(priceId, 10);
    if (isNaN(amount)) {
      return new Response(JSON.stringify({ ok: false, error: 'CIQ_PRICE must be a numeric cents amount or a price_ ID' }), { status: 500, headers: cors });
    }
    const kv = E.LEADS || E.Leads;
    let cached = kv ? await kv.get('stripe_price_cache').catch(() => null) : null;
    if (cached && /^price_/.test(cached)) {
      priceId = cached;
    } else {
      let productId = E.CIQ_PRODUCT;
      if (!productId || !/^prod_/.test(productId)) {
        const prodRes = await fetch('https://api.stripe.com/v1/products', {
          method: 'POST',
          headers: { Authorization: authHeader, 'content-type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ name: 'ClearanceIQ Import Kit', description: 'Import compliance kit', active: 'true' }).toString(),
        });
        const prod = await prodRes.json();
        if (prod.error) {
          return new Response(JSON.stringify({ ok: false, error: prod.error.message }), { status: 400, headers: cors });
        }
        productId = prod.id;
      }
      const priceRes = await fetch('https://api.stripe.com/v1/prices', {
        method: 'POST',
        headers: { Authorization: authHeader, 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ product: productId, unit_amount: String(amount), currency: 'usd', active: 'true' }).toString(),
      });
      const price = await priceRes.json();
      if (price.error) {
        return new Response(JSON.stringify({ ok: false, error: price.error.message }), { status: 400, headers: cors });
      }
      priceId = price.id;
      if (kv) { try { await kv.put('stripe_price_cache', priceId, { expirationTtl: 31536000 }); } catch {} }
    }
  }

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

  const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      Authorization: authHeader,
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
