import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LineChart, Line } from 'recharts';

const PNL_DATA = [
  {month:'Jul',pnl:3.1},{month:'Aug',pnl:-1.2},{month:'Sep',pnl:5.4},{month:'Oct',pnl:7.2},
  {month:'Nov',pnl:-0.8},{month:'Dec',pnl:4.1},{month:'Jan',pnl:6.3},{month:'Feb',pnl:2.9},
  {month:'Mar',pnl:8.1},{month:'Apr',pnl:-1.5},{month:'May',pnl:5.7},{month:'Jun',pnl:9.2},
];

const POSITIONS = [
  { symbol:'BTCUSDT', side:'long',  entry:62100, pnl:2.3,  trader:'CryptoWolf_X' },
  { symbol:'ETHUSDT', side:'long',  entry:1640,  pnl:1.5,  trader:'AlphaStocks'  },
  { symbol:'SOLUSDT', side:'short', entry:71,    pnl:-0.7, trader:'BullRunKing'  },
];

const FEED_INIT = [
  { type:'trade_opened', traderName:'CryptoWolf_X', message:'Opened BTCUSDT LONG @ $62,100', ts: Date.now()-30000 },
  { type:'trade_opened', traderName:'AlphaStocks',  message:'Opened ETHUSDT LONG @ $1,640',  ts: Date.now()-120000 },
  { type:'trade_closed', traderName:'FX_Ninja99',   message:'Closed SOLUSDT SHORT +2.8%',    ts: Date.now()-300000 },
  { type:'trade_opened', traderName:'BullRunKing',  message:'Opened SOLUSDT SHORT @ $71',    ts: Date.now()-600000 },
];

async function fetchPrices() {
  const r = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana&vs_currencies=usd&include_24hr_change=true', { signal: AbortSignal.timeout(8000) });
  return r.json();
}

