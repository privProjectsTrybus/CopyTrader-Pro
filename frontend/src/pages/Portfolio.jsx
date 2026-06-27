import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, AreaChart, Area, XAxis, YAxis } from 'recharts';

const PNL_DATA = [
  {m:'Jul',v:3.1},{m:'Aug',v:-1.2},{m:'Sep',v:5.4},{m:'Oct',v:7.2},
  {m:'Nov',v:-0.8},{m:'Dec',v:4.1},{m:'Jan',v:6.3},{m:'Feb',v:2.9},
  {m:'Mar',v:8.1},{m:'Apr',v:-1.5},{m:'May',v:5.7},{m:'Jun',v:9.2},
];

const PALETTE = ['#22c55e','#3b82f6','#a855f7','#f97316','#ef4444','#22d3ee','#eab308','#86efac'];

export default function Portfolio({ prices }) {
  const btc = prices?.bitcoin?.usd     || 63450;
  const eth = prices?.ethereum?.usd    || 1672;
  const sol = prices?.solana?.usd      || 70.1;
  const bnb = prices?.binancecoin?.usd || 582;

  const balances = [
    { asset:'USDT', amount:10000,  price:1,   exchange:'Binance' },
    { asset:'BTC',  amount:0.1,    price:btc, exchange:'Binance' },
    { asset:'ETH',  amount:1.2,    price:eth, exchange:'Binance' },
    { asset:'SOL',  amount:15,     price:sol, exchange:'Bybit'   },
    { asset:'BNB',  amount:1.2,    price:bnb, exchange:'Binance' },
  ].map(b => ({ ...b, value: b.amount * b.price })).sort((a,b) => b.value - a.value);

  const total = balances.reduce((s,b) => s + b.value, 0);
  const pieData = balances.map(b => ({ name:b.asset, value: parseFloat(b.value.toFixed(2)) }));

  const positions = [
    { sym:'BTC/USDT', side:'long',  entry:62100, current:63450, pnlPct:2.17,  pnlUsd:+134.9, trader:'CryptoWolf_X',  opened:'2h ago' },
    { sym:'ETH/USDT', side:'long',  entry:1640,  current:1672,  pnlPct:1.95,  pnlUsd:+38.4,  trader:'AlphaStocks',   opened:'5h ago' },
    { sym:'SOL/USDT', side:'short', entry:71.2,  current:70.1,  pnlPct:1.54,  pnlUsd:+24.8,  trader:'BullRunKing',   opened:'30m ago'},
  ];

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      {/* Summary */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12 }}>
        {[
          { l:'Total Value',    v:`$${total.toLocaleString('en',{maximumFractionDigits:0})}`,  c:'var(--green)' },
          { l:'Month P&L',      v:'+9.2%',   c:'var(--green)' },
          { l:'Open Positions', v:'3',        c:'var(--text1)' },
          { l:'Unrealised P&L', v:'+$198.1', c:'var(--green)' },
        ].map((s,i)=>(
          <div key={i} style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'var(--radius-lg)', padding:'16px 20px' }}>
            <div style={{ fontSize:10, color:'var(--text3)', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.8px', marginBottom:8 }}>{s.l}</div>
            <div style={{ fontSize:24, fontWeight:700, letterSpacing:'-0.5px', color:s.c }}>{s.v}</div>
          </div>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
        {/* Allocation */}
        <div style={card}>
          <div style={ch}><span style={ct}>Allocation</span><span style={{ fontFamily:'var(--mono)', fontWeight:700, color:'var(--green)' }}>${total.toLocaleString('en',{maximumFractionDigits:0})}</span></div>
          <div style={{ display:'flex', alignItems:'center', gap:20 }}>
            <ResponsiveContainer width={130} height={130}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={36} outerRadius={60} dataKey="value" strokeWidth={0}>
                  {pieData.map((_,i)=><Cell key={i} fill={PALETTE[i]}/>)}
                </Pie>
                <Tooltip formatter={v=>[`$${parseFloat(v).toLocaleString('en',{maximumFractionDigits:0})}`]} contentStyle={{ background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:'var(--radius)', fontSize:12 }}/>
              </PieChart>
            </ResponsiveContainer>
            <div style={{ flex:1 }}>
              {balances.map((b,i)=>(
                <div key={b.asset} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                  <div style={{ width:8, height:8, borderRadius:'50%', background:PALETTE[i], flexShrink:0 }}/>
                  <span style={{ fontWeight:600, width:36, fontSize:13 }}>{b.asset}</span>
                  <span style={{ fontFamily:'var(--mono)', fontSize:12, color:'var(--text2)', flex:1 }}>${b.value.toLocaleString('en',{maximumFractionDigits:0})}</span>
                  <span style={{ fontSize:11, color:'var(--text3)', width:34, textAlign:'right' }}>{((b.value/total)*100).toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* P&L */}
        <div style={card}>
          <div style={ch}><span style={ct}>Monthly P&L</span><span style={{ fontSize:13, color:'var(--green)', fontWeight:600 }}>+47.8% YTD</span></div>
          <ResponsiveContainer width="100%" height={140}>
            <AreaChart data={PNL_DATA} margin={{top:0,right:0,left:-20,bottom:0}}>
              <defs>
                <linearGradient id="pnlG" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--green)" stopOpacity={0.3}/>
                  <stop offset="100%" stopColor="var(--green)" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="m" tick={{fontSize:10,fill:'var(--text3)'}} axisLine={false} tickLine={false}/>
              <YAxis tick={{fontSize:10,fill:'var(--text3)'}} axisLine={false} tickLine={false} tickFormatter={v=>`${v}%`}/>
              <Tooltip formatter={v=>[`${v}%`,'P&L']} contentStyle={{ background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:'var(--radius)', fontSize:12 }}/>
              <Area type="monotone" dataKey="v" stroke="var(--green)" strokeWidth={2} fill="url(#pnlG)"/>
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Balances */}
      <div style={card}>
        <div style={ch}><span style={ct}>Balances</span><span style={{ fontSize:12, color:'var(--text3)' }}>Prices updating live</span></div>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead>
            <tr style={{ fontSize:10, textTransform:'uppercase', letterSpacing:'0.8px', color:'var(--text3)', fontWeight:600 }}>
              <td style={{paddingBottom:10}}>Asset</td><td>Exchange</td><td style={{textAlign:'right'}}>Balance</td><td style={{textAlign:'right'}}>Price</td><td style={{textAlign:'right'}}>Value</td><td style={{textAlign:'right'}}>Allocation</td>
            </tr>
          </thead>
          <tbody>
            {balances.map((b,i)=>(
              <tr key={b.asset} style={{ borderTop:'1px solid var(--border)' }}>
                <td style={{ padding:'11px 0', display:'flex', alignItems:'center', gap:10 }}>
                  <div style={{ width:8, height:8, borderRadius:'50%', background:PALETTE[i] }}/>
                  <span style={{ fontWeight:700 }}>{b.asset}</span>
                </td>
                <td style={{ fontSize:11, color:'var(--text3)' }}>{b.exchange}</td>
                <td style={{ textAlign:'right', fontFamily:'var(--mono)', fontSize:13, color:'var(--text2)' }}>{b.amount.toFixed(b.asset==='USDT'?2:4)}</td>
                <td style={{ textAlign:'right', fontFamily:'var(--mono)', fontSize:13, color:'var(--text2)' }}>{b.asset==='USDT'?'$1.00':`$${b.price.toLocaleString('en',{maximumFractionDigits:2})}`}</td>
                <td style={{ textAlign:'right', fontFamily:'var(--mono)', fontWeight:600 }}>${b.value.toLocaleString('en',{maximumFractionDigits:2})}</td>
                <td style={{ textAlign:'right' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:6, justifyContent:'flex-end' }}>
                    <div style={{ width:48, height:4, borderRadius:2, background:'var(--border)' }}>
                      <div style={{ width:`${(b.value/total)*100}%`, height:'100%', borderRadius:2, background:PALETTE[i] }}/>
                    </div>
                    <span style={{ fontSize:11, color:'var(--text3)', width:32, textAlign:'right' }}>{((b.value/total)*100).toFixed(1)}%</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Open positions */}
      <div style={card}>
        <div style={ch}><span style={ct}>Open positions</span><span style={{ fontSize:12, color:'var(--green)', fontWeight:600 }}>All profitable</span></div>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead>
            <tr style={{ fontSize:10, textTransform:'uppercase', letterSpacing:'0.8px', color:'var(--text3)', fontWeight:600 }}>
              <td style={{paddingBottom:10}}>Pair</td><td>Side</td><td>Trader</td><td>Opened</td><td style={{textAlign:'right'}}>Entry</td><td style={{textAlign:'right'}}>Current</td><td style={{textAlign:'right'}}>P&L %</td><td style={{textAlign:'right'}}>P&L $</td>
            </tr>
          </thead>
          <tbody>
            {positions.map((p,i)=>(
              <tr key={i} style={{ borderTop:'1px solid var(--border)' }}>
                <td style={{ padding:'11px 0', fontWeight:700, fontFamily:'var(--mono)', fontSize:13 }}>{p.sym}</td>
                <td><span style={{ fontSize:10, padding:'2px 8px', borderRadius:4, fontWeight:700, background:p.side==='long'?'var(--green-bg)':'var(--red-bg)', color:p.side==='long'?'var(--green)':'var(--red)', textTransform:'uppercase' }}>{p.side}</span></td>
                <td style={{ fontSize:12, color:'var(--text3)' }}>{p.trader}</td>
                <td style={{ fontSize:11, color:'var(--text3)' }}>{p.opened}</td>
                <td style={{ textAlign:'right', fontFamily:'var(--mono)', fontSize:12, color:'var(--text2)' }}>${p.entry.toLocaleString()}</td>
                <td style={{ textAlign:'right', fontFamily:'var(--mono)', fontSize:12, color:'var(--text2)' }}>${p.current.toLocaleString()}</td>
                <td style={{ textAlign:'right', fontFamily:'var(--mono)', fontWeight:700, color:'var(--green)' }}>+{p.pnlPct}%</td>
                <td style={{ textAlign:'right', fontFamily:'var(--mono)', fontWeight:700, color:'var(--green)' }}>+${p.pnlUsd}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const card = { background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'var(--radius-lg)', padding:'20px' };
const ch = { display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 };
const ct = { fontSize:13, fontWeight:600 };
