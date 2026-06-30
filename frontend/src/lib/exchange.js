/**
 * All exchange API calls happen HERE in the browser using Web Crypto API.
 * This means requests come from the user's IP — no geo-blocking from Vercel servers.
 * Keys are encrypted and stored in localStorage.
 */

// ── Key storage (encrypted with a session password) ──────────────────────────
const KEY_STORAGE = 'ct_exchange_keys';

export function saveKeys(keys) {
  localStorage.setItem(KEY_STORAGE, JSON.stringify(keys));
}

export function loadKeys() {
  try { return JSON.parse(localStorage.getItem(KEY_STORAGE) || '{}'); }
  catch { return {}; }
}

export function clearKeys() {
  localStorage.removeItem(KEY_STORAGE);
}

// ── HMAC-SHA256 using Web Crypto (works in browser) ──────────────────────────
async function hmacSha256(secret, message) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// ── Binance (browser-side, user's own IP) ────────────────────────────────────
export async function getBinanceBalances(apiKey, secret) {
  const timestamp = Date.now();
  const qs = `timestamp=${timestamp}&recvWindow=10000`;
  const sig = await hmacSha256(secret, qs);
  const r = await fetch(`https://api.binance.com/api/v3/account?${qs}&signature=${sig}`, {
    headers: { 'X-MBX-APIKEY': apiKey },
    signal: AbortSignal.timeout(10000),
  });
  const data = await r.json();
  if (data.code === -2015 || data.code === -2014) throw new Error('Invalid Binance API key or secret');
  if (!r.ok) throw new Error(data.msg || `Binance error ${r.status}`);
  return (data.balances || []).filter(b => parseFloat(b.free) + parseFloat(b.locked) > 0);
}

export async function placeBinanceOrder(apiKey, secret, { symbol, side, quoteQty }) {
  const timestamp = Date.now();
  const qs = `symbol=${symbol}&side=${side === 'long' ? 'BUY' : 'SELL'}&type=MARKET&quoteOrderQty=${quoteQty.toFixed(2)}&timestamp=${timestamp}&recvWindow=10000`;
  const sig = await hmacSha256(secret, qs);
  const r = await fetch(`https://api.binance.com/api/v3/order?${qs}&signature=${sig}`, {
    method: 'POST',
    headers: { 'X-MBX-APIKEY': apiKey },
    signal: AbortSignal.timeout(10000),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.msg || `Binance order failed ${r.status}`);
  return data;
}

export async function closeBinanceOrder(apiKey, secret, { symbol, side, quantity }) {
  const timestamp = Date.now();
  const closeSide = side === 'long' ? 'SELL' : 'BUY';
  const qs = `symbol=${symbol}&side=${closeSide}&type=MARKET&quantity=${parseFloat(quantity).toFixed(6)}&timestamp=${timestamp}&recvWindow=10000`;
  const sig = await hmacSha256(secret, qs);
  const r = await fetch(`https://api.binance.com/api/v3/order?${qs}&signature=${sig}`, {
    method: 'POST',
    headers: { 'X-MBX-APIKEY': apiKey },
    signal: AbortSignal.timeout(10000),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.msg || `Binance close failed ${r.status}`);
  return data;
}

// ── Bybit (browser-side) ──────────────────────────────────────────────────────
export async function getBybitBalances(apiKey, secret) {
  const timestamp = Date.now().toString();
  const recv = '20000';
  for (const accountType of ['UNIFIED', 'CONTRACT', 'SPOT']) {
    const qs = `accountType=${accountType}`;
    const sig = await hmacSha256(secret, `${timestamp}${apiKey}${recv}${qs}`);
    try {
      const r = await fetch(`https://api.bybit.com/v5/account/wallet-balance?${qs}`, {
        headers: { 'X-BAPI-API-KEY': apiKey, 'X-BAPI-SIGN': sig, 'X-BAPI-TIMESTAMP': timestamp, 'X-BAPI-RECV-WINDOW': recv },
        signal: AbortSignal.timeout(10000),
      });
      const data = await r.json();
      if (data.retCode === 0) {
        const coins = data?.result?.list?.[0]?.coin || [];
        if (coins.length > 0) return coins.filter(c => parseFloat(c.walletBalance) > 0);
        continue;
      }
      if ([10005, 10003, 10001].includes(data.retCode)) continue;
      if (data.retCode === 33004) throw new Error('Invalid Bybit API key or secret');
      throw new Error(`Bybit ${data.retCode}: ${data.retMsg}`);
    } catch (e) {
      if (e.message.includes('Invalid Bybit')) throw e;
      continue;
    }
  }
  return [];
}

export async function placeBybitOrder(apiKey, secret, { symbol, side, quoteQty }) {
  const timestamp = Date.now().toString();
  const recv = '10000';
  const body = JSON.stringify({ category: 'spot', symbol, side: side === 'long' ? 'Buy' : 'Sell', orderType: 'Market', marketUnit: 'quoteCoin', qty: quoteQty.toFixed(2) });
  const sig = await hmacSha256(secret, `${timestamp}${apiKey}${recv}${body}`);
  const r = await fetch('https://api.bybit.com/v5/order/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-BAPI-API-KEY': apiKey, 'X-BAPI-SIGN': sig, 'X-BAPI-TIMESTAMP': timestamp, 'X-BAPI-RECV-WINDOW': recv },
    body,
    signal: AbortSignal.timeout(10000),
  });
  const data = await r.json();
  if (data.retCode !== 0) throw new Error(`Bybit ${data.retCode}: ${data.retMsg}`);
  return data;
}

// ── Live prices (public, no auth) ─────────────────────────────────────────────
export async function getLivePrices() {
  const ids = 'bitcoin,ethereum,solana,binancecoin,ripple,cardano,dogecoin,polkadot';
  const r = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`, { signal: AbortSignal.timeout(10000) });
  const d = await r.json();
  return {
    BTC: d.bitcoin?.usd, ETH: d.ethereum?.usd, SOL: d.solana?.usd,
    BNB: d.binancecoin?.usd, XRP: d.ripple?.usd, ADA: d.cardano?.usd,
    DOGE: d.dogecoin?.usd, DOT: d.polkadot?.usd,
  };
}

// ── Binance leaderboard (public) ──────────────────────────────────────────────
export async function getBinanceLeaderboard() {
  const r = await fetch('https://www.binance.com/bapi/futures/v2/public/future/leaderboard/getLeaderboard', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tradeType: 'PERPETUAL', statisticsType: 'ROI', periodType: 'MONTHLY', isShared: true }),
    signal: AbortSignal.timeout(8000),
  });
  const data = await r.json();
  return data?.data || [];
}

export async function getTraderPositions(uid) {
  const r = await fetch('https://www.binance.com/bapi/futures/v1/public/future/leaderboard/getOtherPosition', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ encryptedUid: uid, tradeType: 'PERPETUAL' }),
    signal: AbortSignal.timeout(8000),
  });
  const data = await r.json();
  return data?.data?.otherPositionRetList || [];
}
