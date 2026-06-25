export const config = { runtime: 'edge' };

// Edge-compatible in-memory state (per-instance, resets on cold start)
const state = {
  copiedTraders: {},
  openPositions: {},
  tradeLog: [],
  eventQueue: [],
  settings: { copyMode:'proportional', maxTradeSize:500, autoStopLoss:0.02, copyCloses:true, pauseOnDrawdown:0.05, assetFilter:'all' },
};

async function hmac(secret, message) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name:'HMAC', hash:'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2,'0')).join('');
}

async function placeBinanceOrder({ symbol, side, quantity, apiKey, secret }) {
  const timestamp = Date.now();
  const qs = `symbol=${symbol}&side=${side==='long'?'BUY':'SELL'}&type=MARKET&quantity=${parseFloat(quantity).toFixed(6)}&timestamp=${timestamp}&recvWindow=10000`;
  const sig = await hmac(secret, qs);
  const r = await fetch(`https://api.binance.com/api/v3/order?${qs}&signature=${sig}`, {
    method: 'POST', headers: { 'X-MBX-APIKEY': apiKey },
    signal: AbortSignal.timeout(10000),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.msg || `Binance HTTP ${r.status}`);
  return data;
}

async function placeBybitOrder({ symbol, side, quantity, apiKey, secret }) {
  const timestamp = Date.now().toString();
  const recvWindow = '10000';
  const body = JSON.stringify({ category:'spot', symbol, side:side==='long'?'Buy':'Sell', orderType:'Market', qty:parseFloat(quantity).toFixed(6) });
  const sig = await hmac(secret, `${timestamp}${apiKey}${recvWindow}${body}`);
  const r = await fetch('https://api.bybit.com/v5/order/create', {
    method: 'POST',
    headers: { 'Content-Type':'application/json', 'X-BAPI-API-KEY':apiKey, 'X-BAPI-SIGN':sig, 'X-BAPI-TIMESTAMP':timestamp, 'X-BAPI-RECV-WINDOW':recvWindow },
    body, signal: AbortSignal.timeout(10000),
  });
  const data = await r.json();
  if (data.retCode !== 0) throw new Error(`Bybit ${data.retCode}: ${data.retMsg}`);
  return data;
}

export default async function handler(req) {
  const headers = { 'Access-Control-Allow-Origin':'*', 'Content-Type':'application/json', 'Access-Control-Allow-Methods':'GET,POST,PUT,DELETE,OPTIONS', 'Access-Control-Allow-Headers':'Content-Type' };
  if (req.method === 'OPTIONS') return new Response(null, { headers });

  const url = new URL(req.url);
  const action = url.searchParams.get('action');
  const BINANCE_KEY = process.env.BINANCE_API_KEY;
  const BINANCE_SECRET = process.env.BINANCE_API_SECRET;
  const BYBIT_KEY = process.env.BYBIT_API_KEY;
  const BYBIT_SECRET = process.env.BYBIT_API_SECRET;
  const hasKeys = !!(BINANCE_KEY || BYBIT_KEY);

  const ok = (data) => new Response(JSON.stringify(data), { headers });
  const err = (msg, status=400) => new Response(JSON.stringify({ error: msg }), { status, headers });

  // GET status
  if (req.method === 'GET' && action === 'status') {
    return ok({ running: true, demoMode: !hasKeys, copiedTraders: Object.values(state.copiedTraders), openPositions: Object.values(state.openPositions), tradeLog: state.tradeLog.slice(0,50), settings: state.settings });
  }

  // GET events (polling)
  if (req.method === 'GET' && action === 'events') {
    const since = parseInt(url.searchParams.get('since') || '0');
    return ok({ events: state.eventQueue.filter(e => e.ts > since), ts: Date.now() });
  }

  // POST copy
  if (req.method === 'POST' && action === 'copy') {
    const { trader } = await req.json();
    if (!trader?.id) return err('trader.id required');
    state.copiedTraders[trader.id] = { ...trader, addedAt: Date.now(), trades: 0 };
    state.eventQueue.unshift({ type:'trader_added', data: trader, ts: Date.now() });
    return ok({ success: true, message: `Now copying ${trader.name}` });
  }

  // DELETE stop copying
  if (req.method === 'DELETE' && action === 'copy') {
    const traderId = url.searchParams.get('traderId');
    delete state.copiedTraders[traderId];
    return ok({ success: true });
  }

  // PUT settings
  if (req.method === 'PUT' && action === 'settings') {
    const body = await req.json();
    Object.assign(state.settings, body);
    return ok({ success: true, settings: state.settings });
  }

  // POST execute — place real order
  if (req.method === 'POST' && action === 'execute') {
    const { traderId, traderName, symbol, side, action: tradeAction, price, quantity, exchange='binance' } = await req.json();
    if (!symbol || !side || !tradeAction) return err('symbol, side, action required');

    const maxQty = state.settings.maxTradeSize / price;
    const qty = state.settings.copyMode === 'fixed' ? maxQty : Math.min((quantity||0.001)*0.1, maxQty);

    if (tradeAction === 'open') {
      let orderId = null, executedPrice = price, orderError = null;
      try {
        if (exchange === 'bybit' && BYBIT_KEY) {
          const o = await placeBybitOrder({ symbol, side, quantity: qty, apiKey: BYBIT_KEY, secret: BYBIT_SECRET });
          orderId = o.result?.orderId;
        } else if (BINANCE_KEY) {
          const o = await placeBinanceOrder({ symbol, side, quantity: qty, apiKey: BINANCE_KEY, secret: BINANCE_SECRET });
          orderId = o.orderId;
          executedPrice = parseFloat(o.fills?.[0]?.price || price);
        } else throw new Error('No API keys configured');
      } catch (e) { orderError = e.message; }

      const posId = `${traderId}_${symbol}_${Date.now()}`;
      const position = { id:posId, traderId, traderName, symbol, side, entryPrice:executedPrice, size:qty, sizeUsd:qty*executedPrice, openedAt:Date.now(), status:orderError?'error':'open', pnl:0, exchange, orderId, error:orderError };
      if (!orderError) state.openPositions[posId] = position;
      state.tradeLog.unshift({ ...position, type:'open' });
      if (state.tradeLog.length > 200) state.tradeLog = state.tradeLog.slice(0, 200);
      state.eventQueue.unshift({ type: orderError?'trade_error':'trade_opened', data:{ ...position, message: orderError||`${traderName} opened ${symbol} ${side.toUpperCase()} @ $${executedPrice.toLocaleString()}` }, ts:Date.now() });
      return ok({ success: !orderError, position, error: orderError });
    }

    if (tradeAction === 'close') {
      const pos = Object.values(state.openPositions).find(p => p.traderId===traderId && p.symbol===symbol && p.status==='open');
      if (!pos) return ok({ success:false, error:'No open position found' });
      let orderError = null;
      try {
        const closeSide = pos.side==='long' ? 'short' : 'long';
        if (pos.exchange==='bybit' && BYBIT_KEY) await placeBybitOrder({ symbol, side:closeSide, quantity:pos.size, apiKey:BYBIT_KEY, secret:BYBIT_SECRET });
        else if (BINANCE_KEY) await placeBinanceOrder({ symbol, side:closeSide, quantity:pos.size, apiKey:BINANCE_KEY, secret:BINANCE_SECRET });
      } catch (e) { orderError = e.message; }
      const pnlPct = pos.side==='long' ? (price-pos.entryPrice)/pos.entryPrice*100 : (pos.entryPrice-price)/pos.entryPrice*100;
      Object.assign(pos, { pnl:pnlPct, exitPrice:price, closedAt:Date.now(), status:orderError?'error':'closed' });
      delete state.openPositions[pos.id];
      state.tradeLog.unshift({ ...pos, type:'close' });
      state.eventQueue.unshift({ type:'trade_closed', data:{ ...pos, message:`${traderName} closed ${symbol} ${pnlPct>=0?'+':''}${pnlPct.toFixed(1)}%` }, ts:Date.now() });
      return ok({ success:!orderError, position:pos, error:orderError });
    }
  }

  // POST signal — TradingView/3Commas webhook
  if (req.method === 'POST' && action === 'signal') {
    const body = await req.json();
    const { symbol, side, action: tradeAction, price, quantity, source='webhook' } = body;
    if (!symbol||!side||!tradeAction) return err('symbol, side, action required');
    // Re-route to execute
    const syntheticReq = new Request(`${req.url.split('?')[0]}?action=execute`, {
      method: 'POST',
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify({ traderId:'webhook', traderName:source, symbol, side, action:tradeAction, price:parseFloat(price), quantity:parseFloat(quantity), exchange:'binance' }),
    });
    return handler(syntheticReq);
  }

  return err('Unknown action', 404);
}
