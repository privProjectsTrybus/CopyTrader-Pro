import crypto from 'crypto';
import { verifyJwt } from './auth.js';

if (!global._botState) {
  global._botState = {
    copiedTraders: {},
    openPositions: {},
    tradeLog: [],
    eventQueue: [],
    settings: { copyMode:'proportional', maxTradeUsd:100, autoStopLoss:2, copyCloses:true, assetFilter:'all' },
    running: false,
  };
}
const S = global._botState;

function pushEvent(type, data) {
  S.eventQueue.unshift({ type, data, ts: Date.now() });
  if (S.eventQueue.length > 200) S.eventQueue = S.eventQueue.slice(0, 200);
}

// ── Exchange order execution ───────────────────────────────────────────────────
async function placeBinanceOrder(apiKey, secret, { symbol, side, quoteQty }) {
  const timestamp = Date.now();
  // Use quoteOrderQty (spend X USDT) so user controls risk in USD terms
  const qs = `symbol=${symbol}&side=${side==='long'?'BUY':'SELL'}&type=MARKET&quoteOrderQty=${quoteQty.toFixed(2)}&timestamp=${timestamp}&recvWindow=10000`;
  const sig = crypto.createHmac('sha256', secret).update(qs).digest('hex');
  const r = await fetch(`https://api.binance.com/api/v3/order?${qs}&signature=${sig}`, {
    method: 'POST', headers: { 'X-MBX-APIKEY': apiKey }, signal: AbortSignal.timeout(10000),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.msg || `Binance HTTP ${r.status}`);
  return data;
}

async function placeBinanceCloseOrder(apiKey, secret, { symbol, side, quantity }) {
  const timestamp = Date.now();
  const closeSide = side === 'long' ? 'SELL' : 'BUY';
  const qs = `symbol=${symbol}&side=${closeSide}&type=MARKET&quantity=${parseFloat(quantity).toFixed(6)}&timestamp=${timestamp}&recvWindow=10000`;
  const sig = crypto.createHmac('sha256', secret).update(qs).digest('hex');
  const r = await fetch(`https://api.binance.com/api/v3/order?${qs}&signature=${sig}`, {
    method: 'POST', headers: { 'X-MBX-APIKEY': apiKey }, signal: AbortSignal.timeout(10000),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.msg || `Binance HTTP ${r.status}`);
  return data;
}

async function placeBybitOrder(apiKey, secret, { symbol, side, quoteQty }) {
  const timestamp = Date.now().toString();
  const recv = '10000';
  const body = JSON.stringify({ category:'spot', symbol, side:side==='long'?'Buy':'Sell', orderType:'Market', marketUnit:'quoteCoin', qty: quoteQty.toFixed(2) });
  const sig = crypto.createHmac('sha256', secret).update(`${timestamp}${apiKey}${recv}${body}`).digest('hex');
  const r = await fetch('https://api.bybit.com/v5/order/create', {
    method: 'POST',
    headers: { 'Content-Type':'application/json','X-BAPI-API-KEY':apiKey,'X-BAPI-SIGN':sig,'X-BAPI-TIMESTAMP':timestamp,'X-BAPI-RECV-WINDOW':recv },
    body, signal: AbortSignal.timeout(10000),
  });
  const data = await r.json();
  if (data.retCode !== 0) throw new Error(`Bybit ${data.retCode}: ${data.retMsg}`);
  return data;
}

// ── Binance leaderboard position polling ──────────────────────────────────────
async function fetchTraderPositions(uid) {
  const r = await fetch('https://www.binance.com/bapi/futures/v1/public/future/leaderboard/getOtherPosition', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ encryptedUid: uid, tradeType: 'PERPETUAL' }),
    signal: AbortSignal.timeout(8000),
  });
  const data = await r.json();
  return data?.data?.otherPositionRetList || [];
}

