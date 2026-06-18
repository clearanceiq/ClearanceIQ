export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const path = url.searchParams.get("path") || "/";
  const referrer = url.searchParams.get("ref") || "";
  const event = {
    id: crypto.randomUUID(),
    ts: new Date().toISOString(),
    path,
    referrer,
    ua: context.request.headers.get("user-agent") || "",
  };

  if (context.env && context.env.ANALYTICS) {
    const key = event.ts.slice(0, 10) + "|" + event.id;
    await context.env.ANALYTICS.put(key, JSON.stringify(event));
  }

  return new Response(null, {
    status: 204,
    headers: {
      "content-type": "text/plain",
      "cache-control": "no-store",
    },
  });
}
