import { useState } from 'react';

export default function BotSettings({ botRunning, setBotRunning }) {
  const [s, setS] = useState({ mode:'proportional', maxSize:500, sl:0.02, copyClose:true, drawdown:0.05, filter:'all' });
  const [saved, setSaved] = useState(false);
  const copying = ['CryptoWolf_X', 'TrendRider', 'AlphaStocks'];

  const save = () => { setSaved(true); setTimeout(()=>setSaved(false), 2000); };
  const up = (k, v) => setS(p => ({...p, [k]:v}));

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16, maxWidth:660 }}>
      {/* Status card */}
      <div style={card}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
          <div>
            <div style={{ fontWeight:700, fontSize:15, marginBottom:4 }}>Bot engine</div>
            <div style={{ fontSize:12, color:'var(--text3)' }}>Copying {copying.length} traders · executes trades automatically</div>
          </div>
          <button onClick={()=>setBotRunning?.(!botRunning)} style={{
            padding:'8px 20px', borderRadius:20, border:'1.5px solid', cursor:'pointer', fontWeight:700, fontSize:13,
            background:botRunning?'var(--red-bg)':'var(--green-bg)',
            color:botRunning?'var(--red)':'var(--green)',
            borderColor:botRunning?'var(--red-dim)':'var(--green-dim)',
          }}>
            {botRunning ? '⏸ Pause bot' : '▶ Start bot'}
          </button>
        </div>

        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:20, padding:'10px 14px', background:'var(--bg3)', borderRadius:'var(--radius)', border:'1px solid var(--border)' }}>
          <div style={{ width:8, height:8, borderRadius:'50%', background:botRunning?'var(--green)':'var(--text3)', animation:botRunning?'pulse 2s infinite':'none', flexShrink:0 }}/>
          <span style={{ fontSize:13, color:botRunning?'var(--green)':'var(--text3)', fontWeight:600 }}>{botRunning ? 'Running' : 'Paused'}</span>
          <span style={{ fontSize:12, color:'var(--text3)', marginLeft:8 }}>
            {botRunning ? `Monitoring ${copying.length} traders for new positions` : 'No new trades will be copied while paused'}
          </span>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
          {[{l:'Copying',v:copying.length},{l:'Open positions',v:3},{l:'Trades today',v:7}].map(stat=>(
            <div key={stat.l} style={{ background:'var(--bg3)', borderRadius:'var(--radius)', padding:'12px 14px' }}>
              <div style={{ fontSize:10, color:'var(--text3)', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.8px', marginBottom:6 }}>{stat.l}</div>
              <div style={{ fontSize:22, fontWeight:700 }}>{stat.v}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Copying list */}
      <div style={card}>
        <div style={{ fontSize:13, fontWeight:600, marginBottom:14 }}>Traders being copied</div>
        {copying.map((name,i)=>(
          <div key={i} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 0', borderTop:i>0?'1px solid var(--border)':'none' }}>
            <div style={{ width:36, height:36, borderRadius:'50%', background:'var(--green-bg)', color:'var(--green)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700 }}>
              {name.slice(0,2).toUpperCase()}
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:600 }}>{name}</div>
              <div style={{ fontSize:11, color:'var(--text3)' }}>Auto-copying all trades</div>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:11, color:'var(--green)' }}>
              <div style={{ width:6, height:6, borderRadius:'50%', background:'var(--green)', animation:'pulse 2s infinite' }}/>
              Active
            </div>
            <button style={{ padding:'5px 12px', borderRadius:20, background:'var(--red-bg)', color:'var(--red)', border:'1px solid var(--red-dim)', fontSize:12, fontWeight:600, cursor:'pointer' }}>Stop</button>
          </div>
        ))}
      </div>

      {/* Copy mode */}
      <div style={card}>
        <STitle t="Copy mode" d="How trade size is calculated relative to the original trader." />
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
          {[
            {v:'proportional',l:'Proportional',d:'10% of their trade size'},
            {v:'fixed',       l:'Fixed amount', d:'Fixed USD per trade'},
            {v:'fixedLot',    l:'Fixed lot',    d:'Exact same quantity'},
          ].map(m=>(
            <button key={m.v} onClick={()=>up('mode',m.v)} style={{
              background:s.mode===m.v?'var(--green-bg)':'var(--bg3)', textAlign:'left',
              border:`1.5px solid ${s.mode===m.v?'var(--green-dim)':'var(--border)'}`,
              borderRadius:'var(--radius)', padding:'12px 14px', cursor:'pointer',
            }}>
              <div style={{ fontWeight:700, fontSize:13, color:s.mode===m.v?'var(--green)':'var(--text1)', marginBottom:4 }}>{m.l}</div>
              <div style={{ fontSize:11, color:'var(--text3)' }}>{m.d}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Risk */}
      <div style={card}>
        <STitle t="Risk controls" d="Automatic safeguards applied to all copied trades." />
        <div style={{ display:'flex', flexDirection:'column', gap:18 }}>
          <Row l="Max trade size" d="Maximum USD value per copied trade">
            <select value={s.maxSize} onChange={e=>up('maxSize',parseInt(e.target.value))} style={sel}>
              {[100,250,500,1000,2500,5000].map(v=><option key={v} value={v}>${v.toLocaleString()}</option>)}
            </select>
          </Row>
          <Row l="Auto stop-loss" d="Close trade if it drops this % from entry">
            <Toggle on={s.sl>0} toggle={()=>up('sl',s.sl>0?0:0.02)}/>
            {s.sl>0 && <select value={s.sl} onChange={e=>up('sl',parseFloat(e.target.value))} style={{...sel,marginLeft:10}}>
              {[0.01,0.02,0.03,0.05,0.1].map(v=><option key={v} value={v}>{(v*100).toFixed(0)}% SL</option>)}
            </select>}
          </Row>
          <Row l="Copy position closes" d="Close your trade when the copied trader exits">
            <Toggle on={s.copyClose} toggle={()=>up('copyClose',!s.copyClose)}/>
          </Row>
          <Row l="Pause on drawdown" d="Suspend copying if total portfolio drops this %">
            <Toggle on={s.drawdown>0} toggle={()=>up('drawdown',s.drawdown>0?0:0.05)}/>
            {s.drawdown>0 && <select value={s.drawdown} onChange={e=>up('drawdown',parseFloat(e.target.value))} style={{...sel,marginLeft:10}}>
              {[0.03,0.05,0.1,0.2].map(v=><option key={v} value={v}>{(v*100).toFixed(0)}% limit</option>)}
            </select>}
          </Row>
        </div>
      </div>

      {/* Asset filter */}
      <div style={card}>
        <STitle t="Asset filter" d="Limit which asset classes the bot copies." />
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          {[['all','All assets'],['crypto','Crypto only'],['spot','Spot only'],['futures','Futures only']].map(([v,l])=>(
            <button key={v} onClick={()=>up('filter',v)} style={{
              padding:'7px 14px', borderRadius:20, border:'1.5px solid', cursor:'pointer', fontSize:13, fontWeight:500,
              background:s.filter===v?'var(--green-bg)':'transparent',
              color:s.filter===v?'var(--green)':'var(--text2)',
              borderColor:s.filter===v?'var(--green-dim)':'var(--border2)',
            }}>{l}</button>
          ))}
        </div>
      </div>

      <div style={{ display:'flex', justifyContent:'flex-end', alignItems:'center', gap:12 }}>
        {saved && <span style={{ fontSize:13, color:'var(--green)', fontWeight:600 }}>✓ Settings saved</span>}
        <button onClick={save} style={{ background:'var(--green)', color:'#000', border:'none', padding:'10px 28px', borderRadius:'var(--radius)', fontSize:14, fontWeight:700, cursor:'pointer' }}>
          Save settings
        </button>
      </div>
    </div>
  );
}

const STitle = ({t,d}) => <div style={{marginBottom:14}}><div style={{fontWeight:700,fontSize:14,marginBottom:4}}>{t}</div><div style={{fontSize:12,color:'var(--text3)'}}>{d}</div></div>;
const Row = ({l,d,children}) => <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}><div><div style={{fontWeight:600,fontSize:13}}>{l}</div><div style={{fontSize:11,color:'var(--text3)',marginTop:2}}>{d}</div></div><div style={{display:'flex',alignItems:'center'}}>{children}</div></div>;
const Toggle = ({on,toggle}) => <div onClick={toggle} style={{width:40,height:22,borderRadius:11,background:on?'var(--green)':'var(--border2)',position:'relative',cursor:'pointer',transition:'background 0.2s',flexShrink:0}}><div style={{width:16,height:16,borderRadius:'50%',background:'white',position:'absolute',top:3,left:on?21:3,transition:'left 0.2s',boxShadow:'0 1px 3px rgba(0,0,0,0.3)'}}/></div>;

const card = { background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'var(--radius-lg)', padding:'20px' };
const sel  = { background:'var(--bg3)', border:'1px solid var(--border)', color:'var(--text1)', fontSize:13, padding:'6px 10px', borderRadius:'var(--radius)', outline:'none' };
