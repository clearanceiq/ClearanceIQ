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
  try {
    const body = await request.text();
    let bodyData;
    try {
      bodyData = JSON.parse(body);
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
        status: 400,
        headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' },
      });
    }
    const { message } = bodyData;
    if (!message || typeof message !== 'string') {
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
          role: 'system',
          content: 'You are ClearanceIQ Customs Compliance Expert.',
        },
        { role: 'user', content: message },
      ],
      max_tokens: 300,
    };

    const apiRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + apiKey,
        'HTTP-Referer': 'https://clearance-iq.com',
        'X-Title': 'ClearanceIQ Expert Chat',
      },
      body: JSON.stringify(payload),
    });

    const apiResBody = await apiRes.text();
    let chatData;
    try {
      chatData = JSON.parse(apiResBody);
    } catch {
      return new Response(JSON.stringify({ error: 'Upstream error', details: apiResBody }), {
        status: 502,
        headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' },
      });
    }

    const reply =
      chatData.choices && chatData.choices[0] && chatData.choices[0].message && chatData.choices[0].message.content
        ? chatData.choices[0].message.content
        : 'No response from expert.';

    return new Response(JSON.stringify({ reply }), {
      headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' },
    });
  }
}

export default {
  onRequestPost,
  onRequestOptions,
};
