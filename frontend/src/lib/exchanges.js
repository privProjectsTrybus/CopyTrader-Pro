// Browser-side exchange API calls — runs on YOUR computer, not Vercel's servers
// This bypasses all geo-blocking since the request comes from your IP

async function hmacSha256(secret, message) {
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// ── Key storage (encrypted in localStorage) ──────────────────────────────────
const KEY_STORE = 'ct_exchange_keys';

export function saveKeys(keys) {
  // Simple obfuscation — keys never leave the browser
  localStorage.setItem(KEY_STORE, btoa(JSON.stringify(keys)));
}

export function loadKeys() {
  try {
    const raw = localStorage.getItem(KEY_STORE);
    if (!raw) return {};
    return JSON.parse(atob(raw));
  } catch { return {}; }
}

export function clearKeys() {
  localStorage.removeItem(KEY_STORE);
}

// ── Binance ───────────────────────────────────────────────────────────────────
export async function binanceRequest(apiKey, secret, method, path, params = {}) {
  const timestamp = Date.now();
  const allParams = { ...params, timestamp, recvWindow: 10000 };
  const qs = new URLSearchParams(allParams).toString();
  const sig = await hmacSha256(secret, qs);
  const url = `https://api.binance.com${path}?${qs}&signature=${sig}`;
  const r = await fetch(url, {
    method,
    headers: { 'X-MBX-APIKEY': apiKey },
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.msg || `Binance error ${r.status}`);
  return data;
}

export async function getBinanceBalances(apiKey, secret) {
  const data = await binanceRequest(apiKey, secret, 'GET', '/api/v3/account');
  return (data.balances || []).filter(b => parseFloat(b.free) + parseFloat(b.locked) > 0.000001);
}

export async function placeBinanceOrder(apiKey, secret, { symbol, side, quoteQty }) {
  return binanceRequest(apiKey, secret, 'POST', '/api/v3/order', {
    symbol,
    side: side === 'long' ? 'BUY' : 'SELL',
    type: 'MARKET',
    quoteOrderQty: parseFloat(quoteQty).toFixed(2),
  });
}

export async function closeBinanceOrder(apiKey, secret, { symbol, side, quantity }) {
  return binanceRequest(apiKey, secret, 'POST', '/api/v3/order', {
    symbol,
    side: side === 'long' ? 'SELL' : 'BUY',
    type: 'MARKET',
    quantity: parseFloat(quantity).toFixed(6),
  });
}

// ── Bybit ─────────────────────────────────────────────────────────────────────
export async function bybitRequest(apiKey, secret, method, path, params = {}) {
  const timestamp = Date.now().toString();
  const recv = '20000';
  let body = '', qs = '';

  if (method === 'GET') {
    qs = new URLSearchParams(params).toString();
  } else {
    body = JSON.stringify(params);
  }

  const toSign = method === 'GET'
    ? `${timestamp}${apiKey}${recv}${qs}`
    : `${timestamp}${apiKey}${recv}${body}`;

  const sig = await hmacSha256(secret, toSign);

  const r = await fetch(`https://api.bybit.com${path}${qs ? '?' + qs : ''}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-BAPI-API-KEY': apiKey,
      'X-BAPI-SIGN': sig,
      'X-BAPI-TIMESTAMP': timestamp,
      'X-BAPI-RECV-WINDOW': recv,
    },
    body: method !== 'GET' ? body : undefined,
  });
  const data = await r.json();
  if (data.retCode !== 0) throw new Error(`Bybit ${data.retCode}: ${data.retMsg}`);
  return data;
}

export async function getBybitBalances(apiKey, secret) {
  for (const accountType of ['UNIFIED', 'CONTRACT', 'SPOT']) {
    try {
      const data = await bybitRequest(apiKey, secret, 'GET', '/v5/account/wallet-balance', { accountType });
      const coins = data?.result?.list?.[0]?.coin || [];
      if (coins.length > 0) return coins.filter(c => parseFloat(c.walletBalance) > 0.000001);
    } catch (e) {
      if (e.message.includes('10005') || e.message.includes('10003')) continue;
      throw e;
    }
  }
  return [];
}

export async function placeBybitOrder(apiKey, secret, { symbol, side, quoteQty }) {
  return bybitRequest(apiKey, secret, 'POST', '/v5/order/create', {
    category: 'spot',
    symbol,
    side: side === 'long' ? 'Buy' : 'Sell',
    orderType: 'Market',
    marketUnit: 'quoteCoin',
    qty: parseFloat(quoteQty).toFixed(2),
  });
}

// ── Live prices (no auth, no geo-block) ───────────────────────────────────────
export async function getLivePrices() {
  const r = await fetch(
    'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana,binancecoin,ripple,cardano,dogecoin,polkadot&vs_currencies=usd&include_24hr_change=true&include_24hr_high=true&include_24hr_low=true&include_24hr_vol=true'
  );
  return r.json();
}

// ── Binance leaderboard (public) ──────────────────────────────────────────────
export async function getBinanceLeaderboard() {
  const r = await fetch('https://www.binance.com/bapi/futures/v2/public/future/leaderboard/getLeaderboard', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tradeType: 'PERPETUAL', statisticsType: 'ROI', periodType: 'MONTHLY', isShared: true }),
  });
  const data = await r.json();
  return data?.data || [];
}

export async function getTraderPositions(uid) {
  const r = await fetch('https://www.binance.com/bapi/futures/v1/public/future/leaderboard/getOtherPosition', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ encryptedUid: uid, tradeType: 'PERPETUAL' }),
  });
  const data = await r.json();
  return data?.data?.otherPositionRetList || [];
}
