import express from 'express';
import { botEngine } from '../server.js';

export const botRouter = express.Router();

// GET /api/bot/status
botRouter.get('/status', (req, res) => {
  res.json(botEngine.getStatus());
});

// POST /api/bot/copy - start copying a trader
botRouter.post('/copy', (req, res) => {
  const { trader } = req.body;
  if (!trader?.id) return res.status(400).json({ error: 'trader.id required' });
  botEngine.addTrader(trader);
  res.json({ success: true, message: `Now copying ${trader.name}` });
});

// DELETE /api/bot/copy/:traderId - stop copying
botRouter.delete('/copy/:traderId', (req, res) => {
  botEngine.removeTrader(req.params.traderId);
  res.json({ success: true });
});

// PUT /api/bot/settings - update bot config
botRouter.put('/settings', (req, res) => {
  botEngine.updateSettings(req.body);
  res.json({ success: true, settings: botEngine.settings });
});

// POST /api/bot/signal - receive external signals (3Commas webhook, TradingView alerts, etc.)
botRouter.post('/signal', (req, res) => {
  const { symbol, side, action, price, quantity, source = 'webhook' } = req.body;
  if (!symbol || !side || !action) {
    return res.status(400).json({ error: 'symbol, side, action required' });
  }
  // Inject as a manual signal from a virtual "webhook" trader
  const webhookTrader = {
    id: 'webhook',
    name: source,
    source: 'webhook',
  };
  botEngine._handleSignal(webhookTrader, { symbol, side, action, price: parseFloat(price), quantity: parseFloat(quantity) });
  res.json({ success: true });
});

// POST /api/bot/stop - pause all bots
botRouter.post('/stop', (req, res) => {
  botEngine.stop();
  res.json({ success: true, message: 'Bot engine stopped' });
});

// POST /api/bot/start - resume
botRouter.post('/start', (req, res) => {
  botEngine.start();
  res.json({ success: true, message: 'Bot engine started' });
});
