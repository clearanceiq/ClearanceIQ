export async function onRequestGet(context) {
  return new Response(JSON.stringify({ ok: true, service: "lead", method: "GET" }), {
    headers: { "content-type": "application/json", "access-control-allow-origin": "https://clearanceiq.pages.dev" },
  });
}

export async function onRequestPost(context) {
  const url = new URL(context.request.url);
  const contentType = context.request.headers.get("content-type") || "";

  let body = {};
  if (contentType.includes("application/json")) {
    body = await context.request.json().catch(() => ({}));
  } else {
    const form = await context.request.formData().catch(() => null);
    if (form) {
      body = Object.fromEntries(form.entries());
    }
  }

  const email = (body.email || "").toString().trim();
  const source = (body.source || "homepage").toString();
  const name = (body.name || "").toString().trim();
  const message = (body.message || "").toString().trim();
  const topic = (body.topic || "").toString().trim();

  if (!email || !email.includes("@")) {
    return new Response(JSON.stringify({ ok: false, error: "valid email required" }), {
      status: 400,
      headers: { "content-type": "application/json", "access-control-allow-origin": "https://clearanceiq.pages.dev" },
    });
  }

  // Simple IP-based rate limiting for lead endpoint
  const ip = (context.request.headers.get('CF-Connecting-IP') || 'unknown').replace(/[^a-zA-Z0-9:._-]/g, '_');
  const today = new Date().toISOString().slice(0, 10);
  const rateKey = `lead_rate::${today}::${ip}`;
  const rateLimit = 5; // max 5 leads per day per IP

  if (context.env?.RATE_COUNTER) {
    try {
      const existing = await context.env.RATE_COUNTER.get(rateKey);
      const count = existing ? parseInt(existing, 10) : 0;
      if (count >= rateLimit) {
        return new Response(JSON.stringify({ ok: false, error: 'rate_limit', message: 'Too many submissions. Try again tomorrow.' }), {
          status: 429,
          headers: { "content-type": "application/json", "access-control-allow-origin": "https://clearanceiq.pages.dev" },
        });
      }
      await context.env.RATE_COUNTER.put(rateKey, String(count + 1), { expirationTtl: 24 * 60 * 60 });
    } catch (e) {
      // rate limiting is best-effort
    }
  }

  const lead = {
    id: crypto.randomUUID(),
    receivedAt: new Date().toISOString(),
    source,
    email,
    name: name || null,
    topic: topic || null,
    message: message || null,
    status: "captured",
  };

  if (context.env && context.env.LEADS) {
    try {
      await context.env.LEADS.put(lead.id, JSON.stringify(lead));
    } catch (e) {
      // ignore KV write failures — still return queued
    }
  }

  return new Response(JSON.stringify({ ok: true, lead, status: "captured" }), {
    headers: { "content-type": "application/json", "access-control-allow-origin": "https://clearanceiq.pages.dev" },
  });
}

export const OPTIONS = async () => new Response(null, {
  headers: {
    "access-control-allow-origin": "https://clearanceiq.pages.dev",
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-headers": "content-type",
  },
  status: 204,
});
