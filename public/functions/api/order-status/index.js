// ClearanceIQ — order status check (used by thanks.html + kit-download.html)
export async function onRequestGet(context) {
  const cors = { 'content-type': 'application/json', 'access-control-allow-origin': 'https://clearance-iq.com' };
  const sid = new URL(context.request.url).searchParams.get('session_id');
  if (!sid) return new Response(JSON.stringify({ ok: true, paid: false }), { headers: cors });

  const kv = context.env.LEADS || context.env.Leads;
  const raw = kv ? await kv.get('order_' + sid) : null;
  let order = null;
  try { order = raw ? JSON.parse(raw) : null; } catch {}
  return new Response(JSON.stringify({ ok: true, paid: !!(order && order.paid), email: order ? (order.email || null) : null }), { headers: cors });
}

export const OPTIONS = async () => new Response(null, {
  headers: { 'access-control-allow-origin': 'https://clearance-iq.com', 'access-control-allow-methods': 'GET, OPTIONS' },
  status: 204,
});
