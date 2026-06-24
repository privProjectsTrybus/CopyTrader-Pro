// Bot: copy trading execution via Binance + Bybit APIs
import crypto from 'crypto';

// In-memory state (persists across warm serverless instances)
if (!global._botState) {
  global._botState = {
    copiedTraders: {},
    openPositions: {},
    tradeLog: [],
    settings: {
      copyMode: 'proportional',
      maxTradeSize: 500,
      autoStopLoss: 0.02,
      copyCloses: true,
      pauseOnDrawdown: 0.05,
      assetFilter: 'all',
    },
    running: true,
    eventQueue: [],
  };
}
const state = global._botState;

function pushEvent(type, data) {
  state.eventQueue.unshift({ type, data, ts: Date.now() });
  if (state.eventQueue.length > 200) state.eventQueue = state.eventQueue.slice(0, 200);
}

// ── Binance order execution ──────────────────────────────────────────────────
function binanceSign(secret, params) {
  const qs = new URLSearchParams(params).toString();
  const sig = crypto.createHmac('sha256', secret).update(qs).digest('hex');
  return `${qs}&signature=${sig}`;
}

async function placeBinanceOrder({ symbol, side, quantity }) {
  const key = process.env.BINANCE_API_KEY;
  const secret = process.env.BINANCE_API_SECRET;
  if (!key || !secret) throw new Error('Binance API keys not set');

  const params = { symbol, side: side === 'long' ? 'BUY' : 'SELL', type: 'MARKET', quantity: parseFloat(quantity).toFixed(6), timestamp: Date.now(), recvWindow: 5000 };
  const qs = binanceSign(secret, params);
  const r = await fetch(`https://api.binance.com/api/v3/order?${qs}`, {
    method: 'POST', headers: { 'X-MBX-APIKEY': key },
    signal: AbortSignal.timeout(8000),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.msg || 'Binance order failed');
  return data;
}

// ── Bybit order execution ────────────────────────────────────────────────────
async function placeBybitOrder({ symbol, side, quantity }) {
  const key = process.env.BYBIT_API_KEY;
  const secret = process.env.BYBIT_API_SECRET;
  if (!key || !secret) throw new Error('Bybit API keys not set');

  const timestamp = Date.now().toString();
  const body = JSON.stringify({ category: 'spot', symbol, side: side === 'long' ? 'Buy' : 'Sell', orderType: 'Market', qty: parseFloat(quantity).toFixed(6) });
  const toSign = timestamp + key + '5000' + body;
  const sig = crypto.createHmac('sha256', secret).update(toSign).digest('hex');

  const r = await fetch('https://api.bybit.com/v5/order/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-BAPI-API-KEY': key, 'X-BAPI-SIGN': sig, 'X-BAPI-TIMESTAMP': timestamp, 'X-BAPI-RECV-WINDOW': '5000' },
    body,
    signal: AbortSignal.timeout(8000),
  });
  const data = await r.json();
  if (data.retCode !== 0) throw new Error(data.retMsg || 'Bybit order failed');
  return data;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const action = req.query.action;

  // ── GET status ──
  if (req.method === 'GET' && action === 'status') {
    const hasKeys = !!(process.env.BINANCE_API_KEY || process.env.BYBIT_API_KEY);
    return res.json({
      running: state.running,
      demoMode: !hasKeys,
      copiedTraders: Object.values(state.copiedTraders),
      openPositions: Object.values(state.openPositions),
      tradeLog: state.tradeLog.slice(0, 50),
      settings: state.settings,
    });
  }

  // ── GET events (polling feed) ──
  if (req.method === 'GET' && action === 'events') {
    const since = parseInt(req.query.since || 0);
    return res.json({ events: state.eventQueue.filter(e => e.ts > since), ts: Date.now() });
  }

  // ── POST copy trader ──
  if (req.method === 'POST' && action === 'copy') {
    const { trader } = req.body;
    if (!trader?.id) return res.status(400).json({ error: 'trader.id required' });
    state.copiedTraders[trader.id] = { ...trader, addedAt: Date.now(), trades: 0 };
    pushEvent('trader_added', trader);
    return res.json({ success: true, message: `Now copying ${trader.name}` });
  }

  // ── DELETE stop copying ──
  if (req.method === 'DELETE' && action === 'copy') {
    const { traderId } = req.query;
    delete state.copiedTraders[traderId];
    pushEvent('trader_removed', { id: traderId });
    return res.json({ success: true });
  }

  // ── PUT settings ──
  if (req.method === 'PUT' && action === 'settings') {
    state.settings = { ...state.settings, ...req.body };
    return res.json({ success: true, settings: state.settings });
  }

  // ── POST execute trade (called when a copied trader opens/closes) ──
  if (req.method === 'POST' && action === 'execute') {
    const { traderId, traderName, symbol, side, action: tradeAction, price, quantity, exchange = 'binance' } = req.body;
    if (!symbol || !side || !tradeAction) return res.status(400).json({ error: 'symbol, side, action required' });

    const maxQty = state.settings.maxTradeSize / price;
    const qty = state.settings.copyMode === 'fixed' ? maxQty : Math.min(quantity * 0.1, maxQty);

    if (tradeAction === 'open') {
      let orderId = null;
      let executedPrice = price;
      let orderError = null;

      try {
        const order = exchange === 'bybit'
          ? await placeBybitOrder({ symbol, side, quantity: qty })
          : await placeBinanceOrder({ symbol, side, quantity: qty });
        orderId = order.orderId || order.result?.orderId;
        executedPrice = parseFloat(order.fills?.[0]?.price || order.result?.avgPrice || price);
      } catch (e) {
        orderError = e.message;
      }

      const posId = `${traderId}_${symbol}_${Date.now()}`;
      const position = { id: posId, traderId, traderName, symbol, side, entryPrice: executedPrice, size: qty, sizeUsd: qty * executedPrice, openedAt: Date.now(), status: orderError ? 'error' : 'open', pnl: 0, exchange, orderId, error: orderError };
      state.openPositions[posId] = position;
      state.tradeLog.unshift({ ...position, type: 'open' });
      if (state.tradeLog.length > 200) state.tradeLog = state.tradeLog.slice(0, 200);

      pushEvent(orderError ? 'trade_error' : 'trade_opened', { ...position, message: orderError ? `Failed: ${orderError}` : `${traderName} opened ${symbol} ${side.toUpperCase()} @ $${executedPrice.toLocaleString()}` });
      return res.json({ success: !orderError, position, error: orderError });
    }

    if (tradeAction === 'close') {
      // Find matching open position
      const pos = Object.values(state.openPositions).find(p => p.traderId === traderId && p.symbol === symbol && p.status === 'open');
      if (!pos) return res.json({ success: false, error: 'No open position found' });

      let orderError = null;
      try {
        const closeSide = pos.side === 'long' ? 'short' : 'long';
        exchange === 'bybit'
          ? await placeBybitOrder({ symbol, side: closeSide, quantity: pos.size })
          : await placeBinanceOrder({ symbol, side: closeSide, quantity: pos.size });
      } catch (e) { orderError = e.message; }

      const pnlPct = pos.side === 'long'
        ? (price - pos.entryPrice) / pos.entryPrice * 100
        : (pos.entryPrice - price) / pos.entryPrice * 100;

      pos.pnl = pnlPct;
      pos.exitPrice = price;
      pos.closedAt = Date.now();
      pos.status = orderError ? 'error' : 'closed';
      delete state.openPositions[pos.id];
      state.tradeLog.unshift({ ...pos, type: 'close' });

      pushEvent('trade_closed', { ...pos, message: `${traderName} closed ${symbol} ${pnlPct >= 0 ? '+' : ''}${pnlPct.toFixed(1)}%` });
      return res.json({ success: !orderError, position: pos, error: orderError });
    }
  }

  // ── POST webhook signal (TradingView / 3Commas) ──
  if (req.method === 'POST' && action === 'signal') {
    const { symbol, side, action: tradeAction, price, quantity, source = 'webhook' } = req.body;
    if (!symbol || !side || !tradeAction) return res.status(400).json({ error: 'symbol, side, action required' });
    // Re-use execute logic
    req.body = { traderId: 'webhook', traderName: source, symbol, side, action: tradeAction, price: parseFloat(price), quantity: parseFloat(quantity), exchange: 'binance' };
    req.query.action = 'execute';
    return handler(req, res);
  }

  res.status(404).json({ error: 'Unknown action. Use: status, events, copy, settings, execute, signal' });
}
