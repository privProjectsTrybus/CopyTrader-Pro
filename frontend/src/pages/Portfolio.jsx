import { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis } from 'recharts';
import { loadKeys, getBinanceBalances, getBybitBalances, getLivePrices } from '../lib/exchange.js';

const COLORS = ['#22c55e','#3b82f6','#a855f7','#f59e0b','#ef4444','#06b6d4','#84cc16','#f97316'];

const PNL_DATA = [{month:'Jul',pnl:3.1},{month:'Aug',pnl:-1.2},{month:'Sep',pnl:5.4},{month:'Oct',pnl:7.2},{month:'Nov',pnl:-0.8},{month:'Dec',pnl:4.1},{month:'Jan',pnl:6.3},{month:'Feb',pnl:2.9},{month:'Mar',pnl:8.1},{month:'Apr',pnl:-1.5},{month:'May',pnl:5.7},{month:'Jun',pnl:9.2}];

export default function Portfolio() {
  const [balances, setBalances] = useState([]);
  const [prices, setPrices]     = useState({});
  const [loading, setLoading]   = useState(true);
  const [errors, setErrors]     = useState([]);
  const [hasKeys, setHasKeys]   = useState(false);

  const load = async () => {
    setLoading(true);
    setErrors([]);
    const keys = loadKeys();
    const hasB = !!(keys.binanceKey && keys.binanceSecret);
    const hasBY = !!(keys.bybitKey && keys.bybitSecret);
    setHasKeys(hasB || hasBY);

    const [priceData] = await Promise.allSettled([getLivePrices()]);
    const p = priceData.status === 'fulfilled' ? priceData.value : {};
    setPrices(p);

    const allBalances = [];
    const errs = [];

    if (hasB) {
      try {
        const bals = await getBinanceBalances(keys.binanceKey, keys.binanceSecret);
        if (bals.length === 0) {
          allBalances.push({ asset:'USDT', free:0, locked:0, total:0, usdValue:0, price:1, exchange:'Binance', empty:true });
        } else {
          bals.forEach(b => {
            const total = parseFloat(b.free) + parseFloat(b.locked);
            const price = b.asset === 'USDT' ? 1 : (p[b.asset] || 0);
            allBalances.push({ asset:b.asset, free:parseFloat(b.free), locked:parseFloat(b.locked), total, usdValue:total*price, price, exchange:'Binance' });
          });
        }
      } catch (e) { errs.push(`Binance: ${e.message}`); }
    }

    if (hasBY) {
      try {
        const coins = await getBybitBalances(keys.bybitKey, keys.bybitSecret);
        if (coins.length === 0) {
          allBalances.push({ asset:'USDT', free:0, locked:0, total:0, usdValue:0, price:1, exchange:'Bybit', empty:true });
        } else {
          coins.forEach(c => {
            const total = parseFloat(c.walletBalance);
            const price = c.coin === 'USDT' ? 1 : (p[c.coin] || 0);
            allBalances.push({ asset:c.coin, free:parseFloat(c.availableToWithdraw??c.walletBalance), locked:parseFloat(c.locked??0), total, usdValue:total*price, price, exchange:'Bybit' });
          });
        }
      } catch (e) { errs.push(`Bybit: ${e.message}`); }
    }

    allBalances.sort((a,b) => b.usdValue - a.usdValue);
    setBalances(allBalances);
    setErrors(errs);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const totalUsd = balances.reduce((s,b) => s+b.usdValue, 0);
  const realBals = balances.filter(b => !b.empty && b.total > 0);
  const pieData  = realBals.map(b => ({ name:`${b.asset}`, value: parseFloat(b.usdValue.toFixed(4)) }));
  const exchanges = [...new Set(balances.map(b => b.exchange))];

  return (
    <div className="fade-in" style={{display:'flex',flexDirection:'column',gap:'1.25rem'}}>

      {!hasKeys && (
        <div style={{background:'#1c1800',border:'1px solid #92400e',borderRadius:'var(--radius-md)',padding:'14px 16px',display:'flex',alignItems:'center',gap:12}}>
          <span style={{fontSize:20}}>🔑</span>
          <div>
            <div style={{fontWeight:600,color:'#fcd34d',marginBottom:3}}>No API keys saved</div>
            <div style={{fontSize:12,color:'#f59e0b'}}>Go to <strong>API Keys</strong> tab → add your Binance and/or Bybit keys → click Save</div>
          </div>
        </div>
      )}

      {errors.length > 0 && errors.map((e,i) => (
        <div key={i} style={{background:'var(--red-bg)',border:'1px solid #7f1d1d',borderRadius:'var(--radius-md)',padding:'10px 14px',fontSize:12,color:'var(--red)'}}>❌ {e}</div>
      ))}

      {hasKeys && !loading && errors.length === 0 && (
        <div style={{background:'var(--green-bg)',border:'1px solid var(--green-dim)',borderRadius:'var(--radius-md)',padding:'10px 14px',fontSize:13,color:'var(--green)',fontWeight:500}}>
          ✅ Live balances from {exchanges.join(' + ')} — called directly from your browser
        </div>
      )}

      {/* Stats */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12}}>
        {[
          {label:'Total Value',    val: loading ? '…' : `$${totalUsd.toFixed(2)}`, color:totalUsd>0?'var(--green)':'var(--text-muted)'},
          {label:'Assets',         val: loading ? '…' : realBals.length,           color:'var(--text-primary)'},
          {label:'Exchanges',      val: loading ? '…' : exchanges.length,           color:'var(--text-primary)'},
          {label:'Status',         val: loading ? 'Loading' : hasKeys ? 'Live' : 'No keys', color:hasKeys&&!loading?'var(--green)':'var(--text-muted)'},
        ].map((s,i)=>(
          <div key={i} style={{background:'var(--bg-card)',borderRadius:'var(--radius-lg)',padding:'1rem',border:'1px solid var(--border)'}}>
            <div style={{fontSize:11,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:6}}>{s.label}</div>
            <div style={{fontSize:22,fontWeight:700,color:s.color}}>{s.val}</div>
          </div>
        ))}
      </div>

      {loading && (
        <div style={{display:'flex',alignItems:'center',gap:10,color:'var(--text-muted)',fontSize:13,padding:'1rem'}}>
          <div style={{width:16,height:16,border:'2px solid var(--border)',borderTop:'2px solid var(--green)',borderRadius:'50%',animation:'spin 0.8s linear infinite'}}/>
          Fetching balances from exchanges…
        </div>
      )}

      {!loading && (
        <div style={{display:'grid',gridTemplateColumns:'3fr 2fr',gap:'1.25rem'}}>
          {/* Balances table */}
          <div style={{background:'var(--bg-card)',borderRadius:'var(--radius-lg)',padding:'1.25rem',border:'1px solid var(--border)'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
              <div style={{fontWeight:600,fontSize:14}}>Balances</div>
              <button onClick={load} style={{fontSize:11,padding:'4px 10px',borderRadius:20,background:'var(--bg-hover)',color:'var(--text-muted)',border:'1px solid var(--border)',cursor:'pointer'}}>↻ Refresh</button>
            </div>
            {balances.length === 0 ? (
              <div style={{color:'var(--text-muted)',fontSize:13,textAlign:'center',padding:'2rem 0'}}>
                {hasKeys ? 'Your accounts appear to be empty' : 'Add API keys to see your balances'}
              </div>
            ) : (
              <table style={{width:'100%',fontSize:13,borderCollapse:'collapse'}}>
                <thead>
                  <tr style={{fontSize:10,textTransform:'uppercase',color:'var(--text-muted)'}}>
                    <td style={{paddingBottom:8}}>Asset</td><td>Exchange</td><td style={{textAlign:'right'}}>Balance</td><td style={{textAlign:'right'}}>Price</td><td style={{textAlign:'right'}}>Value</td>
                  </tr>
                </thead>
                <tbody>
                  {balances.map((b,i)=>(
                    <tr key={i} style={{borderTop:'1px solid var(--border)',opacity:b.empty?0.4:1}}>
                      <td style={{padding:'9px 0',fontWeight:600,display:'flex',alignItems:'center',gap:8}}>
                        <div style={{width:6,height:6,borderRadius:'50%',background:COLORS[i%COLORS.length],flexShrink:0}}/>
                        {b.asset}
                      </td>
                      <td style={{fontSize:11,color:'var(--text-muted)'}}>{b.exchange}</td>
                      <td style={{textAlign:'right',fontFamily:'monospace',color:'var(--text-secondary)',fontSize:12}}>
                        {b.empty ? '0.00000000' : b.total < 0.0001 ? b.total.toFixed(8) : b.total.toFixed(6)}
                      </td>
                      <td style={{textAlign:'right',color:'var(--text-secondary)'}}>
                        {b.asset==='USDT'?'$1.00':`$${(b.price||0).toLocaleString('en',{maximumFractionDigits:2})}`}
                      </td>
                      <td style={{textAlign:'right',fontWeight:600}}>
                        {b.usdValue<0.001?'$0.00':`$${b.usdValue.toFixed(b.usdValue<1?4:2)}`}
                      </td>
                    </tr>
                  ))}
                  {balances.length > 0 && (
                    <tr style={{borderTop:'2px solid var(--border-light)'}}>
                      <td colSpan={4} style={{padding:'9px 0',fontWeight:700,fontSize:14}}>Total</td>
                      <td style={{textAlign:'right',fontWeight:800,fontSize:15,color:totalUsd>0?'var(--green)':'var(--text-muted)'}}>${totalUsd.toFixed(2)}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>

          <div style={{display:'flex',flexDirection:'column',gap:'1.25rem'}}>
            {/* Pie chart */}
            {pieData.length > 0 && (
              <div style={{background:'var(--bg-card)',borderRadius:'var(--radius-lg)',padding:'1.25rem',border:'1px solid var(--border)'}}>
                <div style={{fontWeight:600,fontSize:13,marginBottom:12}}>Allocation</div>
                <ResponsiveContainer width="100%" height={130}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={32} outerRadius={58} dataKey="value" strokeWidth={0}>
                      {pieData.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
                    </Pie>
                    <Tooltip formatter={(v,n)=>[`$${parseFloat(v).toFixed(4)}`,n]} contentStyle={{background:'var(--bg-card)',border:'1px solid var(--border)',fontSize:11}}/>
                  </PieChart>
                </ResponsiveContainer>
                {pieData.map((d,i)=>(
                  <div key={d.name} style={{display:'flex',alignItems:'center',gap:6,marginTop:5,fontSize:12}}>
                    <div style={{width:7,height:7,borderRadius:'50%',background:COLORS[i%COLORS.length],flexShrink:0}}/>
                    <span style={{flex:1,color:'var(--text-secondary)'}}>{d.name}</span>
                    <span style={{fontWeight:600}}>${d.value.toFixed(4)}</span>
                  </div>
                ))}
              </div>
            )}

            {/* P&L chart */}
            <div style={{background:'var(--bg-card)',borderRadius:'var(--radius-lg)',padding:'1.25rem',border:'1px solid var(--border)'}}>
              <div style={{fontWeight:600,fontSize:13,marginBottom:12}}>Monthly P&L</div>
              <ResponsiveContainer width="100%" height={130}>
                <BarChart data={PNL_DATA} margin={{top:0,right:0,left:-24,bottom:0}}>
                  <XAxis dataKey="month" tick={{fontSize:9,fill:'var(--text-muted)'}} axisLine={false} tickLine={false}/>
                  <YAxis tick={{fontSize:9,fill:'var(--text-muted)'}} axisLine={false} tickLine={false} tickFormatter={v=>`${v}%`}/>
                  <Tooltip formatter={v=>[`${v}%`,'P&L']} contentStyle={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:8,fontSize:11}}/>
                  <Bar dataKey="pnl" radius={[3,3,0,0]}>
                    {PNL_DATA.map((_,i)=><Cell key={i} fill={PNL_DATA[i].pnl>=0?'#22c55e':'#ef4444'}/>)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
