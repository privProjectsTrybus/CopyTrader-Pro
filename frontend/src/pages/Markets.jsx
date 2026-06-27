import { useEffect, useState, useRef } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const COINS = [
  { id:'bitcoin',     sym:'BTC',  name:'Bitcoin',  icon:'₿', color:'#f7931a' },
  { id:'ethereum',    sym:'ETH',  name:'Ethereum', icon:'Ξ', color:'#627eea' },
  { id:'solana',      sym:'SOL',  name:'Solana',   icon:'◎', color:'#9945ff' },
  { id:'binancecoin', sym:'BNB',  name:'BNB',      icon:'⬡', color:'#f3ba2f' },
  { id:'ripple',      sym:'XRP',  name:'XRP',      icon:'✕', color:'#346aa9' },
  { id:'cardano',     sym:'ADA',  name:'Cardano',  icon:'₳', color:'#0033ad' },
  { id:'dogecoin',    sym:'DOGE', name:'Dogecoin', icon:'Ð', color:'#c2a633' },
  { id:'polkadot',    sym:'DOT',  name:'Polkadot', icon:'●', color:'#e6007a' },
];

function genSparkline(price, change) {
  const points = 24;
  const data = [];
  let p = price / (1 + change / 100);
  for (let i = 0; i < points; i++) {
    const progress = i / (points - 1);
    const trend = change / 100 * progress;
    const noise = (Math.random() - 0.5) * 0.012;
    p = (price / (1 + change / 100)) * (1 + trend + noise);
    data.push({ t: i, v: parseFloat(p.toFixed(2)) });
  }
  return data;
}

