import crypto from 'crypto';

// ── Binance ──────────────────────────────────────────────────────────────────
async function getBinancePrices() {
  // Use multiple CDN endpoints — some bypass geo-restrictions
  const endpoints = [
    'https://api1.binance.com',
    'https://api2.binance.com',
    'https://api3.binance.com',
    'https://api4.binance.com',
    'https://data-api.binance.vision', // Binance public data mirror, no geo block
  ];
  for (const base of endpoints) {
    try {
      const r = await fetch(`${base}/api/v3/ticker/price`, { signal: AbortSignal.timeout(5000) });
      if (r.ok) {
        const data = await r.json();
        return Object.fromEntries(data.map(p => [p.symbol, parseFloat(p.price)]));
      }
    } catch {}
  }
  // CoinGecko fallback — never geo-blocked
  try {
    const r = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana,binancecoin,cardano,dogecoin,ripple&vs_currencies=usd', { signal: AbortSignal.timeout(6000) });
    const d = await r.json();
    return { BTCUSDT: d.bitcoin?.usd, ETHUSDT: d.ethereum?.usd, SOLUSDT: d.solana?.usd, BNBUSDT: d.binancecoin?.usd };
  } catch {}
  return {};
}

async function getBinanceAccount(apiKey, secret) {
  const endpoints = [
    'https://api1.binance.com',
    'https://api2.binance.com',
    'https://api3.binance.com',
    'https://api4.binance.com',
    'https://data-api.binance.vision',
  ];
  const timestamp = Date.now();
  const recvWindow = 10000;
  const queryString = `timestamp=${timestamp}&recvWindow=${recvWindow}`;
  const sig = crypto.createHmac('sha256', secret).update(queryString).digest('hex');
  const url = `/api/v3/account?${queryString}&signature=${sig}`;

  for (const base of endpoints) {
    try {
      const r = await fetch(`${base}${url}`, {
        headers: { 'X-MBX-APIKEY': apiKey },
        signal: AbortSignal.timeout(8000),
      });
      if (r.status === 451 || r.status === 403) continue; // geo-blocked, try next
      const data = await r.json();
      if (!r.ok) throw new Error(data.msg || `HTTP ${r.status}`);
      return data;
    } catch (e) {
      if (e.name === 'TimeoutError') continue;
      if (e.message?.includes('451') || e.message?.includes('403')) continue;
      throw e;
    }
  }
  throw new Error('Binance geo-blocked on all endpoints from Vercel US servers. Disable IP restriction on your API key in Binance settings.');
}

// ── Bybit ────────────────────────────────────────────────────────────────────
async function getBybitAccount(apiKey, secret) {
  const timestamp = Date.now().toString();
  const recvWindow = '20000';

  for (const accountType of ['UNIFIED', 'CONTRACT', 'SPOT']) {
    try {
      // Bybit V5: sign = HMAC-SHA256(timestamp + apiKey + recvWindow + queryString)
      const queryString = `accountType=${accountType}`;
      const toSign = `${timestamp}${apiKey}${recvWindow}${queryString}`;
      const sig = crypto.createHmac('sha256', secret).update(toSign).digest('hex');

      const r = await fetch(`https://api.bybit.com/v5/account/wallet-balance?${queryString}`, {
        method: 'GET',
        headers: {
          'X-BAPI-API-KEY': apiKey,
          'X-BAPI-SIGN': sig,
          'X-BAPI-TIMESTAMP': timestamp,
          'X-BAPI-RECV-WINDOW': recvWindow,
        },
        signal: AbortSignal.timeout(8000),
      });

      const text = await r.text();
      let data;
      try { data = JSON.parse(text); }
      catch { throw new Error(`Bybit returned non-JSON: ${text.slice(0, 100)}`); }

      if (data.retCode === 0) {
        const coins = data?.result?.list?.[0]?.coin || [];
        if (coins.length > 0) return { coins, accountType };
        // Empty wallet on this account type, try next
        continue;
      }
      // Wrong account type errors — try next
      if ([10005, 10003, 10001].includes(data.retCode)) continue;
      throw new Error(`Bybit error ${data.retCode}: ${data.retMsg}`);
    } catch (e) {
      if (e.message?.includes('10005') || e.message?.includes('10003')) continue;
      throw e;
    }
  }
  throw new Error('Bybit: no balances found across UNIFIED/CONTRACT/SPOT. Check API key has "Read" permission.');
}

// ── Main handler ─────────────────────────────────────────────────────────────
const PNL_DATA = [
  {month:'Jul',pnl:3.1},{month:'Aug',pnl:-1.2},{month:'Sep',pnl:5.4},{month:'Oct',pnl:7.2},
  {month:'Nov',pnl:-0.8},{month:'Dec',pnl:4.1},{month:'Jan',pnl:6.3},{month:'Feb',pnl:2.9},
  {month:'Mar',pnl:8.1},{month:'Apr',pnl:-1.5},{month:'May',pnl:5.7},{month:'Jun',pnl:9.2},
];

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const BINANCE_KEY    = process.env.BINANCE_API_KEY;
  const BINANCE_SECRET = process.env.BINANCE_API_SECRET;
  const BYBIT_KEY      = process.env.BYBIT_API_KEY;
  const BYBIT_SECRET   = process.env.BYBIT_API_SECRET;

  let balances = [];
  let errors   = [];
  let demo     = true;

  const prices = await getBinancePrices();

  // ── Binance ──
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

  // ── Bybit ──
  if (BYBIT_KEY && BYBIT_SECRET) {
    try {
      const { coins, accountType } = await getBybitAccount(BYBIT_KEY, BYBIT_SECRET);
      const bals = coins
        .filter(c => parseFloat(c.walletBalance) > 0.000001)
        .map(c => {
          const total = parseFloat(c.walletBalance);
          const price = c.coin === 'USDT' ? 1 : (prices[`${c.coin}USDT`] || 0);
          return {
            asset: c.coin,
            free: parseFloat(c.availableToWithdraw ?? c.walletBalance),
            locked: parseFloat(c.locked ?? 0),
            total, usdValue: total * price, price,
            exchange: `bybit`,
          };
        });
      balances = [...balances, ...bals];
      demo = false;
    } catch (e) { errors.push(`Bybit: ${e.message}`); }
  }

  // ── Demo fallback ──
  if (demo) {
    const btc = prices['BTCUSDT'] || 61240;
    const eth = prices['ETHUSDT'] || 3180;
    const sol = prices['SOLUSDT'] || 142;
    balances = [
      { asset:'USDT', free:10000, locked:0, total:10000, usdValue:10000,        price:1,   exchange:'demo' },
      { asset:'BTC',  free:0.15,  locked:0, total:0.15,  usdValue:0.15*btc,     price:btc, exchange:'demo' },
      { asset:'ETH',  free:2.5,   locked:0, total:2.5,   usdValue:2.5*eth,      price:eth, exchange:'demo' },
      { asset:'SOL',  free:25,    locked:0, total:25,     usdValue:25*sol,       price:sol, exchange:'demo' },
    ];
  }

  balances.sort((a, b) => b.usdValue - a.usdValue);
  const totalUsd = balances.reduce((s, b) => s + b.usdValue, 0);

  res.json({ totalUsd, balances, pnlByMonth: PNL_DATA, demo, errors, tradeLog: [], openPositions: [] });
}
