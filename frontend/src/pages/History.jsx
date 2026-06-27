const TRADES = [
  { id:1, sym:'BTC/USDT', side:'long',  trader:'CryptoWolf_X', entry:61200, exit:63450, pnl:3.67,  pnlUsd:+183.2, dur:'4h 12m', date:'Today 10:42',   status:'closed' },
  { id:2, sym:'ETH/USDT', side:'long',  trader:'AlphaStocks',  entry:1710,  exit:1748,  pnl:2.22,  pnlUsd:+91.2,  dur:'2h 35m', date:'Today 08:15',   status:'closed' },
  { id:3, sym:'SOL/USDT', side:'short', trader:'BullRunKing',  entry:73.1,  exit:70.4,  pnl:3.69,  pnlUsd:+55.4,  dur:'6h 01m', date:'Yesterday',     status:'closed' },
  { id:4, sym:'BNB/USDT', side:'long',  trader:'CryptoWolf_X', entry:578,   exit:591,   pnl:2.25,  pnlUsd:+130.5, dur:'3h 18m', date:'Yesterday',     status:'closed' },
  { id:5, sym:'XRP/USDT', side:'long',  trader:'FX_Ninja99',   entry:0.515, exit:0.508, pnl:-1.36, pnlUsd:-34.0,  dur:'1h 02m', date:'2 days ago',    status:'stopped' },
  { id:6, sym:'ADA/USDT', side:'long',  trader:'MomentumMae',  entry:0.421, exit:0.438, pnl:4.04,  pnlUsd:+42.4,  dur:'12h 47m',date:'2 days ago',    status:'closed' },
  { id:7, sym:'BTC/USDT', side:'long',  trader:'CryptoWolf_X', entry:60100, exit:61800, pnl:2.83,  pnlUsd:+170.2, dur:'8h 22m', date:'3 days ago',    status:'closed' },
  { id:8, sym:'DOT/USDT', side:'short', trader:'TrendRider',   entry:8.42,  exit:8.12,  pnl:3.56,  pnlUsd:+30.0,  dur:'5h 10m', date:'3 days ago',    status:'closed' },
  { id:9, sym:'ETH/USDT', side:'long',  trader:'AlphaStocks',  entry:1690,  exit:1678,  pnl:-0.71, pnlUsd:-14.4,  dur:'0h 48m', date:'4 days ago',    status:'stopped' },
  {id:10, sym:'SOL/USDT', side:'long',  trader:'BullRunKing',  entry:68.4,  exit:71.9,  pnl:5.12,  pnlUsd:+105.0, dur:'9h 33m', date:'4 days ago',    status:'closed' },
];

export default function History() {
  const wins  = TRADES.filter(t=>t.pnl>0).length;
  const total = TRADES.length;
  const totalPnl = TRADES.reduce((s,t)=>s+t.pnlUsd,0);
  const avgPnl = TRADES.reduce((s,t)=>s+t.pnl,0)/total;

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      {/* Summary */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12 }}>
        {[
          {l:'Total trades',    v:total,                          c:'var(--text1)'},
          {l:'Win rate',        v:`${((wins/total)*100).toFixed(0)}%`,  c:'var(--green)'},
          {l:'Total P&L',       v:`+$${totalPnl.toFixed(1)}`,    c:'var(--green)'},
          {l:'Avg P&L/trade',   v:`+${avgPnl.toFixed(2)}%`,      c:'var(--green)'},
        ].map((s,i)=>(
          <div key={i} style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'var(--radius-lg)', padding:'16px 20px' }}>
            <div style={{ fontSize:10, color:'var(--text3)', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.8px', marginBottom:8 }}>{s.l}</div>
            <div style={{ fontSize:24, fontWeight:700, letterSpacing:'-0.5px', color:s.c }}>{s.v}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'var(--radius-lg)', padding:'20px' }}>
        <div style={{ fontSize:13, fontWeight:600, marginBottom:16 }}>All trades</div>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead>
            <tr style={{ fontSize:10, textTransform:'uppercase', letterSpacing:'0.8px', color:'var(--text3)', fontWeight:600 }}>
              <td style={{paddingBottom:10}}>Date</td><td>Pair</td><td>Side</td><td>Trader</td>
              <td style={{textAlign:'right'}}>Entry</td><td style={{textAlign:'right'}}>Exit</td>
              <td style={{textAlign:'right'}}>Duration</td><td style={{textAlign:'right'}}>P&L %</td>
              <td style={{textAlign:'right'}}>P&L $</td><td style={{textAlign:'right'}}>Status</td>
            </tr>
          </thead>
          <tbody>
            {TRADES.map((t)=>(
              <tr key={t.id} style={{ borderTop:'1px solid var(--border)' }}>
                <td style={{ padding:'10px 0', fontSize:11, color:'var(--text3)', whiteSpace:'nowrap' }}>{t.date}</td>
                <td style={{ fontWeight:700, fontFamily:'var(--mono)', fontSize:13 }}>{t.sym}</td>
                <td><span style={{ fontSize:10, padding:'2px 7px', borderRadius:4, fontWeight:700, background:t.side==='long'?'var(--green-bg)':'var(--red-bg)', color:t.side==='long'?'var(--green)':'var(--red)', textTransform:'uppercase' }}>{t.side}</span></td>
                <td style={{ fontSize:12, color:'var(--text3)' }}>{t.trader}</td>
                <td style={{ textAlign:'right', fontFamily:'var(--mono)', fontSize:12, color:'var(--text2)' }}>${t.entry}</td>
                <td style={{ textAlign:'right', fontFamily:'var(--mono)', fontSize:12, color:'var(--text2)' }}>${t.exit}</td>
                <td style={{ textAlign:'right', fontSize:11, color:'var(--text3)' }}>{t.dur}</td>
                <td style={{ textAlign:'right', fontFamily:'var(--mono)', fontWeight:700, color:t.pnl>=0?'var(--green)':'var(--red)' }}>{t.pnl>=0?'+':''}{t.pnl}%</td>
                <td style={{ textAlign:'right', fontFamily:'var(--mono)', fontWeight:700, color:t.pnlUsd>=0?'var(--green)':'var(--red)' }}>{t.pnlUsd>=0?'+$':'−$'}{Math.abs(t.pnlUsd)}</td>
                <td style={{ textAlign:'right' }}>
                  <span style={{ fontSize:10, padding:'2px 8px', borderRadius:4, fontWeight:600,
                    background:t.status==='closed'?'#082f49':t.status==='stopped'?'var(--red-bg)':'var(--green-bg)',
                    color:t.status==='closed'?'var(--blue)':t.status==='stopped'?'var(--red)':'var(--green)'
                  }}>{t.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
