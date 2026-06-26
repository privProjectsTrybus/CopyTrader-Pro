import { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis } from 'recharts';

const COLORS = ['#4ade80','#60a5fa','#c084fc','#fb923c','#f87171','#38bdf8','#fcd34d','#86efac'];

const PNL_DATA = [
  {month:'Jul',pnl:3.1},{month:'Aug',pnl:-1.2},{month:'Sep',pnl:5.4},{month:'Oct',pnl:7.2},
  {month:'Nov',pnl:-0.8},{month:'Dec',pnl:4.1},{month:'Jan',pnl:6.3},{month:'Feb',pnl:2.9},
  {month:'Mar',pnl:8.1},{month:'Apr',pnl:-1.5},{month:'May',pnl:5.7},{month:'Jun',pnl:9.2},
];

async function fetchLivePrices() {
  const r = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana,binancecoin,ripple,cardano&vs_currencies=usd', { signal: AbortSignal.timeout(8000) });
  const d = await r.json();
  return { BTC: d.bitcoin?.usd, ETH: d.ethereum?.usd, SOL: d.solana?.usd, BNB: d.binancecoin?.usd, XRP: d.ripple?.usd, ADA: d.cardano?.usd };
}

export default function Portfolio() {
  const [prices, setPrices]   = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLivePrices().then(p => { setPrices(p); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  // Demo balances with live prices
  const btc = prices.BTC || 62541;
  const eth = prices.ETH || 1665;
  const sol = prices.SOL || 69;
  const bnb = prices.BNB || 580;

  const balances = [
    { asset:'USDT', total:10000, usdValue:10000,        price:1,   exchange:'Binance', free:10000 },
    { asset:'BTC',  total:0.15,  usdValue:0.15*btc,     price:btc, exchange:'Binance', free:0.15  },
    { asset:'ETH',  total:2.5,   usdValue:2.5*eth,      price:eth, exchange:'Binance', free:2.5   },
    { asset:'SOL',  total:25,    usdValue:25*sol,        price:sol, exchange:'Bybit',   free:25    },
    { asset:'BNB',  total:1.2,   usdValue:1.2*bnb,      price:bnb, exchange:'Binance', free:1.2   },
  ].sort((a,b) => b.usdValue - a.usdValue);

  const totalUsd = balances.reduce((s,b) => s + b.usdValue, 0);
  const pieData  = balances.map(b => ({ name: b.asset, value: parseFloat(b.usdValue.toFixed(2)) }));

  const TRADES = [
    { time:'10:42', trader:'CryptoWolf_X', symbol:'BTCUSDT', side:'long',  entry:62100, pnl:2.3,  status:'open'   },
    { time:'09:15', trader:'AlphaStocks',  symbol:'ETHUSDT', side:'long',  entry:1640,  pnl:1.5,  status:'open'   },
    { time:'08:30', trader:'BullRunKing',  symbol:'SOLUSDT', side:'short', entry:71,    pnl:-0.7, status:'open'   },
    { time:'Yesterday', trader:'CryptoWolf_X', symbol:'BTCUSDT', side:'long', entry:61200, pnl:3.1, status:'closed' },
    { time:'Yesterday', trader:'FX_Ninja99',   symbol:'ETHUSDT', side:'short',entry:1710,  pnl:2.8, status:'closed' },
  ];

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'1.25rem' }}>
      {/* Summary cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12 }}>
        {[
          { label:'Total Value',   val:`$${totalUsd.toLocaleString('en',{maximumFractionDigits:0})}`, color:'#4ade80' },
          { label:'30d P&L',       val:'+18.4%',  color:'#4ade80' },
          { label:'Open Positions',val:'3',       color:'var(--color-text-primary)' },
          { label:'All-time P&L',  val:'+$4,821', color:'#4ade80' },
        ].map((s,i) => (
          <div key={i} style={{ background:'var(--color-background-secondary)', borderRadius:'var(--border-radius-md)', padding:'1rem' }}>
            <div style={{ fontSize:11, color:'var(--color-text-tertiary)', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:6 }}>{s.label}</div>
            <div style={{ fontSize:22, fontWeight:600, letterSpacing:'-0.5px', color:s.color }}>{s.val}</div>
          </div>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1.25rem' }}>
        {/* Pie chart */}
        <div style={card}>
          <div style={{ fontWeight:500, fontSize:13, marginBottom:12 }}>Allocation</div>
          <div style={{ display:'flex', alignItems:'center', gap:16 }}>
            <ResponsiveContainer width={140} height={140}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={38} outerRadius={65} dataKey="value" strokeWidth={0}>
                  {pieData.map((_,i) => <Cell key={i} fill={COLORS[i%COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={v=>[`$${parseFloat(v).toLocaleString('en',{maximumFractionDigits:0})}`,'Value']} contentStyle={{ background:'var(--color-background-secondary)', border:'0.5px solid var(--color-border-secondary)', fontSize:12 }} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ flex:1 }}>
              {balances.map((b,i) => (
                <div key={b.asset} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:7 }}>
                  <div style={{ width:8, height:8, borderRadius:'50%', background:COLORS[i%COLORS.length], flexShrink:0 }} />
                  <span style={{ fontSize:13, flex:1, fontWeight:500 }}>{b.asset}</span>
                  <span style={{ fontSize:12, color:'var(--color-text-secondary)' }}>${b.usdValue.toLocaleString('en',{maximumFractionDigits:0})}</span>
                  <span style={{ fontSize:11, color:'var(--color-text-tertiary)', width:36, textAlign:'right' }}>{((b.usdValue/totalUsd)*100).toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* P&L chart */}
        <div style={card}>
          <div style={{ fontWeight:500, fontSize:13, marginBottom:12 }}>Monthly P&L</div>
          <ResponsiveContainer width="100%" height={150}>
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

      {/* Balances table */}
      <div style={card}>
        <div style={{ fontWeight:500, fontSize:13, marginBottom:12 }}>Balances {loading && <span style={{fontSize:11,color:'var(--color-text-tertiary)',fontWeight:400}}>— fetching live prices…</span>}</div>
        <table style={{ width:'100%', fontSize:13, borderCollapse:'collapse' }}>
          <thead>
            <tr style={{ fontSize:10, textTransform:'uppercase', letterSpacing:'0.5px', color:'var(--color-text-tertiary)' }}>
              <td style={{paddingBottom:8}}>Asset</td><td>Exchange</td><td style={{textAlign:'right'}}>Balance</td><td style={{textAlign:'right'}}>Price</td><td style={{textAlign:'right'}}>Value</td>
            </tr>
          </thead>
          <tbody>
            {balances.map((b,i)=>(
              <tr key={b.asset} style={{borderTop:'0.5px solid var(--color-border-tertiary)'}}>
                <td style={{padding:'9px 0',fontWeight:600,display:'flex',alignItems:'center',gap:8}}>
                  <div style={{width:6,height:6,borderRadius:'50%',background:COLORS[i%COLORS.length]}}/>
                  {b.asset}
                </td>
                <td style={{fontSize:11,color:'var(--color-text-tertiary)'}}>{b.exchange}</td>
                <td style={{textAlign:'right',color:'var(--color-text-secondary)'}}>{b.total.toFixed(4)}</td>
                <td style={{textAlign:'right',color:'var(--color-text-secondary)'}}>{b.asset==='USDT'?'$1.00':`$${b.price.toLocaleString('en',{maximumFractionDigits:2})}`}</td>
                <td style={{textAlign:'right',fontWeight:600}}>${b.usdValue.toLocaleString('en',{maximumFractionDigits:2})}</td>
              </tr>
            ))}
            <tr style={{borderTop:'1px solid var(--color-border-secondary)'}}>
              <td colSpan={4} style={{padding:'9px 0',fontWeight:600,fontSize:14}}>Total</td>
              <td style={{textAlign:'right',fontWeight:700,fontSize:14,color:'#4ade80'}}>${totalUsd.toLocaleString('en',{maximumFractionDigits:2})}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Positions */}
      <div style={card}>
        <div style={{ fontWeight:500, fontSize:13, marginBottom:12 }}>Positions & Trade History</div>
        <table style={{ width:'100%', fontSize:13, borderCollapse:'collapse' }}>
          <thead>
            <tr style={{ fontSize:10, textTransform:'uppercase', letterSpacing:'0.5px', color:'var(--color-text-tertiary)' }}>
              <td style={{paddingBottom:8}}>Time</td><td>Trader</td><td>Pair</td><td>Side</td><td style={{textAlign:'right'}}>Entry</td><td style={{textAlign:'right'}}>P&L</td><td style={{textAlign:'right'}}>Status</td>
            </tr>
          </thead>
          <tbody>
            {TRADES.map((t,i)=>(
              <tr key={i} style={{borderTop:'0.5px solid var(--color-border-tertiary)'}}>
                <td style={{padding:'8px 0',fontSize:11,color:'var(--color-text-tertiary)'}}>{t.time}</td>
                <td style={{fontWeight:500}}>{t.trader}</td>
                <td>{t.symbol}</td>
                <td><span style={{fontSize:10,padding:'2px 6px',borderRadius:4,background:t.side==='long'?'#14532d':'#450a0a',color:t.side==='long'?'#4ade80':'#f87171',fontWeight:500}}>{t.side}</span></td>
                <td style={{textAlign:'right',color:'var(--color-text-secondary)'}}>${t.entry.toLocaleString()}</td>
                <td style={{textAlign:'right',color:t.pnl>=0?'#4ade80':'#f87171',fontWeight:600}}>{t.pnl>=0?'+':''}{t.pnl}%</td>
                <td style={{textAlign:'right'}}><span style={{fontSize:10,padding:'2px 7px',borderRadius:4,background:t.status==='open'?'#14532d':'#1e3a5f',color:t.status==='open'?'#4ade80':'#60a5fa',fontWeight:500}}>{t.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const card = { background:'var(--color-background-secondary)', borderRadius:'var(--border-radius-lg)', border:'0.5px solid var(--color-border-tertiary)', padding:'1.25rem' };
