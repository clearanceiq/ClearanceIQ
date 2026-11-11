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

const SYSTEM_PROMPT = [
  'You are the ClearanceIQ assistant for U.S. import compliance.',
  'Help with CBP holds, entry summaries, duty calculation, HTS classification,',
  'supplier paperwork, single-entry and continuous bonds, and ISF filings.',
  'Be precise, name the specific form or bond type where relevant, and keep answers under 200 words.',
  'You are not a lawyer and this is not legal advice.',
  'If a question is outside U.S. import compliance, say so briefly and offer what you can help with.',
].join(' ');

const MODEL = 'anthropic/claude-haiku-5.5';

export async function onRequestPost(context) {
  const json = (obj, status) =>
    new Response(JSON.stringify(obj), {
      status,
      headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' },
    });

  // request.json() is reliable here; request.text() returns an empty body on Pages.
  let body = {};
  try {
    body = await context.request.json();
  } catch {
    body = {};
  }
  const message = (body && typeof body.message === 'string' ? body.message : '').trim();
  if (!message) return json({ error: 'Missing message' }, 400);

  const apiKey = context.env && context.env.OPENROUTER_API_KEY;
  if (!apiKey) return json({ error: 'API key not configured' }, 500);

  let reply = 'No response from expert.';
  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + apiKey,
        'HTTP-Referer': 'https://clearance-iq.com',
        'X-Title': 'ClearanceIQ Expert Chat',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: message },
        ],
        max_tokens: 300,
      }),
    });
    const data = await res.json().catch(() => null);
    const content = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
    if (content) reply = String(content).trim();
    else if (data && data.error) reply = 'Provider error: ' + String(data.error.message || data.error).slice(0, 120);
  } catch {
    reply = 'Connection issue. Please try again.';
  }

  return json({ reply }, 200);
}

export default { onRequestPost, onRequestOptions };
