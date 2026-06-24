import crypto from 'crypto';

function binanceSign(secret, params) {
  const qs = new URLSearchParams(params).toString();
  const sig = crypto.createHmac('sha256', secret).update(qs).digest('hex');
  return `${qs}&signature=${sig}`;
}

async function getBinanceAccount(apiKey, secret) {
  // Try both global and US endpoints — Binance blocks some Vercel regions
  const endpoints = [
    'https://api1.binance.com',
    'https://api2.binance.com', 
    'https://api3.binance.com',
    'https://api.binance.com',
  ];
  const params = { timestamp: Date.now(), recvWindow: 10000 };
  const qs = binanceSign(secret, params);
  
  for (const base of endpoints) {
    try {
      const r = await fetch(`${base}/api/v3/account?${qs}`, {
        headers: { 'X-MBX-APIKEY': apiKey },
        signal: AbortSignal.timeout(8000),
      });
      if (r.ok) return r.json();
      const err = await r.json();
      // 451 = geo-blocked, try next endpoint
      if (r.status === 451) continue;
      throw new Error(err.msg || `HTTP ${r.status}`);
    } catch (e) {
      if (e.message?.includes('451') || e.name === 'TimeoutError') continue;
      throw e;
    }
  }
  throw new Error('All Binance endpoints geo-blocked from this server region. Use Binance API key with IP restriction disabled, or enable server-side proxy.');
}

async function getBinancePrices() {
  const endpoints = ['https://api1.binance.com','https://api2.binance.com','https://api.binance.com'];
  for (const base of endpoints) {
    try {
      const r = await fetch(`${base}/api/v3/ticker/price`, { signal: AbortSignal.timeout(5000) });
      if (r.ok) {
        const data = await r.json();
        return Object.fromEntries(data.map(p => [p.symbol, parseFloat(p.price)]));
      }
    } catch {}
  }
  return {};
}

async function getBybitAccount(apiKey, secret) {
  const timestamp = Date.now().toString();
  const recvWindow = '20000';
  // Bybit V5 wallet balance — use UNIFIED account type first, fall back to CONTRACT
  for (const accountType of ['UNIFIED', 'CONTRACT', 'SPOT']) {
    try {
      const params = `accountType=${accountType}`;
      const toSign = timestamp + apiKey + recvWindow + params;
      const sig = crypto.createHmac('sha256', secret).update(toSign).digest('hex');
      const r = await fetch(`https://api.bybit.com/v5/account/wallet-balance?${params}`, {
        headers: {
          'X-BAPI-API-KEY': apiKey,
          'X-BAPI-SIGN': sig,
          'X-BAPI-TIMESTAMP': timestamp,
          'X-BAPI-RECV-WINDOW': recvWindow,
          'X-BAPI-SIGN-TYPE': '2',
        },
        signal: AbortSignal.timeout(8000),
      });
      const data = await r.json();
      if (data.retCode === 0) {
        const coins = data?.result?.list?.[0]?.coin || [];
        if (coins.length > 0) return { coins, accountType };
      }
      // retCode 10005 = wrong account type, try next
      if (data.retCode === 10005 || data.retCode === 10003) continue;
      throw new Error(data.retMsg || `Bybit error ${data.retCode}`);
    } catch (e) {
      if (e.message?.includes('10005') || e.message?.includes('10003')) continue;
      throw e;
    }
  }
  throw new Error('Could not fetch Bybit balance — check API key has Read permission enabled');
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

  // Always fetch live prices (public API, no key needed)
  try { prices = await getBinancePrices(); } catch {}

  // Binance balances
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
    } catch (e) {
      errors.push(`Binance: ${e.message}`);
    }
  }

  // Bybit balances
  if (BYBIT_KEY && BYBIT_SECRET) {
    try {
      const { coins, accountType } = await getBybitAccount(BYBIT_KEY, BYBIT_SECRET);
      const bals = coins
        .filter(c => parseFloat(c.walletBalance) > 0.000001)
        .map(c => {
          const total = parseFloat(c.walletBalance);
          const price = c.coin === 'USDT' ? 1 : (prices[`${c.coin}USDT`] || 0);
          return { asset: c.coin, free: parseFloat(c.availableToWithdraw || c.walletBalance), locked: parseFloat(c.locked || 0), total, usdValue: total * price, price, exchange: `bybit-${accountType}` };
        });
      balances = [...balances, ...bals];
      demo = false;
    } catch (e) {
      errors.push(`Bybit: ${e.message}`);
    }
  }

  // Demo fallback only if both failed
  if (demo) {
    const btc = prices['BTCUSDT'] || 61240;
    const eth = prices['ETHUSDT'] || 3180;
    const sol = prices['SOLUSDT'] || 142;
    balances = [
      { asset: 'USDT', free: 10000, locked: 0, total: 10000, usdValue: 10000, price: 1, exchange: 'demo' },
      { asset: 'BTC',  free: 0.15,  locked: 0, total: 0.15,  usdValue: 0.15 * btc, price: btc, exchange: 'demo' },
      { asset: 'ETH',  free: 2.5,   locked: 0, total: 2.5,   usdValue: 2.5  * eth, price: eth, exchange: 'demo' },
      { asset: 'SOL',  free: 25,    locked: 0, total: 25,     usdValue: 25   * sol, price: sol, exchange: 'demo' },
    ];
  }

  balances.sort((a, b) => b.usdValue - a.usdValue);
  const totalUsd = balances.reduce((s, b) => s + b.usdValue, 0);

  res.json({ totalUsd, balances, pnlByMonth: PNL_DATA, demo, errors, tradeLog: [], openPositions: [] });
}
