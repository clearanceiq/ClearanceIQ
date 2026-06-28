export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'POST, OPTIONS',
      'access-control-allow-headers': 'content-type',
      'access-control-max-age': '86400',
    },
  });
}

export async function onRequestPost(request) {
  let payload = {};
  try {
    payload = await request.json();
  } catch {
    // fallback below
  }
  if (!payload || typeof payload.message !== 'string' || !payload.message.trim()) {
    return new Response(JSON.stringify({ error: 'Missing message' }), {
      status: 400,
      headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' },
    });
  }
  const message = payload.message.trim();

  const apiKey = OPENROUTER_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'API key not configured' }), {
      status: 500,
      headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' },
    });
  }

  const answer = await (async () => {
    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + apiKey,
          'HTTP-Referer': 'https://clearance-iq.com',
          'X-Title': 'ClearanceIQ Expert Chat',
        },
        body: JSON.stringify({
          model: 'anthropic/claude-3-haiku-20240307',
          messages: [
            { role: 'user', content: message }
          ],
          max_tokens: 300,
        }),
      });
      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch { data = null; }
      if (data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) {
        return data.choices[0].message.content.trim();
      }
      return 'No response from expert.';
    } catch (e) {
      return 'Connection issue. Please try again.';
    }
  })();

  return new Response(JSON.stringify({ reply: answer }), {
    headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' },
  });
}

export default { onRequestPost, onRequestOptions };
