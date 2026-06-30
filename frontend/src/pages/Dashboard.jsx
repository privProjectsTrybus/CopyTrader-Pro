import { useEffect, useState, useRef } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, CartesianGrid } from 'recharts';
import { getLivePrices } from '../lib/exchange.js';

const PNL = [{m:'Jul',v:3.1},{m:'Aug',v:-1.2},{m:'Sep',v:5.4},{m:'Oct',v:7.2},{m:'Nov',v:-0.8},{m:'Dec',v:4.1},{m:'Jan',v:6.3},{m:'Feb',v:2.9},{m:'Mar',v:8.1},{m:'Apr',v:-1.5},{m:'May',v:5.7},{m:'Jun',v:9.2}];

function age(ts) { const s=Math.floor((Date.now()-ts)/1000); if(s<5) return 'now'; return s<60?`${s}s ago`:s<3600?`${Math.floor(s/60)}m ago`:`${Math.floor(s/3600)}h ago`; }

export default function Dashboard() {
  const [prices, setPrices] = useState({});
  const [tick, setTick]     = useState(0); // forces re-render to refresh feed/positions from window._BOT
  const histRef = useRef([]);

  useEffect(() => {
    const load = () => getLivePrices().then(setPrices).catch(()=>{});
    load();
    const priceInterval = setInterval(load, 20000);
    const tickInterval  = setInterval(() => setTick(n => n+1), 2000); // refresh bot state every 2s
    return () => { clearInterval(priceInterval); clearInterval(tickInterval); };
  }, []);

  const bot = window._BOT || { copiedTraders:{}, openPositions:{}, tradeLog:[], running:false };
  const traders   = Object.values(bot.copiedTraders);
  const positions = Object.values(bot.openPositions);
  const tradeLog  = bot.tradeLog || [];

  const btc = prices.BTC||62541, eth = prices.ETH||1665, sol = prices.SOL||69, bnb = prices.BNB||580;
  const total = 10000 + 0.15*btc + 2.5*eth + 25*sol + 1.2*bnb;

  // Track portfolio value history client-side
  if (histRef.current.length === 0 || Date.now() - histRef.current[histRef.current.length-1]?.t > 30000) {
    histRef.current.push({ t: Date.now(), v: total });
    if (histRef.current.length > 60) histRef.current.shift();
  }
  const portfolioHistory = histRef.current.length > 1 ? histRef.current.map((p,i) => ({ d:i, v:p.v })) : Array.from({length:20},(_,i)=>({d:i, v: total*(0.97+i*0.0015)}));

  return (
    <div className="fade-in" style={{display:'flex',flexDirection:'column',gap:'1.25rem'}}>
      {/* Stats */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12}}>
        {[
          {label:'Portfolio Value',val:`$${total.toLocaleString('en',{maximumFractionDigits:0})}`,sub:'Demo + live prices',color:'var(--green)',icon:'ti-wallet'},
          {label:'Bot Status',val:bot.running?'Active':'Idle',sub:bot.running?`Copying ${traders.length} trader${traders.length!==1?'s':''}`:'No active copies',color:bot.running?'var(--green)':'var(--text-muted)',icon:'ti-robot'},
          {label:'Open Positions',val:positions.length,sub:positions.length>0?`$${positions.reduce((s,p)=>s+p.sizeUsd,0)} deployed`:'None yet',color:'var(--text-primary)',icon:'ti-chart-candlestick'},
          {label:'Trades Executed',val:tradeLog.length,sub:tradeLog.length>0?'This session':'Copy a trader to start',color:'var(--text-primary)',icon:'ti-trophy'},
        ].map((s,i)=>(
          <div key={i} style={{background:'var(--bg-card)',borderRadius:'var(--radius-lg)',padding:'1.1rem',border:'1px solid var(--border)'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
              <div style={{fontSize:11,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.5px',fontWeight:600}}>{s.label}</div>
              <i className={`ti ${s.icon}`} style={{fontSize:16,color:'var(--text-muted)'}}/>
            </div>
            <div style={{fontSize:24,fontWeight:700,letterSpacing:'-0.5px',color:s.color}}>{s.val}</div>
            <div style={{fontSize:11,marginTop:4,color:'var(--text-muted)'}}>{s.sub}</div>
          </div>
        ))}
      </div>

      <div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:'1.25rem'}}>
        {/* Portfolio chart */}
        <div style={{background:'var(--bg-card)',borderRadius:'var(--radius-lg)',padding:'1.25rem',border:'1px solid var(--border)'}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
            <div style={{fontWeight:600,fontSize:14}}>Portfolio Value</div>
            <span style={{fontSize:11,color:'var(--text-muted)'}}>Live · updates every 20s</span>
          </div>
          <ResponsiveContainer width="100%" height={170}>
            <AreaChart data={portfolioHistory} margin={{top:5,right:0,left:0,bottom:0}}>
              <defs>
                <linearGradient id="pg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.35}/>
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false}/>
              <XAxis hide/>
              <YAxis hide domain={['auto','auto']}/>
              <Tooltip formatter={v=>[`$${Math.round(v).toLocaleString()}`,'Value']} contentStyle={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:8,fontSize:12}}/>
              <Area type="monotone" dataKey="v" stroke="#22c55e" strokeWidth={2} fill="url(#pg)"/>
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Live prices */}
        <div style={{background:'var(--bg-card)',borderRadius:'var(--radius-lg)',padding:'1.25rem',border:'1px solid var(--border)',display:'flex',flexDirection:'column',gap:8}}>
          <div style={{fontWeight:600,fontSize:14,marginBottom:4}}>Live Prices</div>
          {[
            {sym:'BTC',price:btc,icon:'₿',color:'#f7931a'},
            {sym:'ETH',price:eth,icon:'Ξ',color:'#627eea'},
            {sym:'SOL',price:sol,icon:'◎',color:'#9945ff'},
            {sym:'BNB',price:bnb,icon:'⬡',color:'#f3ba2f'},
          ].map(c=>(
            <div key={c.sym} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'8px 10px',background:'var(--bg-hover)',borderRadius:'var(--radius-sm)'}}>
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <span style={{color:c.color,fontSize:16}}>{c.icon}</span>
                <span style={{fontWeight:600,fontSize:13}}>{c.sym}</span>
              </div>
              <div style={{fontWeight:700,fontSize:13}}>${c.price.toLocaleString('en',{maximumFractionDigits:2})}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1.25rem'}}>
        {/* Open Positions — REAL from bot */}
        <div style={{background:'var(--bg-card)',borderRadius:'var(--radius-lg)',padding:'1.25rem',border:'1px solid var(--border)'}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
            <div style={{fontWeight:600,fontSize:14}}>Open Positions</div>
            <span style={{fontSize:11,background:positions.length>0?'var(--green-bg)':'var(--bg-hover)',color:positions.length>0?'var(--green)':'var(--text-muted)',padding:'2px 8px',borderRadius:10,fontWeight:600}}>{positions.length} active</span>
          </div>
          {positions.length === 0 ? (
            <div style={{color:'var(--text-muted)',fontSize:13,textAlign:'center',padding:'1.5rem 0'}}>
              No open positions.<br/>Copy a trader or place a manual trade to get started.
            </div>
          ) : (
            positions.map((p,i)=>(
              <div key={i} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 0',borderBottom:i<positions.length-1?'1px solid var(--border)':'none'}}>
                <div style={{flex:1}}>
                  <div style={{fontWeight:700,fontSize:13}}>{p.symbol}</div>
                  <div style={{fontSize:11,color:'var(--text-muted)',marginTop:1}}>{p.traderName} · ${p.sizeUsd}</div>
                </div>
                <span style={{fontSize:11,padding:'2px 8px',borderRadius:4,fontWeight:600,background:p.side==='long'?'var(--green-bg)':'var(--red-bg)',color:p.side==='long'?'var(--green)':'var(--red)'}}>{p.side.toUpperCase()}</span>
                <div style={{textAlign:'right',minWidth:70}}>
                  <div style={{fontWeight:700,color:(p.pnl||0)>=0?'var(--green)':'var(--red)'}}>{(p.pnl||0)>=0?'+':''}{(p.pnl||0).toFixed(2)}%</div>
                  <div style={{fontSize:11,color:'var(--text-muted)'}}>${p.entryPrice?.toLocaleString()}</div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* P&L chart */}
        <div style={{background:'var(--bg-card)',borderRadius:'var(--radius-lg)',padding:'1.25rem',border:'1px solid var(--border)'}}>
          <div style={{fontWeight:600,fontSize:14,marginBottom:14}}>Monthly P&L</div>
          <ResponsiveContainer width="100%" height={170}>
            <BarChart data={PNL} margin={{top:0,right:0,left:-20,bottom:0}}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false}/>
              <XAxis dataKey="m" tick={{fontSize:10,fill:'var(--text-muted)'}} axisLine={false} tickLine={false}/>
              <YAxis tick={{fontSize:10,fill:'var(--text-muted)'}} axisLine={false} tickLine={false} tickFormatter={v=>`${v}%`}/>
              <Tooltip formatter={v=>[`${v}%`,'P&L']} contentStyle={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:8,fontSize:12}}/>
              <Bar dataKey="v" radius={[4,4,0,0]}>
                {PNL.map((_,i)=><Cell key={i} fill={PNL[i].v>=0?'#22c55e':'#ef4444'}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Live Feed — REAL from bot trade log */}
      <div style={{background:'var(--bg-card)',borderRadius:'var(--radius-lg)',padding:'1.25rem',border:'1px solid var(--border)'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
          <div style={{fontWeight:600,fontSize:14}}>Live Trade Feed</div>
          <span style={{fontSize:11,color:bot.running?'var(--green)':'var(--text-muted)',fontWeight:600,display:'flex',alignItems:'center',gap:5}}>
            <span style={{width:6,height:6,borderRadius:'50%',background:bot.running?'var(--green)':'var(--text-muted)',display:'inline-block',animation:bot.running?'pulse 1.5s infinite':'none'}}/>
            {bot.running ? 'Monitoring' : 'Idle'}
          </span>
        </div>
        {tradeLog.length === 0 ? (
          <div style={{color:'var(--text-muted)',fontSize:13,textAlign:'center',padding:'1.5rem 0'}}>
            No trades yet. Trades will appear here in real-time once you copy a trader or place a manual trade.
          </div>
        ) : (
          tradeLog.slice(0,8).map((item,i)=>(
            <div key={i} style={{display:'flex',alignItems:'flex-start',gap:12,padding:'9px 0',borderBottom:i<Math.min(7,tradeLog.length-1)?'1px solid var(--border)':'none'}}>
              <div style={{width:8,height:8,borderRadius:'50%',marginTop:4,flexShrink:0,background:item.type==='open'?'var(--green)':item.type==='close'?'var(--blue)':'var(--red)'}}/>
              <div style={{flex:1,fontSize:13,lineHeight:1.5}}>
                <strong style={{color:'var(--text-primary)'}}>{item.traderName}</strong>
                <span style={{color:'var(--text-secondary)'}}> — {item.type==='open'?`opened ${item.symbol} ${item.side?.toUpperCase()}`:`closed ${item.symbol}`} @ ${item.entryPrice?.toLocaleString()} · ${item.sizeUsd}</span>
              </div>
              <span style={{fontSize:11,color:'var(--text-muted)',flexShrink:0,fontWeight:500}}>{age(item.openedAt)}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
