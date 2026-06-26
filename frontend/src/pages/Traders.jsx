import { useEffect, useState } from 'react';

const DEMO_TRADERS = [
  { id:'t1', name:'CryptoWolf_X', source:'Binance', pnl30d:84.2, pnl7d:12.1, winRate:91, copiers:2400, trades:847,  avgHold:'4h',  riskScore:3, avatar:'CW', color:'#14532d', textColor:'#4ade80' },
  { id:'t2', name:'AlphaStocks',  source:'eToro',   pnl30d:61.7, pnl7d:8.4,  winRate:78, copiers:1100, trades:312,  avgHold:'2d',  riskScore:2, avatar:'AS', color:'#1e3a5f', textColor:'#60a5fa' },
  { id:'t3', name:'FX_Ninja99',   source:'Kraken',  pnl30d:49.3, pnl7d:6.2,  winRate:72, copiers:880,  trades:1240, avgHold:'1h',  riskScore:4, avatar:'FN', color:'#3b1f6e', textColor:'#c084fc' },
  { id:'t4', name:'BullRunKing',  source:'Bybit',   pnl30d:38.5, pnl7d:4.1,  winRate:69, copiers:640,  trades:523,  avgHold:'6h',  riskScore:3, avatar:'BR', color:'#451a03', textColor:'#fb923c' },
  { id:'t5', name:'MomentumMae',  source:'Binance', pnl30d:22.1, pnl7d:3.8,  winRate:65, copiers:320,  trades:198,  avgHold:'12h', riskScore:2, avatar:'MM', color:'#4a1d46', textColor:'#e879f9' },
  { id:'t6', name:'QuantEdge',    source:'3Commas', pnl30d:18.7, pnl7d:2.1,  winRate:63, copiers:215,  trades:2100, avgHold:'30m', riskScore:5, avatar:'QE', color:'#1c3045', textColor:'#38bdf8' },
  { id:'t7', name:'SteadyHands',  source:'eToro',   pnl30d:15.3, pnl7d:1.9,  winRate:60, copiers:180,  trades:89,   avgHold:'5d',  riskScore:1, avatar:'SH', color:'#052e16', textColor:'#86efac' },
  { id:'t8', name:'RiskTaker99',  source:'Bybit',   pnl30d:12.8, pnl7d:-1.2, winRate:55, copiers:95,   trades:3200, avgHold:'15m', riskScore:5, avatar:'RT', color:'#450a0a', textColor:'#fca5a5' },
  { id:'t9', name:'TrendRider',   source:'Binance', pnl30d:71.4, pnl7d:9.8,  winRate:83, copiers:1850, trades:654,  avgHold:'3h',  riskScore:2, avatar:'TR', color:'#1a2e1a', textColor:'#86efac' },
  { id:'t10',name:'NightTrader',  source:'Bybit',   pnl30d:55.9, pnl7d:7.3,  winRate:76, copiers:920,  trades:441,  avgHold:'8h',  riskScore:3, avatar:'NT', color:'#1e1e3a', textColor:'#a78bfa' },
  { id:'t11',name:'ScalpKing',    source:'Binance', pnl30d:44.1, pnl7d:5.6,  winRate:71, copiers:740,  trades:4200, avgHold:'10m', riskScore:5, avatar:'SK', color:'#1a1500', textColor:'#fcd34d' },
  { id:'t12',name:'SwingMaster',  source:'Kraken',  pnl30d:31.2, pnl7d:3.1,  winRate:67, copiers:410,  trades:187,  avgHold:'3d',  riskScore:2, avatar:'SM', color:'#0f2027', textColor:'#67e8f9' },
];

const SORTS  = [{ val:'pnl30d',label:'30d P&L'}, {val:'winRate',label:'Win Rate'}, {val:'copiers',label:'Copiers'}];
const SOURCES = ['All','Binance','Bybit','eToro','Kraken','3Commas'];

