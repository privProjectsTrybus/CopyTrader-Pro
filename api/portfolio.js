import crypto from 'crypto';
import { verifyJwt } from './auth.js';

async function getLivePrices() {
  try {
    const r = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana,binancecoin,ripple,cardano,dogecoin,polkadot&vs_currencies=usd', { signal: AbortSignal.timeout(8000) });
    const d = await r.json();
    return { BTCUSDT:d.bitcoin?.usd, ETHUSDT:d.ethereum?.usd, SOLUSDT:d.solana?.usd, BNBUSDT:d.binancecoin?.usd, XRPUSDT:d.ripple?.usd, ADAUSDT:d.cardano?.usd, DOGEUSDT:d.dogecoin?.usd, DOTUSDT:d.polkadot?.usd };
  } catch { return {}; }
}

async function getBinanceBalances(apiKey, secret) {
  const timestamp = Date.now();
  const qs = `timestamp=${timestamp}&recvWindow=10000`;
  const sig = crypto.createHmac('sha256', secret).update(qs).digest('hex');
  for (const base of ['https://api.binance.com','https://api1.binance.com','https://api2.binance.com','https://api3.binance.com']) {
    try {
      const r = await fetch(`${base}/api/v3/account?${qs}&signature=${sig}`, {
        headers: { 'X-MBX-APIKEY': apiKey },
        signal: AbortSignal.timeout(8000),
      });
      const text = await r.text();
      if (text.startsWith('<') || text.includes('CloudFront')) continue;
      const data = JSON.parse(text);
      if (data.code === -2015) throw new Error('Invalid Binance API key');
      if (!r.ok) throw new Error(data.msg || `HTTP ${r.status}`);
      return (data.balances || []).filter(b => parseFloat(b.free) + parseFloat(b.locked) > 0);
    } catch (e) {
      if (e.message.includes('Invalid')) throw e;
      continue;
    }
  }
  throw new Error('Binance geo-blocked. Try disabling IP restriction on your API key.');
}

async function getBybitBalances(apiKey, secret) {
  for (const accountType of ['UNIFIED','CONTRACT','SPOT']) {
    const timestamp = Date.now().toString();
    const recv = '20000';
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
      }
      if ([10005,10003].includes(data.retCode)) continue;
      throw new Error(`Bybit: ${data.retMsg}`);
    } catch (e) {
      if (e.message.includes('Bybit:')) throw e;
      continue;
    }
  }
  return [];
}

const PNL_DATA = [{month:'Jul',pnl:3.1},{month:'Aug',pnl:-1.2},{month:'Sep',pnl:5.4},{month:'Oct',pnl:7.2},{month:'Nov',pnl:-0.8},{month:'Dec',pnl:4.1},{month:'Jan',pnl:6.3},{month:'Feb',pnl:2.9},{month:'Mar',pnl:8.1},{month:'Apr',pnl:-1.5},{month:'May',pnl:5.7},{month:'Jun',pnl:9.2}];

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization,Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // Verify auth
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!verifyJwt(token)) return res.status(401).json({ error: 'Not authenticated' });

  const BINANCE_KEY    = process.env.BINANCE_API_KEY;
  const BINANCE_SECRET = process.env.BINANCE_API_SECRET;
  const BYBIT_KEY      = process.env.BYBIT_API_KEY;
  const BYBIT_SECRET   = process.env.BYBIT_API_SECRET;

  const prices = await getLivePrices();
  let balances = [], errors = [], hasRealData = false;

  // Binance
  if (BINANCE_KEY && BINANCE_SECRET) {
    try {
      const bals = await getBinanceBalances(BINANCE_KEY, BINANCE_SECRET);
      bals.forEach(b => {
        const total = parseFloat(b.free) + parseFloat(b.locked);
        const price = b.asset === 'USDT' ? 1 : (prices[`${b.asset}USDT`] || 0);
        balances.push({ asset:b.asset, free:parseFloat(b.free), locked:parseFloat(b.locked), total, usdValue:total*price, price, exchange:'Binance' });
      });
      if (bals.length === 0) balances.push({ asset:'USDT', free:0, locked:0, total:0, usdValue:0, price:1, exchange:'Binance', empty:true });
      hasRealData = true;
    } catch (e) { errors.push(`Binance: ${e.message}`); }
  }

  // Bybit
  if (BYBIT_KEY && BYBIT_SECRET) {
    try {
      const coins = await getBybitBalances(BYBIT_KEY, BYBIT_SECRET);
      coins.forEach(c => {
        const total = parseFloat(c.walletBalance);
        const price = c.coin === 'USDT' ? 1 : (prices[`${c.coin}USDT`] || 0);
        balances.push({ asset:c.coin, free:parseFloat(c.availableToWithdraw??c.walletBalance), locked:parseFloat(c.locked??0), total, usdValue:total*price, price, exchange:'Bybit' });
      });
      if (coins.length === 0) balances.push({ asset:'USDT', free:0, locked:0, total:0, usdValue:0, price:1, exchange:'Bybit', empty:true });
      hasRealData = true;
    } catch (e) { errors.push(`Bybit: ${e.message}`); }
  }

  if (!BINANCE_KEY && !BYBIT_KEY) errors.push('No API keys configured — add them in Settings → API Keys');

  balances.sort((a,b) => b.usdValue - a.usdValue);
  const totalUsd = balances.reduce((s,b) => s+b.usdValue, 0);

  res.json({
    totalUsd, balances, pnlByMonth: PNL_DATA,
    demo: !hasRealData, errors,
    openPositions: global._botState?.openPositions ? Object.values(global._botState.openPositions) : [],
    tradeLog: global._botState?.tradeLog?.slice(0,50) || [],
  });
}
