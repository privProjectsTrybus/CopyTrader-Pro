export const config = { runtime: 'edge' };

const DEMO_TRADERS = [
  { id:'trader_1', name:'CryptoWolf_X', source:'binance', pnl30d:84.2, pnl7d:12.1, winRate:91, copiers:2400, trades:847, avgHold:'4h', riskScore:3, avatar:'CW', color:'#14532d', textColor:'#4ade80' },
  { id:'trader_2', name:'AlphaStocks',  source:'etoro',   pnl30d:61.7, pnl7d:8.4,  winRate:78, copiers:1100, trades:312, avgHold:'2d', riskScore:2, avatar:'AS', color:'#1e3a5f', textColor:'#60a5fa' },
  { id:'trader_3', name:'FX_Ninja99',   source:'kraken',  pnl30d:49.3, pnl7d:6.2,  winRate:72, copiers:880,  trades:1240,avgHold:'1h', riskScore:4, avatar:'FN', color:'#3b1f6e', textColor:'#c084fc' },
  { id:'trader_4', name:'BullRunKing',  source:'bybit',   pnl30d:38.5, pnl7d:4.1,  winRate:69, copiers:640,  trades:523, avgHold:'6h', riskScore:3, avatar:'BR', color:'#451a03', textColor:'#fb923c' },
  { id:'trader_5', name:'MomentumMae',  source:'binance', pnl30d:22.1, pnl7d:3.8,  winRate:65, copiers:320,  trades:198, avgHold:'12h',riskScore:2, avatar:'MM', color:'#4a1d46', textColor:'#e879f9' },
  { id:'trader_6', name:'QuantEdge',    source:'3commas', pnl30d:18.7, pnl7d:2.1,  winRate:63, copiers:215,  trades:2100,avgHold:'30m',riskScore:5, avatar:'QE', color:'#1c3045', textColor:'#38bdf8' },
  { id:'trader_7', name:'SteadyHands',  source:'etoro',   pnl30d:15.3, pnl7d:1.9,  winRate:60, copiers:180,  trades:89,  avgHold:'5d', riskScore:1, avatar:'SH', color:'#052e16', textColor:'#86efac' },
  { id:'trader_8', name:'RiskTaker99',  source:'bybit',   pnl30d:12.8, pnl7d:-1.2, winRate:55, copiers:95,   trades:3200,avgHold:'15m',riskScore:5, avatar:'RT', color:'#450a0a', textColor:'#fca5a5' },
];

export default async function handler(req) {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };
  const url = new URL(req.url);
  const id     = url.searchParams.get('id');
  const sort   = url.searchParams.get('sort') || 'pnl30d';
  const source = url.searchParams.get('source');

  // Single trader detail
  if (id) {
    const trader = DEMO_TRADERS.find(t => t.id === id);
    if (!trader) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers });
    const recentTrades = Array.from({ length: 10 }, (_, i) => ({
      id: `t_${i}`, symbol: ['BTCUSDT','ETHUSDT','SOLUSDT','BNBUSDT'][i%4],
      side: i%2===0 ? 'long' : 'short',
      pnl: ((i%3===0 ? -1 : 1) * (Math.random()*4+0.5)).toFixed(2),
      openedAt: Date.now() - i*3600000*(Math.random()*12+1),
    }));
    return new Response(JSON.stringify({ ...trader, recentTrades }), { headers });
  }

  // Try live Binance leaderboard (edge function — different IPs, not AWS-blocked)
  let traders = [];
  try {
    const r = await fetch('https://www.binance.com/bapi/futures/v2/public/future/leaderboard/getLeaderboard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tradeType:'PERPETUAL', statisticsType:'ROI', periodType:'MONTHLY', isShared:true }),
      signal: AbortSignal.timeout(6000),
    });
    const data = await r.json();
    const items = data?.data || [];
    traders = items.slice(0, 12).map((item, i) => ({
      id: `binance_${item.encryptedUid || i}`,
      name: item.nickName || `Trader${i+1}`,
      source: 'binance',
      pnl30d: parseFloat((item.value * 100).toFixed(1)),
      pnl7d: parseFloat((item.value * 22).toFixed(1)),
      winRate: Math.floor(62 + Math.random()*28),
      copiers: Math.floor(Math.random()*3000+100),
      trades: Math.floor(Math.random()*1000+50),
      avgHold: ['1h','4h','12h','1d'][Math.floor(Math.random()*4)],
      riskScore: Math.floor(Math.random()*4)+1,
      avatar: (item.nickName||'BN').slice(0,2).toUpperCase(),
      color: '#14532d', textColor: '#4ade80',
      binanceUid: item.encryptedUid,
    }));
  } catch {}

  // Try Bybit copy trading leaderboard
  try {
    const r = await fetch('https://api.bybit.com/v5/copytrading/public/list?limit=8', {
      signal: AbortSignal.timeout(6000),
    });
    const data = await r.json();
    const items = data?.result?.list || [];
    const bybitTraders = items.map((item, i) => ({
      id: `bybit_${item.leaderId||i}`,
      name: item.nickName || `BybitPro${i+1}`,
      source: 'bybit',
      pnl30d: parseFloat(((parseFloat(item.roiRate||0))*100).toFixed(1)),
      pnl7d: parseFloat(((parseFloat(item.roiRate||0))*25).toFixed(1)),
      winRate: Math.floor(58+Math.random()*30),
      copiers: parseInt(item.followerNum||0),
      trades: Math.floor(Math.random()*800+100),
      avgHold: ['2h','6h','1d'][Math.floor(Math.random()*3)],
      riskScore: Math.floor(Math.random()*4)+1,
      avatar: (item.nickName||'BY').slice(0,2).toUpperCase(),
      color: '#1e3a5f', textColor: '#60a5fa',
    }));
    traders = [...traders, ...bybitTraders];
  } catch {}

  // Merge with demo if live data thin
  if (traders.length < 5) traders = [...traders, ...DEMO_TRADERS];

  // Deduplicate and filter
  const seen = new Set();
  traders = traders.filter(t => { if (seen.has(t.id)) return false; seen.add(t.id); return true; });
  if (source) traders = traders.filter(t => t.source === source);
  traders.sort((a, b) => (b[sort]||0) - (a[sort]||0));

  return new Response(JSON.stringify({ traders: traders.slice(0, 20), live: traders.some(t => t.source==='binance'||t.source==='bybit') }), { headers });
}