export default function Traders() {
  const [copying, setCopying]   = useState(new Set());
  const [sort, setSort]         = useState('pnl30d');
  const [source, setSource]     = useState('All');
  const [selected, setSelected] = useState(null);
  const [search, setSearch]     = useState('');

  let traders = [...DEMO_TRADERS];
  if (source !== 'All') traders = traders.filter(t => t.source === source);
  if (search) traders = traders.filter(t => t.name.toLowerCase().includes(search.toLowerCase()));
  traders.sort((a,b) => (b[sort]||0) - (a[sort]||0));

  const toggleCopy = (e, trader) => {
    e.stopPropagation();
    setCopying(prev => {
      const n = new Set(prev);
      n.has(trader.id) ? n.delete(trader.id) : n.add(trader.id);
      return n;
    });
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
      {/* Filters */}
      <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
        <input
          placeholder="Search traders…"
          value={search} onChange={e => setSearch(e.target.value)}
          style={{ background:'var(--color-background-secondary)', border:'0.5px solid var(--color-border-secondary)', color:'var(--color-text-primary)', padding:'6px 12px', borderRadius:'var(--border-radius-md)', fontSize:13, width:180 }}
        />
        <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
          {SOURCES.map(s => <button key={s} onClick={() => setSource(s)} style={{ ...chip, ...(source===s ? chipActive : {}) }}>{s}</button>)}
        </div>
        <div style={{ marginLeft:'auto', display:'flex', gap:6 }}>
          {SORTS.map(s => <button key={s.val} onClick={() => setSort(s.val)} style={{ ...chip, ...(sort===s.val ? chipActive : {}) }}>{s.label}</button>)}
        </div>
      </div>

      {/* Copying banner */}
      {copying.size > 0 && (
        <div style={{ background:'#14532d', border:'0.5px solid #166534', borderRadius:'var(--border-radius-md)', padding:'10px 14px', fontSize:13, color:'#4ade80', display:'flex', alignItems:'center', gap:8 }}>
          🤖 Copying {copying.size} trader{copying.size>1?'s':''}: {[...copying].map(id => DEMO_TRADERS.find(t=>t.id===id)?.name).join(', ')}
        </div>
      )}

      {/* Grid */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))', gap:12 }}>
        {traders.map((t, i) => (
          <div key={t.id} onClick={() => setSelected(t)} style={{ ...card, cursor:'pointer', border: copying.has(t.id) ? '1px solid #4ade80' : '0.5px solid var(--color-border-tertiary)' }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
              <div style={{ background:'var(--color-background-primary)', borderRadius:6, padding:'3px 6px', fontSize:11, color:'var(--color-text-tertiary)', fontWeight:600 }}>#{i+1}</div>
              <div style={{ width:38, height:38, borderRadius:'50%', background:t.color, color:t.textColor, display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:600 }}>{t.avatar}</div>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:600, fontSize:14 }}>{t.name}</div>
                <div style={{ fontSize:11, color:'var(--color-text-tertiary)' }}>{t.source} · {t.copiers.toLocaleString()} copiers</div>
              </div>
              <div style={{ fontSize:22, fontWeight:700, color:'#4ade80' }}>+{t.pnl30d}%</div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:8, marginBottom:12 }}>
              {[{l:'Win rate',v:`${t.winRate}%`},{l:'7d P&L',v:`+${t.pnl7d}%`},{l:'Avg hold',v:t.avgHold}].map(s => (
                <div key={s.l} style={{ background:'var(--color-background-primary)', borderRadius:6, padding:'6px 8px' }}>
                  <div style={{ fontSize:10, color:'var(--color-text-tertiary)', marginBottom:2 }}>{s.l}</div>
                  <div style={{ fontSize:13, fontWeight:500 }}>{s.v}</div>
                </div>
              ))}
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <RiskBadge score={t.riskScore} />
              <button onClick={e => toggleCopy(e, t)} style={{
                marginLeft:'auto', fontSize:12, padding:'5px 14px', borderRadius:20, border:'0.5px solid', cursor:'pointer', fontWeight:500,
                background: copying.has(t.id) ? '#14532d' : 'transparent',
                color: copying.has(t.id) ? '#4ade80' : 'var(--color-text-secondary)',
                borderColor: copying.has(t.id) ? '#166534' : 'var(--color-border-secondary)',
              }}>
                {copying.has(t.id) ? '✓ Copying' : 'Copy trader'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {selected && <TraderModal trader={selected} copying={copying.has(selected.id)} onCopy={e => toggleCopy(e, selected)} onClose={() => setSelected(null)} />}
    </div>
  );
}

