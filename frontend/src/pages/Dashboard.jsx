import { useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';

const PNL = [{m:'Jul',v:3.1},{m:'Aug',v:-1.2},{m:'Sep',v:5.4},{m:'Oct',v:7.2},{m:'Nov',v:-0.8},{m:'Dec',v:4.1},{m:'Jan',v:6.3},{m:'Feb',v:2.9},{m:'Mar',v:8.1},{m:'Apr',v:-1.5},{m:'May',v:5.7},{m:'Jun',v:9.2}];

const POSITIONS = [
  { symbol:'BTCUSDT', side:'long',  entry:62100, pnl:2.3,  trader:'CryptoWolf_X', size:'$500' },
  { symbol:'ETHUSDT', side:'long',  entry:1640,  pnl:1.5,  trader:'AlphaStocks',  size:'$250' },
  { symbol:'SOLUSDT', side:'short', entry:71,    pnl:-0.7, trader:'BullRunKing',  size:'$300' },
];

const INIT_FEED = [
  { type:'trade_opened', name:'CryptoWolf_X', msg:'Opened BTCUSDT LONG @ $62,100 · $500', ts:Date.now()-25000 },
  { type:'trade_opened', name:'AlphaStocks',  msg:'Opened ETHUSDT LONG @ $1,640 · $250',  ts:Date.now()-110000 },
  { type:'trade_closed', name:'FX_Ninja99',   msg:'Closed SOLUSDT SHORT +2.8%',             ts:Date.now()-280000 },
  { type:'trade_opened', name:'BullRunKing',  msg:'Opened SOLUSDT SHORT @ $71 · $300',     ts:Date.now()-540000 },
  { type:'trade_closed', name:'CryptoWolf_X', msg:'Closed ETHUSDT LONG +1.9%',              ts:Date.now()-900000 },
];

function age(ts) { const s=Math.floor((Date.now()-ts)/1000); return s<60?`${s}s`:s<3600?`${Math.floor(s/60)}m`:`${Math.floor(s/3600)}h`; }

export default function Dashboard({ feed=[] }) {
  const [prices, setPrices] = useState({});
  const [allFeed, setFeed]  = useState(INIT_FEED);

  useEffect(()=>{
    const load=()=>fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana,binancecoin&vs_currencies=usd&include_24hr_change=true',{signal:AbortSignal.timeout(8000)}).then(r=>r.json()).then(setPrices).catch(()=>{});
    load(); const t=setInterval(load,20000); return()=>clearInterval(t);
  },[]);

  useEffect(()=>{ if(feed.length>0) setFeed(p=>[...feed,...p].slice(0,50)); },[feed.length]);

  const btc = prices.bitcoin?.usd||62541;
  const eth = prices.ethereum?.usd||1665;
  const sol = prices.solana?.usd||69;
  const bnb = prices.binancecoin?.usd||580;
  const total = 10000+0.15*btc+2.5*eth+25*sol+1.2*bnb;

  const portfolioHistory = Array.from({length:30},(_,i)=>({ d:i, v: total*(0.85+i*0.005+Math.sin(i*0.4)*0.02) }));

  return (
    <div className="fade-in" style={{display:'flex',flexDirection:'column',gap:'1.25rem'}}>
      {/* Stats */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12}}>
        {[
          {label:'Portfolio Value',val:`$${total.toLocaleString('en',{maximumFractionDigits:0})}`,sub:'Live prices',color:'var(--green)',icon:'ti-wallet'},
          {label:'30d Return',val:'+18.4%',sub:'↑ +3.1% this week',color:'var(--green)',icon:'ti-trending-up'},
          {label:'Active Copies',val:'3',sub:'3 traders · 3 positions',color:'var(--text-primary)',icon:'ti-robot'},
          {label:'Win Rate',val:'87%',sub:'142 trades executed',color:'var(--text-primary)',icon:'ti-trophy'},
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

      {/* Portfolio chart + live prices */}
      <div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:'1.25rem'}}>
        <div style={{background:'var(--bg-card)',borderRadius:'var(--radius-lg)',padding:'1.25rem',border:'1px solid var(--border)'}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
            <div style={{fontWeight:600,fontSize:14}}>Portfolio Value (30d)</div>
            <span style={{fontSize:13,fontWeight:700,color:'var(--green)'}}>+${(total*0.15).toLocaleString('en',{maximumFractionDigits:0})} this month</span>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={portfolioHistory} margin={{top:5,right:0,left:0,bottom:0}}>
              <defs>
                <linearGradient id="pg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis hide/><YAxis hide domain={['auto','auto']}/>
              <Tooltip formatter={v=>[`$${Math.round(v).toLocaleString()}`,'Value']} contentStyle={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:8,fontSize:12}}/>
              <Area type="monotone" dataKey="v" stroke="#22c55e" strokeWidth={2} fill="url(#pg)"/>
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Live prices */}
        <div style={{background:'var(--bg-card)',borderRadius:'var(--radius-lg)',padding:'1.25rem',border:'1px solid var(--border)',display:'flex',flexDirection:'column',gap:10}}>
          <div style={{fontWeight:600,fontSize:14,marginBottom:4}}>Live Prices</div>
          {[
            {sym:'BTC',price:btc,chg:prices.bitcoin?.usd_24h_change||1.2,icon:'₿',color:'#f7931a'},
            {sym:'ETH',price:eth,chg:prices.ethereum?.usd_24h_change||0.8,icon:'Ξ',color:'#627eea'},
            {sym:'SOL',price:sol,chg:prices.solana?.usd_24h_change||-0.4,icon:'◎',color:'#9945ff'},
            {sym:'BNB',price:bnb,chg:prices.binancecoin?.usd_24h_change||0.5,icon:'⬡',color:'#f3ba2f'},
          ].map(c=>(
            <div key={c.sym} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'8px 10px',background:'var(--bg-hover)',borderRadius:'var(--radius-sm)'}}>
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <span style={{color:c.color,fontSize:16}}>{c.icon}</span>
                <span style={{fontWeight:600,fontSize:13}}>{c.sym}</span>
              </div>
              <div style={{textAlign:'right'}}>
                <div style={{fontWeight:700,fontSize:13}}>${c.price.toLocaleString('en',{maximumFractionDigits:2})}</div>
                <div style={{fontSize:11,color:c.chg>=0?'var(--green)':'var(--red)',fontWeight:600}}>{c.chg>=0?'+':''}{c.chg.toFixed(2)}%</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1.25rem'}}>
        {/* Open Positions */}
        <div style={{background:'var(--bg-card)',borderRadius:'var(--radius-lg)',padding:'1.25rem',border:'1px solid var(--border)'}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
            <div style={{fontWeight:600,fontSize:14}}>Open Positions</div>
            <span style={{fontSize:11,background:'var(--green-bg)',color:'var(--green)',padding:'2px 8px',borderRadius:10,fontWeight:600}}>{POSITIONS.length} active</span>
          </div>
          {POSITIONS.map((p,i)=>(
            <div key={i} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 0',borderBottom:i<POSITIONS.length-1?'1px solid var(--border)':'none'}}>
              <div style={{flex:1}}>
                <div style={{fontWeight:700,fontSize:13}}>{p.symbol}</div>
                <div style={{fontSize:11,color:'var(--text-muted)',marginTop:1}}>{p.trader} · {p.size}</div>
              </div>
              <span style={{fontSize:11,padding:'2px 8px',borderRadius:4,fontWeight:600,background:p.side==='long'?'var(--green-bg)':'var(--red-bg)',color:p.side==='long'?'var(--green)':'var(--red)'}}>{p.side.toUpperCase()}</span>
              <div style={{textAlign:'right',minWidth:60}}>
                <div style={{fontWeight:700,color:p.pnl>=0?'var(--green)':'var(--red)'}}>{p.pnl>=0?'+':''}{p.pnl}%</div>
                <div style={{fontSize:11,color:'var(--text-muted)'}}>${p.entry.toLocaleString()}</div>
              </div>
            </div>
          ))}
        </div>

        {/* P&L chart */}
        <div style={{background:'var(--bg-card)',borderRadius:'var(--radius-lg)',padding:'1.25rem',border:'1px solid var(--border)'}}>
          <div style={{fontWeight:600,fontSize:14,marginBottom:14}}>Monthly P&L</div>
          <ResponsiveContainer width="100%" height={170}>
            <BarChart data={PNL} margin={{top:0,right:0,left:-20,bottom:0}}>
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

      {/* Live Feed */}
      <div style={{background:'var(--bg-card)',borderRadius:'var(--radius-lg)',padding:'1.25rem',border:'1px solid var(--border)'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
          <div style={{fontWeight:600,fontSize:14}}>Live Trade Feed</div>
          <span style={{fontSize:11,color:'var(--green)',fontWeight:600,display:'flex',alignItems:'center',gap:5}}>
            <span style={{width:6,height:6,borderRadius:'50%',background:'var(--green)',display:'inline-block',animation:'pulse 1.5s infinite'}}/>
            Real-time
          </span>
        </div>
        {allFeed.slice(0,6).map((item,i)=>(
          <div key={i} style={{display:'flex',alignItems:'flex-start',gap:12,padding:'9px 0',borderBottom:i<5?'1px solid var(--border)':'none'}}>
            <div style={{width:8,height:8,borderRadius:'50%',marginTop:4,flexShrink:0,background:item.type==='trade_opened'?'var(--green)':item.type==='trade_closed'?'var(--blue)':'var(--red)'}}/>
            <div style={{flex:1,fontSize:13,lineHeight:1.5}}>
              <strong style={{color:'var(--text-primary)'}}>{item.name||item.data?.traderName}</strong>
              <span style={{color:'var(--text-secondary)'}}> — {item.msg||item.data?.message}</span>
            </div>
            <span style={{fontSize:11,color:'var(--text-muted)',flexShrink:0,fontWeight:500}}>{age(item.ts)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
