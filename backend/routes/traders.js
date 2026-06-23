import express from 'express';
import axios from 'axios';

export const traderRouter = express.Router();

// Demo trader data (used when live APIs are unavailable)
const DEMO_TRADERS = [
  { id: 'trader_1', name: 'CryptoWolf_X', source: 'binance', pnl30d: 84.2, pnl7d: 12.1, winRate: 91, copiers: 2400, trades: 847, avgHold: '4h', riskScore: 3, avatar: 'CW', color: '#14532d', textColor: '#4ade80' },
  { id: 'trader_2', name: 'AlphaStocks',  source: 'etoro',   pnl30d: 61.7, pnl7d: 8.4,  winRate: 78, copiers: 1100, trades: 312, avgHold: '2d', riskScore: 2, avatar: 'AS', color: '#1e3a5f', textColor: '#60a5fa' },
  { id: 'trader_3', name: 'FX_Ninja99',   source: 'kraken',  pnl30d: 49.3, pnl7d: 6.2,  winRate: 72, copiers: 880,  trades: 1240, avgHold: '1h', riskScore: 4, avatar: 'FN', color: '#3b1f6e', textColor: '#c084fc' },
  { id: 'trader_4', name: 'BullRunKing',  source: 'bybit',   pnl30d: 38.5, pnl7d: 4.1,  winRate: 69, copiers: 640,  trades: 523, avgHold: '6h', riskScore: 3, avatar: 'BR', color: '#451a03', textColor: '#fb923c' },
  { id: 'trader_5', name: 'MomentumMae',  source: 'binance', pnl30d: 22.1, pnl7d: 3.8,  winRate: 65, copiers: 320,  trades: 198, avgHold: '12h', riskScore: 2, avatar: 'MM', color: '#4a1d46', textColor: '#e879f9' },
  { id: 'trader_6', name: 'QuantEdge',    source: '3commas', pnl30d: 18.7, pnl7d: 2.1,  winRate: 63, copiers: 215,  trades: 2100, avgHold: '30m', riskScore: 5, avatar: 'QE', color: '#1c3045', textColor: '#38bdf8' },
  { id: 'trader_7', name: 'SteadyHands',  source: 'etoro',   pnl30d: 15.3, pnl7d: 1.9,  winRate: 60, copiers: 180,  trades: 89,  avgHold: '5d', riskScore: 1, avatar: 'SH', color: '#052e16', textColor: '#86efac' },
  { id: 'trader_8', name: 'RiskTaker99',  source: 'bybit',   pnl30d: 12.8, pnl7d: -1.2, winRate: 55, copiers: 95,   trades: 3200, avgHold: '15m', riskScore: 5, avatar: 'RT', color: '#450a0a', textColor: '#fca5a5' },
];

// GET /api/traders - list all top traders
traderRouter.get('/', async (req, res) => {
  const { source, sort = 'pnl30d', minWinRate } = req.query;

  let traders = [...DEMO_TRADERS];

  // Try to fetch live Binance leaderboard
  try {
    const live = await fetchBinanceLeaderboard();
    if (live.length > 0) {
      traders = [...live, ...traders].slice(0, 20);
    }
  } catch {
    // Fall back to demo data
  }

  if (source) traders = traders.filter(t => t.source === source);
  if (minWinRate) traders = traders.filter(t => t.winRate >= parseInt(minWinRate));

  traders.sort((a, b) => {
    if (sort === 'pnl30d') return b.pnl30d - a.pnl30d;
    if (sort === 'winRate') return b.winRate - a.winRate;
    if (sort === 'copiers') return b.copiers - a.copiers;
    return 0;
  });

  res.json({ traders, live: false });
});

// GET /api/traders/:id - trader detail + recent trades
traderRouter.get('/:id', (req, res) => {
  const trader = DEMO_TRADERS.find(t => t.id === req.params.id);
  if (!trader) return res.status(404).json({ error: 'Trader not found' });

  // Generate mock performance history
  const history = Array.from({ length: 30 }, (_, i) => ({
    day: i + 1,
    pnl: (Math.random() - 0.35) * 8,
    trades: Math.floor(Math.random() * 15) + 1,
  }));

  const recentTrades = Array.from({ length: 10 }, (_, i) => {
    const pairs = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT'];
    const pair = pairs[i % pairs.length];
    const won = Math.random() < trader.winRate / 100;
    return {
      id: `t_${i}`,
      symbol: pair,
      side: Math.random() > 0.5 ? 'long' : 'short',
      pnl: won ? (Math.random() * 5 + 0.5).toFixed(2) : -(Math.random() * 3 + 0.2).toFixed(2),
      openedAt: Date.now() - i * 3600000 * (Math.random() * 12 + 1),
    };
  });

  res.json({ ...trader, history, recentTrades });
});

async function fetchBinanceLeaderboard() {
  const res = await axios.post(
    'https://www.binance.com/bapi/futures/v2/public/future/leaderboard/getLeaderboard',
    { tradeType: 'PERPETUAL', statisticsType: 'ROI', periodType: 'MONTHLY', isShared: true, isTrader: false },
    { timeout: 5000 }
  );
  const items = res.data?.data || [];
  return items.slice(0, 10).map((item, i) => ({
    id: `binance_${item.encryptedUid || i}`,
    name: item.nickName || `Trader${i + 1}`,
    source: 'binance',
    pnl30d: parseFloat((item.value * 100).toFixed(1)),
    pnl7d: parseFloat((item.value * 25).toFixed(1)),
    winRate: Math.floor(60 + Math.random() * 30),
    copiers: Math.floor(Math.random() * 3000),
    trades: Math.floor(Math.random() * 1000),
    avgHold: '4h',
    riskScore: Math.floor(Math.random() * 5) + 1,
    avatar: (item.nickName || 'TR').slice(0, 2).toUpperCase(),
    color: '#14532d',
    textColor: '#4ade80',
    binanceUid: item.encryptedUid,
  }));
}
