import crypto from 'crypto';

export const config = { runtime: 'edge' };

async function getLivePrices() {
  try {
    const r = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana,binancecoin,cardano,dogecoin,ripple&vs_currencies=usd', { signal: AbortSignal.timeout(6000) });
    const d = await r.json();
    return { BTCUSDT: d.bitcoin?.usd, ETHUSDT: d.ethereum?.usd, SOLUSDT: d.solana?.usd, BNBUSDT: d.binancecoin?.usd, ADAUSDT: d.cardano?.usd, XRPUSDT: d.ripple?.usd };
  } catch { return {}; }
}

async function getBinanceAccount(apiKey, secret) {
  const timestamp = Date.now();
  const queryString = `timestamp=${timestamp}&recvWindow=10000`;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sigBuffer = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(queryString));
  const sig = Array.from(new Uint8Array(sigBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');

  const r = await fetch(`https://api.binance.com/api/v3/account?${queryString}&signature=${sig}`, {
    headers: { 'X-MBX-APIKEY': apiKey },
    signal: AbortSignal.timeout(8000),
  });
  const text = await r.text();
  if (text.startsWith('<')) throw new Error('Geo-blocked');
  const data = JSON.parse(text);
  if (!r.ok) throw new Error(data.msg || `HTTP ${r.status}`);
  return data;
}

async function getBybitAccount(apiKey, secret) {
  const timestamp = Date.now().toString();
  const recvWindow = '20000';

  for (const accountType of ['UNIFIED', 'CONTRACT', 'SPOT']) {
    const queryString = `accountType=${accountType}`;
    const toSign = `${timestamp}${apiKey}${recvWindow}${queryString}`;
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const sigBuffer = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(toSign));
    const sig = Array.from(new Uint8Array(sigBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');

    const r = await fetch(`https://api.bybit.com/v5/account/wallet-balance?${queryString}`, {
      headers: { 'X-BAPI-API-KEY': apiKey, 'X-BAPI-SIGN': sig, 'X-BAPI-TIMESTAMP': timestamp, 'X-BAPI-RECV-WINDOW': recvWindow },
      signal: AbortSignal.timeout(8000),
    });
    const text = await r.text();
    if (text.includes('CloudFront') || text.startsWith('<')) continue;
    const data = JSON.parse(text);
    if (data.retCode === 0) {
      const coins = data?.result?.list?.[0]?.coin || [];
      if (coins.length > 0) return { coins, accountType };
      continue;
    }
    if ([10005, 10003, 10001].includes(data.retCode)) continue;
    throw new Error(`Bybit ${data.retCode}: ${data.retMsg}`);
  }
  throw new Error('No Bybit balance found');
}

const PNL_DATA = [
  {month:'Jul',pnl:3.1},{month:'Aug',pnl:-1.2},{month:'Sep',pnl:5.4},{month:'Oct',pnl:7.2},
  {month:'Nov',pnl:-0.8},{month:'Dec',pnl:4.1},{month:'Jan',pnl:6.3},{month:'Feb',pnl:2.9},
  {month:'Mar',pnl:8.1},{month:'Apr',pnl:-1.5},{month:'May',pnl:5.7},{month:'Jun',pnl:9.2},
];

export default async function handler(req) {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };
  if (req.method === 'OPTIONS') return new Response(null, { headers });

  const BINANCE_KEY    = process.env.BINANCE_API_KEY;
  const BINANCE_SECRET = process.env.BINANCE_API_SECRET;
  const BYBIT_KEY      = process.env.BYBIT_API_KEY;
  const BYBIT_SECRET   = process.env.BYBIT_API_SECRET;

  let balances = [], errors = [], demo = true;
  const prices = await getLivePrices();

  if (BINANCE_KEY && BINANCE_SECRET) {
    try {
      const account = await getBinanceAccount(BINANCE_KEY, BINANCE_SECRET);
      const bals = (account.balances || [])
        .filter(b => parseFloat(b.free) + parseFloat(b.locked) > 0.000001)
        .map(b => {
          const total = parseFloat(b.free) + parseFloat(b.locked);
          const price = b.asset === 'USDT' ? 1 : (prices[`${b.asset}USDT`] || 0);
          return { asset: b.asset, free: parseFloat(b.free), locked: parseFloat(b.locked), total, usdValue: total * price, price, exchange: 'binance' };
        });
      balances = [...balances, ...bals];
      demo = false;
    } catch (e) { errors.push(`Binance: ${e.message}`); }
  }

  if (BYBIT_KEY && BYBIT_SECRET) {
    try {
      const { coins } = await getBybitAccount(BYBIT_KEY, BYBIT_SECRET);
      const bals = coins
        .filter(c => parseFloat(c.walletBalance) > 0.000001)
        .map(c => {
          const total = parseFloat(c.walletBalance);
          const price = c.coin === 'USDT' ? 1 : (prices[`${c.coin}USDT`] || 0);
          return { asset: c.coin, free: parseFloat(c.availableToWithdraw ?? c.walletBalance), locked: parseFloat(c.locked ?? 0), total, usdValue: total * price, price, exchange: 'bybit' };
        });
      balances = [...balances, ...bals];
      demo = false;
    } catch (e) { errors.push(`Bybit: ${e.message}`); }
  }

  if (demo) {
    const btc = prices['BTCUSDT'] || 62541;
    const eth = prices['ETHUSDT'] || 1665;
    const sol = prices['SOLUSDT'] || 69;
    balances = [
      { asset:'USDT', free:10000, locked:0, total:10000, usdValue:10000,    price:1,   exchange:'demo' },
      { asset:'BTC',  free:0.15,  locked:0, total:0.15,  usdValue:0.15*btc, price:btc, exchange:'demo' },
      { asset:'ETH',  free:2.5,   locked:0, total:2.5,   usdValue:2.5*eth,  price:eth, exchange:'demo' },
      { asset:'SOL',  free:25,    locked:0, total:25,     usdValue:25*sol,   price:sol, exchange:'demo' },
    ];
  }

  balances.sort((a, b) => b.usdValue - a.usdValue);
  const totalUsd = balances.reduce((s, b) => s + b.usdValue, 0);
  return new Response(JSON.stringify({ totalUsd, balances, pnlByMonth: PNL_DATA, demo, errors, tradeLog: [], openPositions: [] }), { headers });
}