function formatAge(ts) {
  const s = Math.floor((Date.now()-ts)/1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s/60)}m ago`;
  return `${Math.floor(s/3600)}h ago`;
}

export default function Dashboard({ feed = [], connected }) {
  const [prices, setPrices]  = useState({});
  const [allFeed, setAllFeed] = useState(FEED_INIT);

  useEffect(() => {
    fetchPrices().then(setPrices).catch(()=>{});
    const t = setInterval(() => fetchPrices().then(setPrices).catch(()=>{}), 20000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (feed.length > 0) setAllFeed(prev => [...feed, ...prev].slice(0, 50));
  }, [feed.length]);

  const btc = prices.bitcoin?.usd || 62541;
  const eth = prices.ethereum?.usd || 1665;
  const sol = prices.solana?.usd || 69;
  const totalUsd = 10000 + 0.15*btc + 2.5*eth + 25*sol + 1.2*580;

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'1.25rem' }}>
      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12 }}>
        {[
          { label:'Portfolio Value', val:`$${totalUsd.toLocaleString('en',{maximumFractionDigits:0})}`, sub:'↑ Live prices', color:'#4ade80' },
          { label:'30d P&L',         val:'+18.4%',  sub:'↑ +3.1% this week', color:'#4ade80' },
          { label:'Copying',         val:'3',       sub:'traders active',     color:'var(--color-text-primary)' },
          { label:'Win Rate',        val:'87%',     sub:'142 trades copied',  color:'var(--color-text-primary)' },
        ].map((s,i)=>(
          <div key={i} style={{background:'var(--color-background-secondary)',borderRadius:'var(--border-radius-md)',padding:'1rem'}}>
            <div style={{fontSize:11,color:'var(--color-text-tertiary)',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:6}}>{s.label}</div>
            <div style={{fontSize:22,fontWeight:600,letterSpacing:'-0.5px',color:s.color}}>{s.val}</div>
            <div style={{fontSize:12,marginTop:4,color:'var(--color-text-tertiary)'}}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Live prices ticker */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12}}>
        {[
          {sym:'BTC',price:btc,chg:prices.bitcoin?.usd_24h_change||1.2,color:'#f7931a'},
          {sym:'ETH',price:eth,chg:prices.ethereum?.usd_24h_change||0.8,color:'#627eea'},
          {sym:'SOL',price:sol,chg:prices.solana?.usd_24h_change||-0.4,color:'#9945ff'},
        ].map(c=>(
          <div key={c.sym} style={{background:'var(--color-background-secondary)',borderRadius:'var(--border-radius-md)',padding:'12px 16px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              <div style={{width:32,height:32,borderRadius:'50%',background:c.color+'22',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,color:c.color,fontWeight:700}}>{c.sym[0]}</div>
              <div style={{fontWeight:600}}>{c.sym}/USD</div>
            </div>
            <div style={{textAlign:'right'}}>
              <div style={{fontWeight:600,fontSize:16}}>${c.price.toLocaleString('en',{maximumFractionDigits:2})}</div>
              <div style={{fontSize:12,color:c.chg>=0?'#4ade80':'#f87171',fontWeight:500}}>{c.chg>=0?'+':''}{c.chg.toFixed(2)}%</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1.25rem'}}>
        {/* Open Positions */}
        <div style={card}>
          <SH title="Open positions" right={<span style={{fontSize:11,color:'var(--color-text-tertiary)'}}>{POSITIONS.length} active</span>}/>
          <table style={{width:'100%',fontSize:13,borderCollapse:'collapse'}}>
            <thead>
              <tr style={{fontSize:10,textTransform:'uppercase',letterSpacing:'0.5px',color:'var(--color-text-tertiary)'}}>
                <td style={{paddingBottom:8}}>Pair</td><td>Side</td><td style={{textAlign:'right'}}>Entry</td><td style={{textAlign:'right'}}>P&L</td>
              </tr>
            </thead>
            <tbody>
              {POSITIONS.map((p,i)=>(
                <tr key={i} style={{borderTop:'0.5px solid var(--color-border-tertiary)'}}>
                  <td style={{padding:'8px 0',fontWeight:600}}>{p.symbol}</td>
                  <td><span style={{fontSize:10,padding:'2px 7px',borderRadius:4,fontWeight:500,background:p.side==='long'?'#14532d':'#450a0a',color:p.side==='long'?'#4ade80':'#f87171'}}>{p.side}</span></td>
                  <td style={{textAlign:'right',color:'var(--color-text-secondary)'}}>${p.entry.toLocaleString()}</td>
                  <td style={{textAlign:'right',color:p.pnl>=0?'#4ade80':'#f87171',fontWeight:600}}>{p.pnl>=0?'+':''}{p.pnl}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* P&L chart */}
        <div style={card}>
          <SH title="Monthly P&L"/>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={PNL_DATA} margin={{top:0,right:0,left:-20,bottom:0}}>
              <XAxis dataKey="month" tick={{fontSize:10,fill:'var(--color-text-tertiary)'}} axisLine={false} tickLine={false}/>
              <YAxis tick={{fontSize:10,fill:'var(--color-text-tertiary)'}} axisLine={false} tickLine={false} tickFormatter={v=>`${v}%`}/>
              <Tooltip formatter={v=>[`${v}%`,'P&L']} contentStyle={{background:'var(--color-background-secondary)',border:'0.5px solid var(--color-border-secondary)',borderRadius:8,fontSize:12}}/>
              <Bar dataKey="pnl" radius={[3,3,0,0]}>
                {PNL_DATA.map((_,i)=><Cell key={i} fill={PNL_DATA[i].pnl>=0?'#4ade80':'#f87171'}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Feed */}
      <div style={card}>
        <SH title="Live trade feed" right={<span style={{fontSize:11,color:'#4ade80'}}>● Active</span>}/>
        {allFeed.slice(0,8).map((item,i)=>(
          <div key={i} style={{display:'flex',alignItems:'flex-start',gap:10,padding:'9px 0',borderBottom:i<7?'0.5px solid var(--color-border-tertiary)':'none',fontSize:12}}>
            <div style={{width:8,height:8,borderRadius:'50%',marginTop:3,flexShrink:0,background:item.type==='trade_opened'?'#4ade80':item.type==='trade_closed'?'#60a5fa':'#f87171'}}/>
            <div style={{color:'var(--color-text-secondary)',lineHeight:1.5,flex:1}}>
              <strong style={{color:'var(--color-text-primary)'}}>{item.traderName || item.data?.traderName}</strong> — {item.message || item.data?.message}
            </div>
            <div style={{fontSize:11,color:'var(--color-text-tertiary)',flexShrink:0}}>{formatAge(item.ts)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SH({ title, right }) {
  return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
      <div style={{fontSize:13,fontWeight:500}}>{title}</div>
      {right}
    </div>
  );
}

const card = { background:'var(--color-background-secondary)', borderRadius:'var(--border-radius-lg)', border:'0.5px solid var(--color-border-tertiary)', padding:'1.25rem' };
