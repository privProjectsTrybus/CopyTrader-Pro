import { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis } from 'recharts';
import { api } from '../lib/api.js';

const COLORS = ['#22c55e','#3b82f6','#a855f7','#f59e0b','#ef4444','#06b6d4','#84cc16','#f97316'];

export default function Portfolio() {
  const [data, setData]     = useState(null);
  const [loading, setLoad]  = useState(true);
  const [error, setError]   = useState(null);

  useEffect(() => {
    api.getPortfolio()
      .then(d => { setData(d); setLoad(false); })
      .catch(e => { setError(e.message); setLoad(false); });
  }, []);

  if (loading) return <div style={{ color:'var(--text-muted)', fontSize:13, padding:'2rem' }}>Fetching your balances…</div>;
  if (error)   return <div style={{ color:'var(--red)', fontSize:13, padding:'2rem' }}>Error: {error}</div>;

  const { totalUsd, balances, pnlByMonth, demo, errors, openPositions=[], tradeLog=[] } = data;
  const realBals = balances.filter(b => !b.empty && b.total > 0);
  const pieData  = realBals.map(b => ({ name: b.asset, value: parseFloat(b.usdValue.toFixed(2)) }));

  return (
    <div className="fade-in" style={{ display:'flex', flexDirection:'column', gap:'1.25rem' }}>
      {/* Errors / warnings */}
      {errors?.length > 0 && (
        <div style={{ background:'var(--red-bg)', border:'1px solid #7f1d1d', borderRadius:'var(--radius-md)', padding:'12px 16px' }}>
          <div style={{ fontSize:12, fontWeight:600, color:'var(--red)', marginBottom:4 }}>⚠️ Connection issues</div>
          {errors.map((e,i) => <div key={i} style={{ fontSize:12, color:'#fca5a5', marginTop:2 }}>{e}</div>)}
          {errors.some(e => e.includes('geo-blocked')) && (
            <div style={{ fontSize:11, color:'#fca5a5', marginTop:8, paddingTop:8, borderTop:'1px solid #7f1d1d' }}>
              Fix: Go to Binance → API Management → your key → disable IP restriction
            </div>
          )}
        </div>
      )}

      {demo && (
        <div style={{ background:'#1c1800', border:'1px solid #92400e', borderRadius:'var(--radius-md)', padding:'12px 16px', fontSize:13, color:'#fcd34d' }}>
          ⚠️ Showing demo data — add your Binance/Bybit API keys in <strong>API Keys</strong> settings to see real balances
        </div>
      )}

      {/* Stats row */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12 }}>
        {[
          { label:'Total Value',    val:`$${totalUsd.toLocaleString('en',{maximumFractionDigits:2})}`, color: demo?'var(--text-muted)':'var(--green)' },
          { label:'Open Positions', val:openPositions.length, color:'var(--text-primary)' },
          { label:'Trades Copied',  val:tradeLog.length,      color:'var(--text-primary)' },
          { label:'Status',         val:demo?'Demo':'Live',   color:demo?'var(--gold)':'var(--green)' },
        ].map((s,i)=>(
          <div key={i} style={{ background:'var(--bg-card)', borderRadius:'var(--radius-lg)', padding:'1rem', border:'1px solid var(--border)' }}>
            <div style={{ fontSize:11, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:6 }}>{s.label}</div>
            <div style={{ fontSize:22, fontWeight:700, color:s.color }}>{s.val}</div>
          </div>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1.25rem' }}>
        {/* Balances */}
        <div style={{ background:'var(--bg-card)', borderRadius:'var(--radius-lg)', padding:'1.25rem', border:'1px solid var(--border)' }}>
          <div style={{ fontWeight:600, fontSize:14, marginBottom:14 }}>
            Balances {!demo && <span style={{ fontSize:11, color:'var(--green)', fontWeight:500 }}>· Live</span>}
          </div>
          {balances.length === 0 ? (
            <div style={{ color:'var(--text-muted)', fontSize:13 }}>No balances found. Your accounts may be empty.</div>
          ) : (
            <table style={{ width:'100%', fontSize:13, borderCollapse:'collapse' }}>
              <thead>
                <tr style={{ fontSize:10, textTransform:'uppercase', color:'var(--text-muted)' }}>
                  <td style={{paddingBottom:8}}>Asset</td><td>Exchange</td><td style={{textAlign:'right'}}>Balance</td><td style={{textAlign:'right'}}>Value</td>
                </tr>
              </thead>
              <tbody>
                {balances.map((b,i)=>(
                  <tr key={i} style={{ borderTop:'1px solid var(--border)', opacity:b.empty?0.4:1 }}>
                    <td style={{ padding:'9px 0', fontWeight:600, display:'flex', alignItems:'center', gap:8 }}>
                      <div style={{ width:6, height:6, borderRadius:'50%', background:COLORS[i%COLORS.length] }}/>
                      {b.asset}
                    </td>
                    <td style={{ fontSize:11, color:'var(--text-muted)' }}>{b.exchange}</td>
                    <td style={{ textAlign:'right', color:'var(--text-secondary)' }}>{b.empty ? '0.00' : b.total.toFixed(6)}</td>
                    <td style={{ textAlign:'right', fontWeight:600 }}>${b.usdValue < 0.01 ? '0.00' : b.usdValue.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Allocation pie */}
        <div style={{ background:'var(--bg-card)', borderRadius:'var(--radius-lg)', padding:'1.25rem', border:'1px solid var(--border)' }}>
          <div style={{ fontWeight:600, fontSize:14, marginBottom:14 }}>Allocation</div>
          {pieData.length === 0 ? (
            <div style={{ color:'var(--text-muted)', fontSize:13 }}>No assets to display</div>
          ) : (
            <div style={{ display:'flex', alignItems:'center', gap:16 }}>
              <ResponsiveContainer width={130} height={130}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={35} outerRadius={62} dataKey="value" strokeWidth={0}>
                    {pieData.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
                  </Pie>
                  <Tooltip formatter={v=>[`$${parseFloat(v).toFixed(2)}`]} contentStyle={{background:'var(--bg-card)',border:'1px solid var(--border)',fontSize:12}}/>
                </PieChart>
              </ResponsiveContainer>
              <div style={{ flex:1 }}>
                {pieData.map((d,i)=>(
                  <div key={d.name} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                    <div style={{ width:8, height:8, borderRadius:'50%', background:COLORS[i%COLORS.length] }}/>
                    <span style={{ fontSize:13, flex:1, fontWeight:500 }}>{d.name}</span>
                    <span style={{ fontSize:12, color:'var(--text-secondary)' }}>${d.value.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Open Positions */}
      {openPositions.length > 0 && (
        <div style={{ background:'var(--bg-card)', borderRadius:'var(--radius-lg)', padding:'1.25rem', border:'1px solid var(--border)' }}>
          <div style={{ fontWeight:600, fontSize:14, marginBottom:14 }}>Open Positions</div>
          <table style={{ width:'100%', fontSize:13, borderCollapse:'collapse' }}>
            <thead><tr style={{ fontSize:10, textTransform:'uppercase', color:'var(--text-muted)' }}>
              <td style={{paddingBottom:8}}>Pair</td><td>Side</td><td>Trader</td><td style={{textAlign:'right'}}>Entry</td><td style={{textAlign:'right'}}>Size</td><td style={{textAlign:'right'}}>P&L</td>
            </tr></thead>
            <tbody>
              {openPositions.map((p,i)=>(
                <tr key={i} style={{ borderTop:'1px solid var(--border)' }}>
                  <td style={{padding:'9px 0',fontWeight:700}}>{p.symbol}</td>
                  <td><span style={{fontSize:10,padding:'2px 8px',borderRadius:4,fontWeight:600,background:p.side==='long'?'var(--green-bg)':'var(--red-bg)',color:p.side==='long'?'var(--green)':'var(--red)'}}>{p.side.toUpperCase()}</span></td>
                  <td style={{color:'var(--text-muted)',fontSize:12}}>{p.traderName}</td>
                  <td style={{textAlign:'right',color:'var(--text-secondary)'}}>${p.entryPrice?.toLocaleString()}</td>
                  <td style={{textAlign:'right',color:'var(--text-secondary)'}}>${p.sizeUsd}</td>
                  <td style={{textAlign:'right',fontWeight:700,color:p.pnl>=0?'var(--green)':'var(--red)'}}>{p.pnl>=0?'+':''}{p.pnl?.toFixed(2)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Trade log */}
      {tradeLog.length > 0 && (
        <div style={{ background:'var(--bg-card)', borderRadius:'var(--radius-lg)', padding:'1.25rem', border:'1px solid var(--border)' }}>
          <div style={{ fontWeight:600, fontSize:14, marginBottom:14 }}>Trade History</div>
          <table style={{ width:'100%', fontSize:13, borderCollapse:'collapse' }}>
            <thead><tr style={{ fontSize:10, textTransform:'uppercase', color:'var(--text-muted)' }}>
              <td style={{paddingBottom:8}}>Time</td><td>Pair</td><td>Side</td><td>Trader</td><td style={{textAlign:'right'}}>P&L</td><td style={{textAlign:'right'}}>Status</td>
            </tr></thead>
            <tbody>
              {tradeLog.slice(0,20).map((t,i)=>(
                <tr key={i} style={{ borderTop:'1px solid var(--border)' }}>
                  <td style={{padding:'8px 0',fontSize:11,color:'var(--text-muted)'}}>{new Date(t.openedAt).toLocaleTimeString()}</td>
                  <td style={{fontWeight:600}}>{t.symbol}</td>
                  <td><span style={{fontSize:10,padding:'2px 6px',borderRadius:4,background:t.side==='long'?'var(--green-bg)':'var(--red-bg)',color:t.side==='long'?'var(--green)':'var(--red)',fontWeight:600}}>{t.side}</span></td>
                  <td style={{color:'var(--text-muted)',fontSize:12}}>{t.traderName}</td>
                  <td style={{textAlign:'right',color:(t.pnl||0)>=0?'var(--green)':'var(--red)',fontWeight:600}}>{t.pnl?(t.pnl>=0?'+':'')+t.pnl.toFixed(2)+'%':'—'}</td>
                  <td style={{textAlign:'right'}}><span style={{fontSize:10,padding:'2px 7px',borderRadius:4,background:t.status==='open'?'var(--green-bg)':t.status==='closed'?'var(--blue-bg)':'var(--red-bg)',color:t.status==='open'?'var(--green)':t.status==='closed'?'var(--blue)':'var(--red)',fontWeight:600}}>{t.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
