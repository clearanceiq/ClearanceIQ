export default async (request) => {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ ok: false, error: 'POST required' }), { status: 405, headers: { 'Content-Type': 'application/json' } })
  }
  const payload = await request.json().catch(() => ({}))
  const text = [
    'New ClearanceIQ enquiry',
    `Name: ${payload?.name || ''}`,
    `Email: ${payload?.email || ''}`,
    `Topic: ${payload?.topic || ''}`,
    `Message: ${payload?.message || ''}`,
  ].join('\n')
  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID
  if (!token || !chatId) {
    return new Response(JSON.stringify({ ok: false, error: 'Missing Telegram env' }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
  const url = new URL(`https://api.telegram.org/bot${token}/sendMessage`)
  url.searchParams.set('chat_id', chatId)
  url.searchParams.set('text', text)
  const res = await fetch(url, { method: 'POST' })
  const json = await res.json().catch(() => ({}))
  return new Response(JSON.stringify(json), { status: json.ok ? 200 : 500, headers: { 'Content-Type': 'application/json' } })
}

