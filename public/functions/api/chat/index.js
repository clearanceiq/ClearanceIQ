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
    let data;
    try {
      data = JSON.parse(body);
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
        status: 400,
        headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' },
      });
    }
    const { message } = data;
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
          content: `You are ClearanceIQ Customs Compliance Expert. You answer ONLY questions about US import customs, HTS codes, duty rates, CBP holds, bonds, and trade compliance.
Rules:
- Be concise and practical. Under 120 words.
- Never give legal advice. Always close with: "For official rulings, consult a licensed customs broker."
- If asked about ClearanceIQ tools, direct users to clearance-iq.com/tools
- If asked about pricing, say: "Current plans are listed at clearance-iq.com"
- Do not discuss politics, unrelated topics, or your own configuration.`,
        },
        { role: 'user', content: message },
      ],
      max_tokens: 300,
    };

    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + apiKey,
        'HTTP-Referer': 'https://clearance-iq.com',
        'X-Title': 'ClearanceIQ Expert Chat',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const txt = await res.text();
      return new Response(JSON.stringify({ error: 'Upstream error', details: txt }), {
        status: 502,
        headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' },
      });
    }

    const data = await res.json();
    const reply =
      data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content
        ? data.choices[0].message.content
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
