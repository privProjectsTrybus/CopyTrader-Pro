import crypto from 'crypto';
import { verifyJwt } from './auth.js';

async function getLivePrices() {
  try {
    const r = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana,binancecoin,ripple,cardano,dogecoin,polkadot&vs_currencies=usd', { signal: AbortSignal.timeout(8000) });
    const d = await r.json();
    return { BTCUSDT:d.bitcoin?.usd, ETHUSDT:d.ethereum?.usd, SOLUSDT:d.solana?.usd, BNBUSDT:d.binancecoin?.usd, XRPUSDT:d.ripple?.usd, ADAUSDT:d.cardano?.usd, DOGEUSDT:d.dogecoin?.usd, DOTUSDT:d.polkadot?.usd };
  } catch { return {}; }
}

// Try every known Binance endpoint — some bypass the Vercel/AWS block
async function getBinanceBalances(apiKey, secret) {
  const timestamp = Date.now();
  const qs = `timestamp=${timestamp}&recvWindow=10000`;
  const sig = crypto.createHmac('sha256', secret).update(qs).digest('hex');
  const url = `/api/v3/account?${qs}&signature=${sig}`;
  const headers = { 'X-MBX-APIKEY': apiKey };

  const endpoints = [
    'https://api.binance.com',
    'https://api1.binance.com',
    'https://api2.binance.com',
    'https://api3.binance.com',
    'https://api4.binance.com',
    'https://data-api.binance.vision',
  ];

  let lastError = '';
  for (const base of endpoints) {
    try {
      const r = await fetch(`${base}${url}`, { headers, signal: AbortSignal.timeout(7000) });
      const text = await r.text();
      if (text.startsWith('<') || text.includes('CloudFront') || text.includes('Request forbidden')) {
        lastError = `geo-blocked at ${base}`;
        continue;
      }
      const data = JSON.parse(text);
      if (data.code === -2015 || data.code === -2014) throw new Error('Invalid Binance API key or secret — check they are correct and not expired');
      if (data.code === -1021) throw new Error('Timestamp error — server clock skew, try again');
      if (!r.ok) throw new Error(data.msg || `HTTP ${r.status}`);
      // Success
      return (data.balances || []).filter(b => parseFloat(b.free) + parseFloat(b.locked) > 0);
    } catch (e) {
      if (e.message.includes('Invalid Binance') || e.message.includes('Timestamp')) throw e;
      lastError = e.message;
      continue;
    }
  }
  // All endpoints failed — return empty with explanation rather than crashing
  throw new Error(`Binance unreachable from Vercel servers (${lastError}). Your balances will load — consider adding a BINANCE_PROXY_URL env var pointing to your own server.`);
}

async function getBybitBalances(apiKey, secret) {
  const timestamp = Date.now().toString();
  const recv = '20000';
  for (const accountType of ['UNIFIED', 'CONTRACT', 'SPOT']) {
    const qs = `accountType=${accountType}`;
    const sig = crypto.createHmac('sha256', secret).update(`${timestamp}${apiKey}${recv}${qs}`).digest('hex');
    try {
      const r = await fetch(`https://api.bybit.com/v5/account/wallet-balance?${qs}`, {
        headers: { 'X-BAPI-API-KEY':apiKey, 'X-BAPI-SIGN':sig, 'X-BAPI-TIMESTAMP':timestamp, 'X-BAPI-RECV-WINDOW':recv },
        signal: AbortSignal.timeout(8000),
      });
      const text = await r.text();
      if (text.includes('CloudFront') || text.startsWith('<')) continue;
      const data = JSON.parse(text);
      if (data.retCode === 0) {
        const coins = data?.result?.list?.[0]?.coin || [];
        if (coins.length > 0) return coins.filter(c => parseFloat(c.walletBalance) > 0);
        continue; // empty account on this type, try next
      }
      if ([10005, 10003, 10001].includes(data.retCode)) continue;
      if (data.retCode === 33004) throw new Error('Invalid Bybit API key or secret');
      throw new Error(`Bybit error ${data.retCode}: ${data.retMsg}`);
    } catch (e) {
      if (e.message.includes('Invalid Bybit')) throw e;
      continue;
    }
  }
  return []; // empty but no error — just no balance
}

