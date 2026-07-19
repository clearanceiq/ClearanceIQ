// Cloudflare Email Worker: capture inbound mail to team@clearance-iq.com into KV,
// then forward to the owner's Gmail so nothing is lost.
// Hermes reads the KV inbox to draft replies; owner can also reply from Gmail.

export default {
  async email(message, env, ctx) {
    const raw = await streamToText(message.raw);

    const record = {
      from: message.from,
      to: message.to,
      subject: message.headers.get("subject") || "(no subject)",
      date: new Date().toISOString(),
      text: raw,
      raw: raw,
    };

    // Store in KV inbox (keyed by timestamp + from)
    const key = "in::" + Date.now() + "::" + (message.from || "unknown");
    ctx.waitUntil(env.INBOX.put(key, JSON.stringify(record)));

    // Also keep an index of unread message keys
    ctx.waitUntil((async () => {
      const idxRaw = await env.INBOX.get("index");
      let idx = [];
      if (idxRaw) { try { idx = JSON.parse(idxRaw); } catch {} }
      idx.unshift({ key, from: message.from, subject: record.subject, date: record.date, replied: false });
      idx = idx.slice(0, 200);
      await env.INBOX.put("index", JSON.stringify(idx));
    })());

    // Forward to owner's Gmail (backup + real sending)
    await message.forward("a.najmiayub@gmail.com", {
      headers: { "X-Captured-By": "clearanceiq-inbox" },
    });
  },
};

async function streamToText(stream) {
  const chunks = [];
  const reader = stream.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  return new TextDecoder().decode(concat(chunks));
}
function concat(chunks) {
  const len = chunks.reduce((a, c) => a + c.length, 0);
  const out = new Uint8Array(len);
  let off = 0;
  for (const c of chunks) { out.set(c, off); off += c.length; }
  return out;
}