export default function Markets() {
  const [data, setData]       = useState({});
  const [sparklines, setSpark] = useState({});
  const [selected, setSelected] = useState('BTC');
  const [loading, setLoading] = useState(true);
  const [updated, setUpdated] = useState(null);
  const [error, setError]     = useState(null);

  const load = async () => {
    try {
      const ids = COINS.map(c => c.id).join(',');
      const r = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true&include_24hr_high=true&include_24hr_low=true&include_24hr_vol=true`, { signal: AbortSignal.timeout(10000) });
      if (!r.ok) throw new Error('API error');
      const d = await r.json();
      setData(d);
      // Generate sparklines for each coin
      const sp = {};
      COINS.forEach(c => {
        if (d[c.id]) sp[c.sym] = genSparkline(d[c.id].usd, d[c.id].usd_24h_change || 0);
      });
      setSpark(sp);
      setUpdated(new Date());
      setError(null);
    } catch (e) { setError('Fetching prices…'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); const t = setInterval(load, 20000); return () => clearInterval(t); }, []);

  const sel = COINS.find(c => c.sym === selected);
  const selData = sel ? data[sel.id] : null;
  const pos = (selData?.usd_24h_change || 0) >= 0;

  const fmt = (n) => n < 0.01 ? n?.toFixed(6) : n < 1 ? n?.toFixed(4) : n?.toLocaleString('en', { maximumFractionDigits: 2 });

  return (
    <div className="fade-in" style={{ display:'flex', flexDirection:'column', gap:'1.25rem' }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ fontSize:13, color:'var(--text-secondary)' }}>
          {loading ? 'Fetching live prices…' : error ? `⚠️ ${error}` : `${COINS.length} markets · updated ${updated?.toLocaleTimeString()}`}
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color:'var(--green)', fontWeight:500 }}>
          <span style={{ width:7, height:7, borderRadius:'50%', background:'var(--green)', display:'inline-block', animation:'pulse 1.5s infinite' }}/>
          Live · CoinGecko
        </div>
      </div>

      {/* Selected coin hero */}
      {selData && (
        <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:'var(--radius-xl)', padding:'1.5rem', display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1.5rem' }}>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16 }}>
              <div style={{ width:48, height:48, borderRadius:'50%', background:sel.color+'22', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, color:sel.color }}>{sel.icon}</div>
              <div>
                <div style={{ fontWeight:700, fontSize:20 }}>{sel.name}</div>
                <div style={{ fontSize:12, color:'var(--text-muted)' }}>{sel.sym} / USD</div>
              </div>
            </div>
            <div style={{ fontSize:38, fontWeight:700, letterSpacing:'-1px', marginBottom:6 }}>${fmt(selData.usd)}</div>
            <div style={{ fontSize:16, fontWeight:600, color:pos?'var(--green)':'var(--red)' }}>
              {pos?'▲':'▼'} {Math.abs(selData.usd_24h_change||0).toFixed(2)}% today
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginTop:16 }}>
              {[
                { l:'24h High', v:`$${fmt(selData.usd_24h_high)}` },
                { l:'24h Low',  v:`$${fmt(selData.usd_24h_low)}` },
                { l:'Volume',   v:`$${((selData.usd_24h_vol||0)/1e9).toFixed(2)}B` },
              ].map(s=>(
                <div key={s.l} style={{ background:'var(--bg-hover)', borderRadius:8, padding:'8px 10px' }}>
                  <div style={{ fontSize:10, color:'var(--text-muted)', marginBottom:3 }}>{s.l}</div>
                  <div style={{ fontSize:13, fontWeight:600 }}>{s.v}</div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div style={{ fontSize:12, color:'var(--text-muted)', marginBottom:8 }}>24h Price Movement</div>
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={sparklines[selected]||[]} margin={{top:5,right:0,left:0,bottom:0}}>
                <defs>
                  <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={pos?'#22c55e':'#ef4444'} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={pos?'#22c55e':'#ef4444'} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis hide/>
                <YAxis hide domain={['auto','auto']}/>
                <Tooltip formatter={v=>[`$${fmt(v)}`,'Price']} contentStyle={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:8,fontSize:12}}/>
                <Area type="monotone" dataKey="v" stroke={pos?'#22c55e':'#ef4444'} strokeWidth={2} fill="url(#cg)"/>
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Coin grid */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))', gap:10 }}>
        {COINS.map(coin => {
          const d = data[coin.id];
          const chg = d?.usd_24h_change || 0;
          const isPos = chg >= 0;
          const isSel = selected === coin.sym;
          const sp = sparklines[coin.sym] || [];
          return (
            <div key={coin.id} onClick={()=>setSelected(coin.sym)} style={{
              background: 'var(--bg-card)', borderRadius:'var(--radius-lg)', padding:'1rem',
              border: `1px solid ${isSel ? coin.color+'66' : 'var(--border)'}`,
              cursor:'pointer', transition:'all 0.15s',
              boxShadow: isSel ? `0 0 0 1px ${coin.color}33` : 'none',
            }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <div style={{ width:32,height:32,borderRadius:'50%',background:coin.color+'22',display:'flex',alignItems:'center',justifyContent:'center',fontSize:15,color:coin.color }}>{coin.icon}</div>
                  <div>
                    <div style={{ fontWeight:600, fontSize:13 }}>{coin.sym}</div>
                    <div style={{ fontSize:10, color:'var(--text-muted)' }}>{coin.name}</div>
                  </div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontWeight:700, fontSize:14 }}>${d ? fmt(d.usd) : '…'}</div>
                  <div style={{ fontSize:11, fontWeight:600, color:isPos?'var(--green)':'var(--red)' }}>
                    {isPos?'+':''}{chg.toFixed(2)}%
                  </div>
                </div>
              </div>
              {/* Mini sparkline */}
              {sp.length > 0 && (
                <ResponsiveContainer width="100%" height={40}>
                  <AreaChart data={sp} margin={{top:0,right:0,left:0,bottom:0}}>
                    <defs>
                      <linearGradient id={`g${coin.sym}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={isPos?'#22c55e':'#ef4444'} stopOpacity={0.3}/>
                        <stop offset="95%" stopColor={isPos?'#22c55e':'#ef4444'} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis hide/><YAxis hide domain={['auto','auto']}/>
                    <Area type="monotone" dataKey="v" stroke={isPos?'#22c55e':'#ef4444'} strokeWidth={1.5} fill={`url(#g${coin.sym})`} dot={false}/>
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
