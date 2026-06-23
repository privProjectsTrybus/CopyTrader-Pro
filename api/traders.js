import axios from 'axios';

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

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { id, sort = 'pnl30d', source } = req.query;

  if (id) {
    const trader = DEMO_TRADERS.find(t => t.id === id);
    if (!trader) return res.status(404).json({ error: 'Not found' });
    const history = Array.from({ length: 30 }, (_, i) => ({ day: i+1, pnl: (Math.random()-.35)*8 }));
    const recentTrades = Array.from({ length: 10 }, (_, i) => ({
      id: `t_${i}`, symbol: ['BTCUSDT','ETHUSDT','SOLUSDT','BNBUSDT'][i%4],
      side: Math.random()>.5?'long':'short',
      pnl: (Math.random()<trader.winRate/100 ? 1:-1) * (Math.random()*4+0.5).toFixed(2),
      openedAt: Date.now() - i*3600000*Math.random()*12,
    }));
    return res.json({ ...trader, history, recentTrades });
  }

  let traders = [...DEMO_TRADERS];
  if (source) traders = traders.filter(t => t.source === source);
  traders.sort((a, b) => b[sort] - a[sort]);
  res.json({ traders, live: false });
}
