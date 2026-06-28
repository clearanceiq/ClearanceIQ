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

async function parseBody(req) {
  try {
    const text = await req.text();
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export async function onRequestPost(request) {
  const parsed = await parseBody(request);
  const message = parsed && typeof parsed.message === 'string' ? parsed.message.trim() : '';

  if (!message) {
    return new Response(JSON.stringify({ error: 'Missing message' }), {
      status: 400,
      headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' },
    });
  }

  const apiKey = OPENROUTER_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'API key not configured' }), {
      status: 500,
      headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' },
    });
  }

  const payload = {
    model: 'anthropic/claude-3-haiku-20240307',
    messages: [
      {
        role: 'user',
        content: message,
      },
    ],
    max_tokens: 300,
  };

  let res;
  try {
    res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + apiKey,
        'HTTP-Referer': 'https://clearance-iq.com',
        'X-Title': 'ClearanceIQ Expert Chat',
      },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Upstream network error', details: String(e) }), {
      status: 502,
      headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' },
    });
  }

  let chatData;
  try {
    chatData = await res.json();
  } catch (e) {
    const textBody = await res.text();
    return new Response(JSON.stringify({ error: 'Upstream error', details: String(textBody || e.message) }), {
      status: 502,
      headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' },
    });
  }

  const reply =
    chatData.choices && Array.isArray(chatData.choices) && chatData.choices[0]?.message?.content
      ? String(chatData.choices[0].message.content)
      : 'No response from expert.';

  return new Response(JSON.stringify({ reply }), {
    headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' },
  });
}

export default { onRequestPost, onRequestOptions };
