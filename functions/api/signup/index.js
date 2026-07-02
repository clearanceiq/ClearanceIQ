export default async function onRequestGet(context) {
  const email = context.request.query.get('email');
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return new Response(JSON.stringify({ ok: false, error: 'valid_email_required' }), {
      status: 400,
      headers: {
        'content-type': 'application/json',
        'access-control-allow-origin': '*'
      }
    });
  }

  // Accept any valid email for now.
  // You can add email forwarding / provider webhook / D1 / KV later.
  return new Response(JSON.stringify({ ok: true }), {
    headers: {
      'content-type': 'application/json',
      'access-control-allow-origin': '*'
    }
  });
}