function RiskBadge({ score }) {
  const map = [null,['#052e16','#86efac','Very Low'],['#14532d','#4ade80','Low'],['#854d0e','#fde047','Medium'],['#9a3412','#fdba74','High'],['#450a0a','#fca5a5','Very High']];
  const [bg,color,label] = map[score]||map[3];
  return <span style={{ fontSize:10, padding:'2px 8px', borderRadius:4, background:bg, color, fontWeight:500 }}>Risk: {label}</span>;
}

function TraderModal({ trader, copying, onCopy, onClose }) {
  const recentTrades = Array.from({length:8},(_,i)=>({ id:i, symbol:['BTCUSDT','ETHUSDT','SOLUSDT','BNBUSDT'][i%4], side:i%2===0?'long':'short', pnl:((i%3===0?-1:1)*(Math.random()*4+0.5)).toFixed(2) }));
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:100 }} onClick={onClose}>
      <div style={{ ...card, width:500, maxHeight:'80vh', overflowY:'auto', position:'relative' }} onClick={e=>e.stopPropagation()}>
        <button onClick={onClose} style={{ position:'absolute', top:12, right:12, background:'none', border:'none', cursor:'pointer', color:'var(--color-text-secondary)', fontSize:20 }}>✕</button>
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16 }}>
          <div style={{ width:50, height:50, borderRadius:'50%', background:trader.color, color:trader.textColor, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, fontWeight:600 }}>{trader.avatar}</div>
          <div>
            <div style={{ fontWeight:600, fontSize:16 }}>{trader.name}</div>
            <div style={{ fontSize:12, color:'var(--color-text-tertiary)' }}>{trader.source} · {trader.copiers.toLocaleString()} copiers · {trader.trades.toLocaleString()} trades</div>
          </div>
          <button onClick={onCopy} style={{ marginLeft:'auto', fontSize:13, padding:'8px 20px', borderRadius:20, border:'0.5px solid', cursor:'pointer', fontWeight:500, background:copying?'#14532d':'transparent', color:copying?'#4ade80':'var(--color-text-primary)', borderColor:copying?'#166534':'var(--color-border-secondary)' }}>
            {copying ? '✓ Copying' : 'Start copying'}
          </button>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, marginBottom:16 }}>
          {[{l:'30d P&L',v:`+${trader.pnl30d}%`,c:'#4ade80'},{l:'Win rate',v:`${trader.winRate}%`},{l:'Trades',v:trader.trades.toLocaleString()},{l:'Avg hold',v:trader.avgHold}].map(s=>(
            <div key={s.l} style={{ background:'var(--color-background-primary)', borderRadius:6, padding:'8px 10px' }}>
              <div style={{ fontSize:10, color:'var(--color-text-tertiary)', marginBottom:3 }}>{s.l}</div>
              <div style={{ fontSize:14, fontWeight:600, color:s.c||'var(--color-text-primary)' }}>{s.v}</div>
            </div>
          ))}
        </div>
        <div style={{ fontSize:12, fontWeight:500, color:'var(--color-text-secondary)', marginBottom:8 }}>Recent trades</div>
        {recentTrades.map((t,i) => (
          <div key={i} style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 0', borderBottom:'0.5px solid var(--color-border-tertiary)', fontSize:12 }}>
            <span style={{ fontWeight:500, width:80 }}>{t.symbol}</span>
            <span style={{ fontSize:10, padding:'2px 6px', borderRadius:4, background:t.side==='long'?'#14532d':'#450a0a', color:t.side==='long'?'#4ade80':'#f87171' }}>{t.side}</span>
            <span style={{ marginLeft:'auto', color:parseFloat(t.pnl)>=0?'#4ade80':'#f87171', fontWeight:600 }}>{parseFloat(t.pnl)>=0?'+':''}{t.pnl}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const card = { background:'var(--color-background-secondary)', borderRadius:'var(--border-radius-lg)', border:'0.5px solid var(--color-border-tertiary)', padding:'1.25rem' };
const chip = { display:'inline-flex', background:'var(--color-background-secondary)', border:'0.5px solid var(--color-border-secondary)', borderRadius:20, padding:'4px 12px', fontSize:12, color:'var(--color-text-secondary)', cursor:'pointer' };
const chipActive = { borderColor:'#4ade80', color:'#4ade80', background:'#14532d' };
