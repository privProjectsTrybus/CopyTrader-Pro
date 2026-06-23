import { getEvents } from './_state.js';

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  // Simple polling endpoint - client polls every 3s
  const since = parseInt(req.query.since || 0);
  res.json({ events: getEvents(since), ts: Date.now() });
}
