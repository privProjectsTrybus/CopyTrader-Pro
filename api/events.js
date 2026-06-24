export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (!global._botState) return res.json({ events: [], ts: Date.now() });
  const since = parseInt(req.query.since || 0);
  res.json({ events: global._botState.eventQueue.filter(e => e.ts > since), ts: Date.now() });
}
