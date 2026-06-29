export async function onRequestGet() {
  return new Response(JSON.stringify({ ok: true, route: '/api/v1/__ping' }), {
    headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' }
  });
}
