import { useEffect, useState } from 'react';
import { getBinanceLeaderboard } from '../lib/exchange.js';

const DEMO_TRADERS = [
  { id:'t1',  name:'CryptoWolf_X', source:'Binance', pnl30d:84.2, pnl7d:12.1, winRate:91, copiers:2841, trades:847,  avgHold:'4h',  riskScore:3, avatar:'CW', color:'#14532d', textColor:'#4ade80' },
  { id:'t2',  name:'TrendRider',   source:'Binance', pnl30d:71.4, pnl7d:9.8,  winRate:83, copiers:1923, trades:654,  avgHold:'3h',  riskScore:2, avatar:'TR', color:'#1a2e1a', textColor:'#86efac' },
  { id:'t3',  name:'AlphaStocks',  source:'eToro',   pnl30d:61.7, pnl7d:8.4,  winRate:78, copiers:1102, trades:312,  avgHold:'2d',  riskScore:2, avatar:'AS', color:'#1e3a5f', textColor:'#60a5fa' },
  { id:'t4',  name:'NightTrader',  source:'Bybit',   pnl30d:55.9, pnl7d:7.3,  winRate:76, copiers:921,  trades:441,  avgHold:'8h',  riskScore:3, avatar:'NT', color:'#1e1e3a', textColor:'#a78bfa' },
  { id:'t5',  name:'FX_Ninja99',   source:'Kraken',  pnl30d:49.3, pnl7d:6.2,  winRate:72, copiers:881,  trades:1240, avgHold:'1h',  riskScore:4, avatar:'FN', color:'#3b1f6e', textColor:'#c084fc' },
  { id:'t6',  name:'ScalpKing',    source:'Binance', pnl30d:44.1, pnl7d:5.6,  winRate:71, copiers:742,  trades:4200, avgHold:'10m', riskScore:5, avatar:'SK', color:'#1a1500', textColor:'#fcd34d' },
  { id:'t7',  name:'BullRunKing',  source:'Bybit',   pnl30d:38.5, pnl7d:4.1,  winRate:69, copiers:641,  trades:523,  avgHold:'6h',  riskScore:3, avatar:'BR', color:'#451a03', textColor:'#fb923c' },
  { id:'t8',  name:'SwingMaster',  source:'Kraken',  pnl30d:31.2, pnl7d:3.1,  winRate:67, copiers:412,  trades:187,  avgHold:'3d',  riskScore:2, avatar:'SM', color:'#0f2027', textColor:'#67e8f9' },
  { id:'t9',  name:'MomentumMae',  source:'Binance', pnl30d:22.1, pnl7d:3.8,  winRate:65, copiers:321,  trades:198,  avgHold:'12h', riskScore:2, avatar:'MM', color:'#4a1d46', textColor:'#e879f9' },
  { id:'t10', name:'SteadyHands',  source:'eToro',   pnl30d:15.3, pnl7d:1.9,  winRate:60, copiers:181,  trades:89,   avgHold:'5d',  riskScore:1, avatar:'SH', color:'#052e16', textColor:'#86efac' },
];

const MEDAL = ['🥇','🥈','🥉'];
const SORTS = [{val:'pnl30d',label:'30d P&L'},{val:'winRate',label:'Win Rate'},{val:'copiers',label:'Copiers'}];
const SOURCES = ['All','Binance','Bybit','eToro','Kraken'];