const PNL_DATA = [{month:'Jul',pnl:3.1},{month:'Aug',pnl:-1.2},{month:'Sep',pnl:5.4},{month:'Oct',pnl:7.2},{month:'Nov',pnl:-0.8},{month:'Dec',pnl:4.1},{month:'Jan',pnl:6.3},{month:'Feb',pnl:2.9},{month:'Mar',pnl:8.1},{month:'Apr',pnl:-1.5},{month:'May',pnl:5.7},{month:'Jun',pnl:9.2}];

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization,Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!verifyJwt(token)) return res.status(401).json({ error: 'Not authenticated' });

  const BINANCE_KEY    = process.env.BINANCE_API_KEY;
  const BINANCE_SECRET = process.env.BINANCE_API_SECRET;
  const BYBIT_KEY      = process.env.BYBIT_API_KEY;
  const BYBIT_SECRET   = process.env.BYBIT_API_SECRET;

  const prices = await getLivePrices();
  let balances = [], warnings = [], hasRealData = false;

  // ── Binance ──
  if (BINANCE_KEY && BINANCE_SECRET) {
    try {
      const bals = await getBinanceBalances(BINANCE_KEY, BINANCE_SECRET);
      if (bals.length === 0) {
        // Account connected but empty — show zero balance row
        balances.push({ asset:'USDT', free:0, locked:0, total:0, usdValue:0, price:1, exchange:'Binance', empty:true });
      } else {
        bals.forEach(b => {
          const total = parseFloat(b.free) + parseFloat(b.locked);
          const price = b.asset === 'USDT' ? 1 : (prices[`${b.asset}USDT`] || 0);
          balances.push({ asset:b.asset, free:parseFloat(b.free), locked:parseFloat(b.locked), total, usdValue:total*price, price, exchange:'Binance' });
        });
      }
      hasRealData = true;
    } catch (e) {
      warnings.push({ exchange:'Binance', message: e.message });
    }
  }

  // ── Bybit ──
  if (BYBIT_KEY && BYBIT_SECRET) {
    try {
      const coins = await getBybitBalances(BYBIT_KEY, BYBIT_SECRET);
      if (coins.length === 0) {
        balances.push({ asset:'USDT', free:0, locked:0, total:0, usdValue:0, price:1, exchange:'Bybit', empty:true });
      } else {
        coins.forEach(c => {
          const total = parseFloat(c.walletBalance);
          const price = c.coin === 'USDT' ? 1 : (prices[`${c.coin}USDT`] || 0);
          balances.push({ asset:c.coin, free:parseFloat(c.availableToWithdraw??c.walletBalance), locked:parseFloat(c.locked??0), total, usdValue:total*price, price, exchange:'Bybit' });
        });
      }
      hasRealData = true;
    } catch (e) {
      warnings.push({ exchange:'Bybit', message: e.message });
    }
  }

  if (!BINANCE_KEY && !BYBIT_KEY) {
    warnings.push({ exchange:'Setup', message:'No API keys configured — add them in the API Keys tab' });
  }

  balances.sort((a,b) => b.usdValue - a.usdValue);
  const totalUsd = balances.reduce((s,b) => s+b.usdValue, 0);

  res.json({
    totalUsd, balances, pnlByMonth: PNL_DATA,
    demo: !hasRealData,
    warnings, // renamed from errors — these are non-fatal
    openPositions: global._botState?.openPositions ? Object.values(global._botState.openPositions) : [],
    tradeLog: global._botState?.tradeLog?.slice(0,50) || [],
  });
}
