import { getEngine } from './_state.js';

const MONTHS = ['Jul','Aug','Sep','Oct','Nov','Dec','Jan','Feb','Mar','Apr','May','Jun'];
const PNL_VALS = [3.1,-1.2,5.4,7.2,-0.8,4.1,6.3,2.9,8.1,-1.5,5.7,9.2];

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const engine = getEngine();
  const binance = engine.binance;

  let account;
  try {
    account = binance.isConfigured ? await binance.getAccount() : binance.getDemoAccount();
  } catch {
    account = binance.getDemoAccount();
  }

  let prices = { BTCUSDT: 61240, ETHUSDT: 3180, SOLUSDT: 142, BNBUSDT: 398 };
  try {
    const symbols = account.balances.filter(b => parseFloat(b.free)>0 && b.asset!=='USDT').map(b=>`${b.asset}USDT`);
    if (symbols.length && binance.isConfigured) prices = await binance.getPrices(symbols);
  } catch {}

  const balances = account.balances
    .filter(b => parseFloat(b.free)+parseFloat(b.locked) > 0)
    .map(b => {
      const total = parseFloat(b.free)+parseFloat(b.locked);
      const price = b.asset==='USDT' ? 1 : (prices[`${b.asset}USDT`]||0);
      return { asset: b.asset, free: parseFloat(b.free), locked: parseFloat(b.locked), total, usdValue: total*price, price };
    }).sort((a,b) => b.usdValue-a.usdValue);

  const totalUsd = balances.reduce((s,b) => s+b.usdValue, 0);
  const pnlByMonth = MONTHS.map((month,i) => ({ month, pnl: PNL_VALS[i] }));

  res.json({
    totalUsd, balances,
    openPositions: Array.from(engine.openPositions.values()),
    tradeLog: engine.tradeLog.slice(0,50),
    pnlByMonth,
    totalPnl: engine.totalPnl,
    demo: account.demo||false,
  });
}