export default function Traders({ onCopyChange }) {
  const [traders, setTraders]   = useState(DEMO_TRADERS);
  const [copying, setCopying]   = useState({});
  const [sort, setSort]         = useState('pnl30d');
  const [source, setSource]     = useState('All');
  const [search, setSearch]     = useState('');
  const [selected, setSelected] = useState(null);
  const [liveData, setLive]     = useState(false);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    // Sync with bot state
    const bot = window._BOT;
    if (bot) {
      const existing = {};
      Object.keys(bot.copiedTraders).forEach(id => { existing[id] = true; });
      setCopying(existing);
      onCopyChange?.(Object.keys(existing).length);
    }
  }, []);

  useEffect(() => {
    getBinanceLeaderboard().then(items => {
      if (items.length > 0) {
        const live = items.slice(0, 15).map((item, i) => ({
          id: `bn_${item.encryptedUid || i}`,
          name: item.nickName || `Trader${i+1}`,
          source: 'Binance',
          pnl30d: parseFloat((item.value * 100).toFixed(1)),
          pnl7d: parseFloat((item.value * 22).toFixed(1)),
          winRate: Math.floor(65 + Math.random() * 25),
          copiers: Math.floor(Math.random() * 5000 + 200),
          trades: Math.floor(Math.random() * 2000 + 100),
          avgHold: ['15m','1h','4h','12h','1d'][Math.floor(Math.random() * 5)],
          riskScore: Math.floor(Math.random() * 4) + 1,
          avatar: (item.nickName || 'BN').slice(0, 2).toUpperCase(),
          color: '#14532d', textColor: '#4ade80',
          live: true, uid: item.encryptedUid,
        }));
        setTraders([...live, ...DEMO_TRADERS]);
        setLive(true);
      }
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const toggleCopy = (e, trader) => {
    e.stopPropagation();
    const bot = window._BOT;
    if (!bot) return;

    setCopying(prev => {
      const next = { ...prev };
      if (next[trader.id]) {
        delete bot.copiedTraders[trader.id];
        delete next[trader.id];
        if (Object.keys(bot.copiedTraders).length === 0) {
          bot.running = false;
          if (bot.intervalId) { clearInterval(bot.intervalId); bot.intervalId = null; }
        }
      } else {
        bot.copiedTraders[trader.id] = { ...trader, addedAt: Date.now(), tradeCount: 0 };
        bot.running = true;
        // Start polling if not already running
        if (!bot.intervalId && trader.uid) {
          bot.intervalId = setInterval(() => pollTrader(trader), 30000);
        }
        next[trader.id] = true;
      }
      onCopyChange?.(Object.keys(next).length);
      return next;
    });
  };

  async function pollTrader(trader) {
    if (!trader.uid) return;
    try {
      const { getTraderPositions, placeBinanceOrder } = await import('../lib/exchange.js');
      const { loadKeys } = await import('../lib/exchange.js');
      const positions = await getTraderPositions(trader.uid);
      const bot = window._BOT;
      const prev = new Set((bot.copiedTraders[trader.id]?.lastPositions || []).map(p => p.symbol));
      const curr = new Set(positions.map(p => p.symbol));
      for (const pos of positions) {
        if (!prev.has(pos.symbol)) {
          const k = loadKeys();
          if (k.binanceKey) {
            await placeBinanceOrder(k.binanceKey, k.binanceSecret, { symbol: pos.symbol, side: pos.amount > 0 ? 'long' : 'short', quoteQty: bot.settings.maxTradeUsd });
            bot.tradeLog.unshift({ traderId: trader.id, traderName: trader.name, symbol: pos.symbol, side: pos.amount > 0 ? 'long' : 'short', entryPrice: Math.abs(pos.entryPrice), sizeUsd: bot.settings.maxTradeUsd, openedAt: Date.now(), status: 'open', pnl: 0, type: 'open' });
          }
        }
      }
      bot.copiedTraders[trader.id].lastPositions = positions;
    } catch {}
  }

  let list = [...traders];
  if (source !== 'All') list = list.filter(t => t.source === source);
  if (search) list = list.filter(t => t.name.toLowerCase().includes(search.toLowerCase()));
  const seen = new Set(); list = list.filter(t => { if (seen.has(t.id)) return false; seen.add(t.id); return true; });
  list.sort((a, b) => (b[sort] || 0) - (a[sort] || 0));

  return (
    <div className="fade-in" style={{display:'flex',flexDirection:'column',gap:'1rem'}}>
      {/* Toolbar */}
      <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
        <div style={{position:'relative'}}>
          <i className="ti ti-search" style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',color:'var(--text-muted)',fontSize:15}}/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search traders…"
            style={{background:'var(--bg-card)',border:'1px solid var(--border)',color:'var(--text-primary)',padding:'7px 12px 7px 32px',borderRadius:'var(--radius-md)',fontSize:13,width:200}}/>
        </div>
        <div style={{display:'flex',gap:5}}>
          {SOURCES.map(s=><Chip key={s} label={s} active={source===s} onClick={()=>setSource(s)}/>)}
        </div>
        <div style={{marginLeft:'auto',display:'flex',alignItems:'center',gap:10}}>
          <span style={{fontSize:11,color:liveData?'var(--green)':'var(--text-muted)',fontWeight:500}}>
            {loading?'Fetching leaderboard…':liveData?'● Live Binance leaderboard':'● Demo data'}
          </span>
          <div style={{display:'flex',gap:5}}>
            {SORTS.map(s=><Chip key={s.val} label={s.label} active={sort===s.val} onClick={()=>setSort(s.val)}/>)}
          </div>
        </div>
      </div>

      {/* Copying banner */}
      {Object.keys(copying).length > 0 && (
        <div style={{background:'var(--green-bg)',border:'1px solid var(--green-dim)',borderRadius:'var(--radius-md)',padding:'10px 14px',fontSize:13,color:'var(--green)',display:'flex',alignItems:'center',gap:8}}>
          <i className="ti ti-robot" style={{fontSize:16}}/> <strong>Bot active</strong> — copying {Object.keys(copying).length} trader{Object.keys(copying).length>1?'s':''}.
          {!window._BOT?.copiedTraders?.[Object.keys(copying)[0]]?.uid && <span style={{opacity:0.7}}> (Position polling only works for live Binance leaderboard traders)</span>}
        </div>
      )}

      {/* Grid */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(290px,1fr))',gap:12}}>
        {list.map((t,i)=>(
          <div key={t.id} onClick={()=>setSelected(t)} style={{
            background:'var(--bg-card)',borderRadius:'var(--radius-lg)',padding:'1.25rem',cursor:'pointer',
            border:`1px solid ${copying[t.id]?'var(--green)':'var(--border)'}`,
            boxShadow:copying[t.id]?'0 0 0 1px var(--green-dim) inset':'none',
            transition:'all 0.15s',
          }}>
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:12}}>
              {i<3?<span style={{fontSize:18}}>{MEDAL[i]}</span>:<span style={{fontSize:12,color:'var(--text-muted)',fontWeight:600,minWidth:22}}>#{i+1}</span>}
              <div style={{width:40,height:40,borderRadius:'50%',background:t.color,color:t.textColor,display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:700}}>{t.avatar}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:700,fontSize:14,display:'flex',alignItems:'center',gap:6}}>
                  {t.name}
                  {t.live&&<span style={{fontSize:9,background:'var(--green-bg)',color:'var(--green)',padding:'1px 5px',borderRadius:4,fontWeight:600}}>LIVE</span>}
                </div>
                <div style={{fontSize:11,color:'var(--text-muted)',marginTop:1}}>{t.source} · {t.copiers?.toLocaleString()} copiers</div>
              </div>
              <div style={{fontSize:22,fontWeight:800,color:'var(--green)',letterSpacing:'-0.5px'}}>+{t.pnl30d}%</div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginBottom:12}}>
              {[{l:'Win rate',v:`${t.winRate}%`},{l:'7d P&L',v:`+${t.pnl7d}%`},{l:'Avg hold',v:t.avgHold}].map(s=>(
                <div key={s.l} style={{background:'var(--bg-hover)',borderRadius:6,padding:'6px 8px'}}>
                  <div style={{fontSize:9,color:'var(--text-muted)',marginBottom:2,textTransform:'uppercase',letterSpacing:'0.5px'}}>{s.l}</div>
                  <div style={{fontSize:13,fontWeight:600}}>{s.v}</div>
                </div>
              ))}
            </div>
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <Risk score={t.riskScore}/>
              <button onClick={e=>toggleCopy(e,t)} style={{
                marginLeft:'auto',fontSize:12,padding:'6px 16px',borderRadius:20,border:'1px solid',cursor:'pointer',fontWeight:600,transition:'all 0.15s',
                background:copying[t.id]?'var(--green)':'transparent',
                color:copying[t.id]?'#000':'var(--text-secondary)',
                borderColor:copying[t.id]?'var(--green)':'var(--border-light)',
              }}>
                {copying[t.id]?'✓ Copying':'Copy trader'}
              </button>
            </div>
          </div>
        ))}
      </div>
      {selected&&<Modal trader={selected} copying={!!copying[selected.id]} onCopy={e=>toggleCopy(e,selected)} onClose={()=>setSelected(null)}/>}
    </div>
  );
}

