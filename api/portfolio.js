// Portfolio: real balances from Binance/Bybit using API keys set in Vercel env vars
import crypto from 'crypto';

function binanceSign(secret, params) {
  const qs = new URLSearchParams(params).toString();
  const sig = crypto.createHmac('sha256', secret).update(qs).digest('hex');
  return `${qs}&signature=${sig}`;
}

async function getBinanceAccount(apiKey, secret) {
  const params = { timestamp: Date.now(), recvWindow: 5000 };
  const qs = binanceSign(secret, params);
  const r = await fetch(`https://api.binance.com/api/v3/account?${qs}`, {
    headers: { 'X-MBX-APIKEY': apiKey },
    signal: AbortSignal.timeout(8000),
  });
  if (!r.ok) throw new Error(`Binance error: ${r.status}`);
  return r.json();
}

async function getBinancePrices() {
  const r = await fetch('https://api.binance.com/api/v3/ticker/price', { signal: AbortSignal.timeout(5000) });
  const data = await r.json();
  return Object.fromEntries(data.map(p => [p.symbol, parseFloat(p.price)]));
}

async function getBybitAccount(apiKey, secret) {
  const timestamp = Date.now().toString();
  const params = `accountType=UNIFIED`;
  const toSign = timestamp + apiKey + '5000' + params;
  const sig = crypto.createHmac('sha256', secret).update(toSign).digest('hex');
  const r = await fetch(`https://api.bybit.com/v5/account/wallet-balance?${params}`, {
    headers: {
      'X-BAPI-API-KEY': apiKey,
      'X-BAPI-SIGN': sig,
      'X-BAPI-TIMESTAMP': timestamp,
      'X-BAPI-RECV-WINDOW': '5000',
    },
    signal: AbortSignal.timeout(8000),
  });
  if (!r.ok) throw new Error(`Bybit error: ${r.status}`);
  return r.json();
}

const PNL_DATA = [
  {month:'Jul',pnl:3.1},{month:'Aug',pnl:-1.2},{month:'Sep',pnl:5.4},{month:'Oct',pnl:7.2},
  {month:'Nov',pnl:-0.8},{month:'Dec',pnl:4.1},{month:'Jan',pnl:6.3},{month:'Feb',pnl:2.9},
  {month:'Mar',pnl:8.1},{month:'Apr',pnl:-1.5},{month:'May',pnl:5.7},{month:'Jun',pnl:9.2},
];

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const BINANCE_KEY = process.env.BINANCE_API_KEY;
  const BINANCE_SECRET = process.env.BINANCE_API_SECRET;
  const BYBIT_KEY = process.env.BYBIT_API_KEY;
  const BYBIT_SECRET = process.env.BYBIT_API_SECRET;

  let balances = [];
  let errors = [];
  let prices = {};
  let demo = true;

  // Fetch live prices regardless
  try { prices = await getBinancePrices(); } catch {}

  // Binance balances
  if (BINANCE_KEY && BINANCE_SECRET) {
    try {
      const account = await getBinanceAccount(BINANCE_KEY, BINANCE_SECRET);
      const binanceBals = (account.balances || [])
        .filter(b => parseFloat(b.free) + parseFloat(b.locked) > 0.000001)
        .map(b => {
          const total = parseFloat(b.free) + parseFloat(b.locked);
          const price = b.asset === 'USDT' ? 1 : (prices[`${b.asset}USDT`] || 0);
          return { asset: b.asset, free: parseFloat(b.free), locked: parseFloat(b.locked), total, usdValue: total * price, price, exchange: 'binance' };
        });
      balances = [...balances, ...binanceBals];
      demo = false;
    } catch (e) { errors.push(`Binance: ${e.message}`); }
  }

  // Bybit balances
  if (BYBIT_KEY && BYBIT_SECRET) {
    try {
      const data = await getBybitAccount(BYBIT_KEY, BYBIT_SECRET);
      const coins = data?.result?.list?.[0]?.coin || [];
      const bybitBals = coins
        .filter(c => parseFloat(c.walletBalance) > 0.000001)
        .map(c => {
          const total = parseFloat(c.walletBalance);
          const price = c.coin === 'USDT' ? 1 : (prices[`${c.coin}USDT`] || 0);
          return { asset: c.coin, free: parseFloat(c.availableToWithdraw || c.walletBalance), locked: parseFloat(c.locked || 0), total, usdValue: total * price, price, exchange: 'bybit' };
        });
      balances = [...balances, ...bybitBals];
      demo = false;
    } catch (e) { errors.push(`Bybit: ${e.message}`); }
  }

  // Demo fallback
  if (demo) {
    balances = [
      { asset: 'USDT', free: 10000, locked: 0, total: 10000, usdValue: 10000, price: 1, exchange: 'demo' },
      { asset: 'BTC',  free: 0.15,  locked: 0, total: 0.15,  usdValue: 0.15 * (prices['BTCUSDT']||61240), price: prices['BTCUSDT']||61240, exchange: 'demo' },
      { asset: 'ETH',  free: 2.5,   locked: 0, total: 2.5,   usdValue: 2.5  * (prices['ETHUSDT']||3180),  price: prices['ETHUSDT']||3180,  exchange: 'demo' },
      { asset: 'SOL',  free: 25,    locked: 0, total: 25,     usdValue: 25   * (prices['SOLUSDT']||142),   price: prices['SOLUSDT']||142,   exchange: 'demo' },
    ];
  }

  balances.sort((a, b) => b.usdValue - a.usdValue);
  const totalUsd = balances.reduce((s, b) => s + b.usdValue, 0);

  res.json({ totalUsd, balances, pnlByMonth: PNL_DATA, demo, errors, tradeLog: [], openPositions: [] });
}
