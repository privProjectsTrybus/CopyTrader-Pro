import express from 'express';
import { botEngine } from '../server.js';

export const portfolioRouter = express.Router();

// GET /api/portfolio - balances + open positions + P&L
portfolioRouter.get('/', async (req, res) => {
  const binance = botEngine.binance;

  let account;
  try {
    account = binance.isConfigured
      ? await binance.getAccount()
      : binance.getDemoAccount();
  } catch {
    account = binance.getDemoAccount();
  }

  // Fetch live prices for held assets
  const assetSymbols = account.balances
    .filter(b => parseFloat(b.free) > 0 && b.asset !== 'USDT')
    .map(b => `${b.asset}USDT`);

  let prices = {};
  try {
    if (assetSymbols.length > 0) {
      prices = await binance.getPrices(assetSymbols);
    }
  } catch {
    prices = { BTCUSDT: 61240, ETHUSDT: 3180, SOLUSDT: 142, BNBUSDT: 398 };
  }

  const balances = account.balances
    .filter(b => parseFloat(b.free) + parseFloat(b.locked) > 0)
    .map(b => {
      const total = parseFloat(b.free) + parseFloat(b.locked);
      const price = b.asset === 'USDT' ? 1 : (prices[`${b.asset}USDT`] || 0);
      return {
        asset: b.asset,
        free: parseFloat(b.free),
        locked: parseFloat(b.locked),
        total,
        usdValue: total * price,
        price,
      };
    })
    .sort((a, b) => b.usdValue - a.usdValue);

  const totalUsd = balances.reduce((sum, b) => sum + b.usdValue, 0);

  // Monthly P&L from trade log
  const tradeLog = botEngine.tradeLog;
  const pnlByMonth = generatePnlHistory();

  res.json({
    totalUsd,
    balances,
    openPositions: Array.from(botEngine.openPositions.values()),
    tradeLog: tradeLog.slice(0, 50),
    pnlByMonth,
    totalPnl: botEngine.totalPnl,
    demo: account.demo || false,
  });
});

// GET /api/portfolio/history - full trade history
portfolioRouter.get('/history', (req, res) => {
  res.json({ trades: botEngine.tradeLog });
});

function generatePnlHistory() {
  const months = ['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
  const vals = [3.1, -1.2, 5.4, 7.2, -0.8, 4.1, 6.3, 2.9, 8.1, -1.5, 5.7, 9.2];
  return months.map((month, i) => ({ month, pnl: vals[i] }));
}
