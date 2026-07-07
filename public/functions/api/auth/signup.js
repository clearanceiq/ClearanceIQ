export async function onRequestGet(context) {
  return new Response(null, {
    status: 302,
    headers: { Location: '/api/lead' }
  });
}

export async function onRequestPost(context) {
  return new Response(null, {
    status: 302,
    headers: { Location: '/api/lead' }
  });
}