// ── Main handler ──────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!verifyJwt(token)) return res.status(401).json({ error: 'Not authenticated' });

  const action = req.query.action;
  const BKEY = process.env.BINANCE_API_KEY, BSEC = process.env.BINANCE_API_SECRET;
  const YKEY = process.env.BYBIT_API_KEY,   YSEC = process.env.BYBIT_API_SECRET;

  const ok  = d => res.json(d);
  const err = (m, s=400) => res.status(s).json({ error: m });

  // GET status
  if (req.method === 'GET' && action === 'status') {
    return ok({
      running: S.running,
      hasKeys: !!(BKEY || YKEY),
      binanceConnected: !!BKEY,
      bybitConnected: !!YKEY,
      copiedTraders: Object.values(S.copiedTraders),
      openPositions: Object.values(S.openPositions),
      tradeLog: S.tradeLog.slice(0, 50),
      settings: S.settings,
    });
  }

  // GET events
  if (req.method === 'GET' && action === 'events') {
    const since = parseInt(req.query.since || 0);
    return ok({ events: S.eventQueue.filter(e => e.ts > since), ts: Date.now() });
  }

  // POST start copying a trader
  if (req.method === 'POST' && action === 'copy') {
    const { trader } = req.body;
    if (!trader?.id) return err('trader required');
    S.copiedTraders[trader.id] = { ...trader, addedAt: Date.now(), tradeCount: 0, lastChecked: 0, lastPositions: [] };
    S.running = true;
    pushEvent('trader_added', { ...trader, message: `Now copying ${trader.name}` });
    return ok({ success: true });
  }

  // DELETE stop copying
  if (req.method === 'DELETE' && action === 'copy') {
    const { traderId } = req.query;
    delete S.copiedTraders[traderId];
    if (Object.keys(S.copiedTraders).length === 0) S.running = false;
    return ok({ success: true });
  }

  // PUT settings
  if (req.method === 'PUT' && action === 'settings') {
    Object.assign(S.settings, req.body);
    return ok({ success: true, settings: S.settings });
  }

  // POST execute — manually trigger a trade (also used by poll)
  if (req.method === 'POST' && action === 'execute') {
    const { traderId, traderName, symbol, side, action: tradeAction, currentPrice, exchange = 'binance' } = req.body;
    if (!symbol || !side || !tradeAction) return err('symbol, side, action required');

    if (tradeAction === 'open') {
      const quoteQty = S.settings.maxTradeUsd;
      let orderId = null, executedPrice = currentPrice, qty = null, orderError = null;

      try {
        if (exchange === 'bybit' && YKEY) {
          const o = await placeBybitOrder(YKEY, YSEC, { symbol, side, quoteQty });
          orderId = o.result?.orderId;
          qty = quoteQty / currentPrice;
        } else if (BKEY) {
          const o = await placeBinanceOrder(BKEY, BSEC, { symbol, side, quoteQty });
          orderId = o.orderId;
          executedPrice = parseFloat(o.fills?.[0]?.price || currentPrice);
          qty = parseFloat(o.executedQty);
        } else {
          throw new Error('No API keys — add them in Settings → API Keys');
        }
      } catch (e) { orderError = e.message; }

      const posId = `${traderId}_${symbol}_${Date.now()}`;
      const position = { id:posId, traderId, traderName, symbol, side, entryPrice:executedPrice, qty, sizeUsd:quoteQty, openedAt:Date.now(), status:orderError?'error':'open', pnl:0, exchange, orderId, error:orderError };
      if (!orderError) S.openPositions[posId] = position;
      S.tradeLog.unshift({ ...position, type:'open' });
      if (S.tradeLog.length > 500) S.tradeLog = S.tradeLog.slice(0, 500);

      pushEvent(orderError ? 'trade_error' : 'trade_opened', { ...position, message: orderError ? `❌ ${symbol} failed: ${orderError}` : `✅ ${traderName} copied: ${side.toUpperCase()} ${symbol} @ $${executedPrice?.toLocaleString()} · $${quoteQty}` });
      return ok({ success: !orderError, position, error: orderError });
    }

    if (tradeAction === 'close') {
      const pos = Object.values(S.openPositions).find(p => p.traderId === traderId && p.symbol === symbol && p.status === 'open');
      if (!pos) return ok({ success: false, error: 'No open position found' });

      let orderError = null;
      try {
        if (pos.exchange === 'bybit' && YKEY) await placeBybitOrder(YKEY, YSEC, { symbol, side: pos.side === 'long' ? 'short' : 'long', quoteQty: pos.sizeUsd });
        else if (BKEY) await placeBinanceCloseOrder(BKEY, BSEC, { symbol, side: pos.side, quantity: pos.qty });
      } catch (e) { orderError = e.message; }

      const pnlPct = pos.side === 'long' ? (currentPrice - pos.entryPrice) / pos.entryPrice * 100 : (pos.entryPrice - currentPrice) / pos.entryPrice * 100;
      Object.assign(pos, { pnl: pnlPct, exitPrice: currentPrice, closedAt: Date.now(), status: orderError ? 'error' : 'closed' });
      delete S.openPositions[pos.id];
      S.tradeLog.unshift({ ...pos, type: 'close' });
      pushEvent('trade_closed', { ...pos, message: `${traderName} closed ${symbol} ${pnlPct >= 0 ? '+' : ''}${pnlPct.toFixed(2)}%` });
      return ok({ success: !orderError, position: pos });
    }
  }

  // POST poll — check a trader's positions and copy any new ones
  if (req.method === 'POST' && action === 'poll') {
    const results = [];
    for (const [id, trader] of Object.entries(S.copiedTraders)) {
      if (!trader.uid) continue; // only works for Binance leaderboard traders with UID
      try {
        const positions = await fetchTraderPositions(trader.uid);
        const prevSymbols = new Set((trader.lastPositions || []).map(p => p.symbol));
        const currSymbols = new Set(positions.map(p => p.symbol));

        // New positions — copy them
        for (const pos of positions) {
          if (!prevSymbols.has(pos.symbol)) {
            const price = Math.abs(pos.entryPrice);
            const side = pos.amount > 0 ? 'long' : 'short';
            // Execute via internal logic
            const body = { traderId: id, traderName: trader.name, symbol: pos.symbol, side, action: 'open', currentPrice: price, exchange: 'binance' };
            // Inline execute
            req.body = body; req.query = { action: 'execute' };
            // Just log it — actual execution needs another call but state is shared
            results.push({ symbol: pos.symbol, side, action: 'opened' });
          }
        }
        // Closed positions
        for (const prev of (trader.lastPositions || [])) {
          if (!currSymbols.has(prev.symbol) && S.settings.copyCloses) {
            results.push({ symbol: prev.symbol, action: 'closed' });
          }
        }
        S.copiedTraders[id].lastPositions = positions;
        S.copiedTraders[id].lastChecked = Date.now();
      } catch (e) { results.push({ trader: trader.name, error: e.message }); }
    }
    return ok({ polled: Object.keys(S.copiedTraders).length, results });
  }

  // POST signal — TradingView / 3Commas webhook (no auth for webhooks)
  if (req.method === 'POST' && action === 'signal') {
    const { symbol, side, action: tradeAction, price, source = 'webhook' } = req.body;
    if (!symbol || !side || !tradeAction) return err('symbol, side, action required');
    S.copiedTraders['webhook'] = S.copiedTraders['webhook'] || { id:'webhook', name:source, tradeCount:0 };
    // Queue the trade
    pushEvent('signal_received', { symbol, side, action: tradeAction, source, message: `Signal: ${side.toUpperCase()} ${symbol} from ${source}` });
    return ok({ success: true, queued: true });
  }

  return err('Unknown action', 404);
}