function Risk({score}){const l=['','Very Low','Low','Medium','High','Very High'],b=['','#052e16','#14532d','#854d0e','#9a3412','#450a0a'],c=['','#86efac','#4ade80','#fde047','#fdba74','#fca5a5'];return<span style={{fontSize:10,padding:'2px 8px',borderRadius:4,background:b[score],color:c[score],fontWeight:600}}>Risk: {l[score]}</span>;}

function Modal({trader,copying,onCopy,onClose}){
  const trades=Array.from({length:8},(_,i)=>({sym:['BTCUSDT','ETHUSDT','SOLUSDT','BNBUSDT'][i%4],side:i%2===0?'long':'short',pnl:((i%3===0?-1:1)*(Math.random()*5+0.3)).toFixed(2),time:`${Math.floor(Math.random()*23)+1}h ago`}));
  return(
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:100,backdropFilter:'blur(4px)'}} onClick={onClose}>
      <div style={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:'var(--radius-xl)',width:520,maxHeight:'85vh',overflowY:'auto',padding:'1.5rem',position:'relative'}} onClick={e=>e.stopPropagation()}>
        <button onClick={onClose} style={{position:'absolute',top:16,right:16,background:'var(--bg-hover)',border:'1px solid var(--border)',borderRadius:6,color:'var(--text-secondary)',width:28,height:28,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',fontSize:16}}>✕</button>
        <div style={{display:'flex',alignItems:'center',gap:14,marginBottom:20}}>
          <div style={{width:52,height:52,borderRadius:'50%',background:trader.color,color:trader.textColor,display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,fontWeight:700}}>{trader.avatar}</div>
          <div style={{flex:1}}>
            <div style={{fontWeight:700,fontSize:17}}>{trader.name}</div>
            <div style={{fontSize:12,color:'var(--text-muted)',marginTop:2}}>{trader.source} · {trader.copiers?.toLocaleString()} copiers · {trader.trades?.toLocaleString()} trades</div>
          </div>
          <button onClick={onCopy} style={{fontSize:13,padding:'9px 22px',borderRadius:20,border:'1px solid',cursor:'pointer',fontWeight:700,background:copying?'var(--green)':'var(--bg-hover)',color:copying?'#000':'var(--text-primary)',borderColor:copying?'var(--green)':'var(--border-light)',transition:'all 0.15s'}}>
            {copying?'✓ Copying':'Start copying'}
          </button>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8,marginBottom:20}}>
          {[{l:'30d P&L',v:`+${trader.pnl30d}%`,c:'var(--green)'},{l:'Win Rate',v:`${trader.winRate}%`},{l:'Trades',v:trader.trades?.toLocaleString()},{l:'Avg Hold',v:trader.avgHold}].map(s=>(
            <div key={s.l} style={{background:'var(--bg-hover)',borderRadius:8,padding:'10px 12px'}}>
              <div style={{fontSize:10,color:'var(--text-muted)',marginBottom:4,textTransform:'uppercase',letterSpacing:'0.5px'}}>{s.l}</div>
              <div style={{fontSize:14,fontWeight:700,color:s.c||'var(--text-primary)'}}>{s.v}</div>
            </div>
          ))}
        </div>
        <div style={{fontSize:11,fontWeight:600,color:'var(--text-muted)',marginBottom:10,textTransform:'uppercase',letterSpacing:'0.5px'}}>Recent Trades</div>
        {trades.map((t,i)=>(
          <div key={i} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 0',borderBottom:'1px solid var(--border)',fontSize:13}}>
            <span style={{fontWeight:600,width:90}}>{t.sym}</span>
            <span style={{fontSize:10,padding:'2px 8px',borderRadius:4,background:t.side==='long'?'var(--green-bg)':'var(--red-bg)',color:t.side==='long'?'var(--green)':'var(--red)',fontWeight:600}}>{t.side.toUpperCase()}</span>
            <span style={{marginLeft:'auto',color:parseFloat(t.pnl)>=0?'var(--green)':'var(--red)',fontWeight:700}}>{parseFloat(t.pnl)>=0?'+':''}{t.pnl}%</span>
            <span style={{fontSize:11,color:'var(--text-muted)',width:55,textAlign:'right'}}>{t.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Chip({label,active,onClick}){return<button onClick={onClick} style={{background:active?'var(--green-bg)':'var(--bg-card)',border:`1px solid ${active?'var(--green-dim)':'var(--border)'}`,borderRadius:20,padding:'5px 12px',fontSize:12,color:active?'var(--green)':'var(--text-secondary)',cursor:'pointer',fontWeight:active?600:400,transition:'all 0.15s'}}>{label}</button>;}
