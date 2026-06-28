import { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis } from 'recharts';
import { api } from '../lib/api.js';

const COLORS = ['#22c55e','#3b82f6','#a855f7','#f59e0b','#ef4444','#06b6d4','#84cc16','#f97316'];

export default function Portfolio() {
  const [data, setData]    = useState(null);
  const [loading, setLoad] = useState(true);

  const load = () => {
    api.getPortfolio()
      .then(d => { setData(d); setLoad(false); })
      .catch(e => { setData({ error: e.message }); setLoad(false); });
  };

  useEffect(() => { load(); }, []);

  if (loading) return <Spinner/>;
  if (data?.error) return <div style={{color:'var(--red)',fontSize:13,padding:'2rem'}}>Error: {data.error}</div>;

  const { totalUsd=0, balances=[], pnlByMonth=[], demo, warnings=[], openPositions=[], tradeLog=[] } = data;
  const realBals = balances.filter(b => b.total > 0);
  const pieData  = realBals.map(b => ({ name:`${b.asset} (${b.exchange})`, value: parseFloat(b.usdValue.toFixed(4)) }));

  return (
    <div className="fade-in" style={{display:'flex',flexDirection:'column',gap:'1.25rem'}}>

      {/* Warnings (non-fatal) */}
      {warnings?.filter(w => w.exchange !== 'Setup').map((w,i) => (
        <div key={i} style={{background:'#1c1200',border:'1px solid #92400e',borderRadius:'var(--radius-md)',padding:'12px 16px'}}>
          <div style={{fontSize:12,fontWeight:600,color:'#fbbf24',marginBottom:2}}>⚠️ {w.exchange} connection issue</div>
          <div style={{fontSize:12,color:'#fcd34d'}}>{w.message}</div>
          {w.message.includes('unreachable') && (
            <div style={{fontSize:11,color:'#f59e0b',marginTop:6,paddingTop:6,borderTop:'1px solid #92400e'}}>
              This is a Vercel/AWS server-side geo-block — not a problem with your API key. Your key is correct. Bybit balances still load fine.
            </div>
          )}
        </div>
      ))}

      {!demo && warnings.length === 0 && (
        <div style={{background:'var(--green-bg)',border:'1px solid var(--green-dim)',borderRadius:'var(--radius-md)',padding:'10px 14px',fontSize:13,color:'var(--green)',fontWeight:500}}>
          ✅ Connected to {[...new Set(balances.map(b=>b.exchange))].join(' + ')} — showing real balances
        </div>
      )}

      {/* Summary */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12}}>
        {[
          {label:'Total Value',    val:`$${totalUsd.toLocaleString('en',{maximumFractionDigits:2})}`, color:demo?'var(--text-muted)':'var(--green)'},
          {label:'Open Positions', val:openPositions.length, color:'var(--text-primary)'},
          {label:'Trades Copied',  val:tradeLog.length,      color:'var(--text-primary)'},
          {label:'Account',        val:demo?'Demo':'Live',    color:demo?'var(--gold)':'var(--green)'},
        ].map((s,i)=>(
          <div key={i} style={{background:'var(--bg-card)',borderRadius:'var(--radius-lg)',padding:'1rem',border:'1px solid var(--border)'}}>
            <div style={{fontSize:11,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:6}}>{s.label}</div>
            <div style={{fontSize:22,fontWeight:700,color:s.color}}>{s.val}</div>
          </div>
        ))}
      </div>

      <div style={{display:'grid',gridTemplateColumns:'3fr 2fr',gap:'1.25rem'}}>
        {/* Balances table */}
        <div style={{background:'var(--bg-card)',borderRadius:'var(--radius-lg)',padding:'1.25rem',border:'1px solid var(--border)'}}>
          <div style={{fontWeight:600,fontSize:14,marginBottom:14,display:'flex',alignItems:'center',gap:8}}>
            Balances
            {!demo && <span style={{fontSize:11,background:'var(--green-bg)',color:'var(--green)',padding:'2px 8px',borderRadius:10,fontWeight:600}}>Live</span>}
            {demo && <span style={{fontSize:11,background:'#1c1800',color:'#fbbf24',padding:'2px 8px',borderRadius:10,fontWeight:600}}>Demo</span>}
          </div>
          {balances.length === 0 ? (
            <div style={{color:'var(--text-muted)',fontSize:13}}>No balances found. Add API keys in the API Keys tab.</div>
          ) : (
            <table style={{width:'100%',fontSize:13,borderCollapse:'collapse'}}>
              <thead>
                <tr style={{fontSize:10,textTransform:'uppercase',color:'var(--text-muted)'}}>
                  <td style={{paddingBottom:8}}>Asset</td>
                  <td>Exchange</td>
                  <td style={{textAlign:'right'}}>Balance</td>
                  <td style={{textAlign:'right'}}>Price</td>
                  <td style={{textAlign:'right'}}>Value</td>
                </tr>
              </thead>
              <tbody>
                {balances.map((b,i)=>(
                  <tr key={i} style={{borderTop:'1px solid var(--border)'}}>
                    <td style={{padding:'9px 0',fontWeight:600,display:'flex',alignItems:'center',gap:8}}>
                      <div style={{width:6,height:6,borderRadius:'50%',background:COLORS[i%COLORS.length],flexShrink:0}}/>
                      {b.asset}
                    </td>
                    <td style={{fontSize:11,color:'var(--text-muted)'}}>{b.exchange}</td>
                    <td style={{textAlign:'right',color:'var(--text-secondary)',fontFamily:'monospace'}}>{b.total === 0 ? '0.00' : b.total < 0.001 ? b.total.toFixed(8) : b.total.toFixed(6)}</td>
                    <td style={{textAlign:'right',color:'var(--text-secondary)'}}>{b.asset==='USDT'?'$1.00':`$${(b.price||0).toLocaleString('en',{maximumFractionDigits:2})}`}</td>
                    <td style={{textAlign:'right',fontWeight:600,color:b.usdValue>0?'var(--text-primary)':'var(--text-muted)'}}>
                      {b.usdValue < 0.01 ? '$0.00' : `$${b.usdValue.toFixed(2)}`}
                    </td>
                  </tr>
                ))}
                <tr style={{borderTop:'2px solid var(--border-light)'}}>
                  <td colSpan={4} style={{padding:'9px 0',fontWeight:700,fontSize:14}}>Total</td>
                  <td style={{textAlign:'right',fontWeight:800,fontSize:15,color:totalUsd>0?'var(--green)':'var(--text-muted)'}}>${totalUsd.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          )}
        </div>

        {/* Allocation + P&L */}
        <div style={{display:'flex',flexDirection:'column',gap:'1.25rem'}}>
          {pieData.length > 0 && (
            <div style={{background:'var(--bg-card)',borderRadius:'var(--radius-lg)',padding:'1.25rem',border:'1px solid var(--border)'}}>
              <div style={{fontWeight:600,fontSize:13,marginBottom:12}}>Allocation</div>
              <ResponsiveContainer width="100%" height={120}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={30} outerRadius={55} dataKey="value" strokeWidth={0}>
                    {pieData.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
                  </Pie>
                  <Tooltip formatter={v=>[`$${parseFloat(v).toFixed(4)}`]} contentStyle={{background:'var(--bg-card)',border:'1px solid var(--border)',fontSize:11}}/>
                </PieChart>
              </ResponsiveContainer>
              {pieData.map((d,i)=>(
                <div key={d.name} style={{display:'flex',alignItems:'center',gap:6,marginTop:6,fontSize:12}}>
                  <div style={{width:7,height:7,borderRadius:'50%',background:COLORS[i%COLORS.length],flexShrink:0}}/>
                  <span style={{flex:1,color:'var(--text-secondary)'}}>{d.name}</span>
                  <span style={{fontWeight:600}}>${d.value.toFixed(4)}</span>
                </div>
              ))}
            </div>
          )}

          <div style={{background:'var(--bg-card)',borderRadius:'var(--radius-lg)',padding:'1.25rem',border:'1px solid var(--border)'}}>
            <div style={{fontWeight:600,fontSize:13,marginBottom:12}}>Monthly P&L</div>
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={pnlByMonth} margin={{top:0,right:0,left:-24,bottom:0}}>
                <XAxis dataKey="month" tick={{fontSize:9,fill:'var(--text-muted)'}} axisLine={false} tickLine={false}/>
                <YAxis tick={{fontSize:9,fill:'var(--text-muted)'}} axisLine={false} tickLine={false} tickFormatter={v=>`${v}%`}/>
                <Tooltip formatter={v=>[`${v}%`,'P&L']} contentStyle={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:8,fontSize:11}}/>
                <Bar dataKey="pnl" radius={[3,3,0,0]}>
                  {pnlByMonth.map((_,i)=><Cell key={i} fill={pnlByMonth[i].pnl>=0?'#22c55e':'#ef4444'}/>)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Trade log */}
      {tradeLog.length > 0 && (
        <div style={{background:'var(--bg-card)',borderRadius:'var(--radius-lg)',padding:'1.25rem',border:'1px solid var(--border)'}}>
          <div style={{fontWeight:600,fontSize:14,marginBottom:14}}>Trade History</div>
          <table style={{width:'100%',fontSize:13,borderCollapse:'collapse'}}>
            <thead><tr style={{fontSize:10,textTransform:'uppercase',color:'var(--text-muted)'}}>
              <td style={{paddingBottom:8}}>Time</td><td>Pair</td><td>Side</td><td>Trader</td><td style={{textAlign:'right'}}>Entry</td><td style={{textAlign:'right'}}>P&L</td><td style={{textAlign:'right'}}>Status</td>
            </tr></thead>
            <tbody>
              {tradeLog.slice(0,20).map((t,i)=>(
                <tr key={i} style={{borderTop:'1px solid var(--border)'}}>
                  <td style={{padding:'8px 0',fontSize:11,color:'var(--text-muted)'}}>{new Date(t.openedAt).toLocaleTimeString()}</td>
                  <td style={{fontWeight:700}}>{t.symbol}</td>
                  <td><span style={{fontSize:10,padding:'2px 7px',borderRadius:4,background:t.side==='long'?'var(--green-bg)':'var(--red-bg)',color:t.side==='long'?'var(--green)':'var(--red)',fontWeight:600}}>{t.side}</span></td>
                  <td style={{color:'var(--text-muted)',fontSize:12}}>{t.traderName}</td>
                  <td style={{textAlign:'right',color:'var(--text-secondary)'}}>${t.entryPrice?.toLocaleString()}</td>
                  <td style={{textAlign:'right',fontWeight:700,color:(t.pnl||0)>=0?'var(--green)':'var(--red)'}}>{t.pnl?(t.pnl>=0?'+':'')+t.pnl.toFixed(2)+'%':'—'}</td>
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

function Spinner() {
  return <div style={{display:'flex',alignItems:'center',gap:10,color:'var(--text-muted)',fontSize:13,padding:'2rem'}}>
    <div style={{width:16,height:16,border:'2px solid var(--border)',borderTop:'2px solid var(--green)',borderRadius:'50%',animation:'spin 0.8s linear infinite'}}/>
    Fetching your balances…
  </div>;
}
