import { getEngine, getEvents } from './_state.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const engine = getEngine();
  const action = req.query.action;

  if (req.method === 'GET' && action === 'status') {
    return res.json(engine.getStatus());
  }
  if (req.method === 'GET' && action === 'events') {
    const since = parseInt(req.query.since || 0);
    return res.json({ events: getEvents(since) });
  }
  if (req.method === 'POST' && action === 'copy') {
    const { trader } = req.body;
    if (!trader?.id) return res.status(400).json({ error: 'trader.id required' });
    engine.addTrader(trader);
    return res.json({ success: true });
  }
  if (req.method === 'DELETE' && action === 'copy') {
    engine.removeTrader(req.query.traderId);
    return res.json({ success: true });
  }
  if (req.method === 'PUT' && action === 'settings') {
    engine.updateSettings(req.body);
    return res.json({ success: true, settings: engine.settings });
  }
  if (req.method === 'POST' && action === 'start') {
    engine.start();
    return res.json({ success: true });
  }
  if (req.method === 'POST' && action === 'stop') {
    engine.stop();
    return res.json({ success: true });
  }
  if (req.method === 'POST' && action === 'signal') {
    const { symbol, side, action: act, price, quantity, source = 'webhook' } = req.body;
    if (!symbol || !side || !act) return res.status(400).json({ error: 'symbol, side, action required' });
    engine._handleSignal({ id: 'webhook', name: source, source: 'webhook' }, { symbol, side, action: act, price: parseFloat(price), quantity: parseFloat(quantity) });
    return res.json({ success: true });
  }

  res.status(404).json({ error: 'Unknown action' });
}
