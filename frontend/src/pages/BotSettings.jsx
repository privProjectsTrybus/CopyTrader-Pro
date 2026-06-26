import { useState } from 'react';

export default function BotSettings() {
  const [settings, setSettings] = useState({
    copyMode: 'proportional',
    maxTradeSize: 500,
    autoStopLoss: 0.02,
    copyCloses: true,
    pauseOnDrawdown: 0.05,
    assetFilter: 'all',
    running: true,
  });
  const [saved, setSaved] = useState(false);
  const [copying] = useState(['CryptoWolf_X','AlphaStocks','BullRunKing']);

  const save = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'1.25rem', maxWidth:640 }}>
      {/* Status */}
      <div style={card}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
          <div>
            <div style={{ fontWeight:500, marginBottom:4 }}>Bot engine</div>
            <div style={{ fontSize:12, color:'var(--color-text-tertiary)' }}>Copying {copying.length} traders · {settings.running ? 'Running' : 'Stopped'}</div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <span style={{ fontSize:12, color:settings.running?'#4ade80':'#f87171' }}>{settings.running?'● Running':'● Stopped'}</span>
            <button onClick={() => setSettings(p=>({...p,running:!p.running}))} style={{
              fontSize:13, padding:'6px 16px', borderRadius:'var(--border-radius-md)', border:'0.5px solid', cursor:'pointer', fontWeight:500,
              background:settings.running?'#450a0a':'#14532d', color:settings.running?'#f87171':'#4ade80',
              borderColor:settings.running?'#7f1d1d':'#166534',
            }}>
              {settings.running ? 'Stop bot' : 'Start bot'}
            </button>
          </div>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
          {[{label:'Copying',val:copying.length},{label:'Open positions',val:3},{label:'Trades today',val:7}].map(s=>(
            <div key={s.label} style={{ background:'var(--color-background-primary)', borderRadius:6, padding:'8px 10px' }}>
              <div style={{ fontSize:10, color:'var(--color-text-tertiary)', marginBottom:2 }}>{s.label}</div>
              <div style={{ fontSize:18, fontWeight:600 }}>{s.val}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Currently copying */}
      <div style={card}>
        <div style={{ fontWeight:500, fontSize:13, marginBottom:12 }}>Currently copying</div>
        {copying.map((name,i) => (
          <div key={i} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'9px 0', borderBottom: i<copying.length-1?'0.5px solid var(--color-border-tertiary)':'none' }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ width:32, height:32, borderRadius:'50%', background:'#14532d', color:'#4ade80', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:600 }}>
                {name.slice(0,2).toUpperCase()}
              </div>
              <div style={{ fontWeight:500, fontSize:13 }}>{name}</div>
            </div>
            <button style={{ fontSize:11, padding:'3px 10px', borderRadius:20, background:'#450a0a', color:'#f87171', border:'0.5px solid #7f1d1d', cursor:'pointer' }}>Stop</button>
          </div>
        ))}
      </div>

      {/* Copy mode */}
      <div style={card}>
        <ST title="Copy mode" desc="How trade sizes are calculated relative to the original trader." />
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
          {[
            {val:'proportional',label:'Proportional',desc:'Mirror % of portfolio'},
            {val:'fixed',       label:'Fixed amount', desc:'Fixed USD per trade'},
            {val:'fixedLot',    label:'Fixed lot',    desc:'Exact same quantity'},
          ].map(m=>(
            <button key={m.val} onClick={()=>setSettings(p=>({...p,copyMode:m.val}))} style={{
              background:'var(--color-background-primary)', borderRadius:'var(--border-radius-md)', padding:'10px 12px', cursor:'pointer', textAlign:'left',
              border: settings.copyMode===m.val ? '1.5px solid #4ade80' : '0.5px solid var(--color-border-secondary)',
            }}>
              <div style={{ fontWeight:500, fontSize:13, marginBottom:4, color:'var(--color-text-primary)' }}>{m.label}</div>
              <div style={{ fontSize:11, color:'var(--color-text-tertiary)' }}>{m.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Risk limits */}
      <div style={card}>
        <ST title="Risk limits" desc="Automatic protections on all copied trades." />
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <Row label="Max trade size (USD)" desc="Maximum USD value per copied trade">
            <select value={settings.maxTradeSize} onChange={e=>setSettings(p=>({...p,maxTradeSize:parseInt(e.target.value)}))} style={sel}>
              {[100,250,500,1000,2500,5000].map(v=><option key={v} value={v}>${v.toLocaleString()}</option>)}
            </select>
          </Row>
          <Row label="Auto stop-loss" desc="Close if position drops below this %">
            <Toggle on={settings.autoStopLoss>0} onToggle={()=>setSettings(p=>({...p,autoStopLoss:p.autoStopLoss>0?0:0.02}))}/>
            {settings.autoStopLoss>0 && (
              <select value={settings.autoStopLoss} onChange={e=>setSettings(p=>({...p,autoStopLoss:parseFloat(e.target.value)}))} style={{...sel,marginLeft:8}}>
                {[0.01,0.02,0.03,0.05,0.1].map(v=><option key={v} value={v}>{(v*100).toFixed(0)}%</option>)}
              </select>
            )}
          </Row>
          <Row label="Copy trade closes" desc="Close position when trader closes theirs">
            <Toggle on={settings.copyCloses} onToggle={()=>setSettings(p=>({...p,copyCloses:!p.copyCloses}))}/>
          </Row>
          <Row label="Pause on drawdown" desc="Stop copying if portfolio drops this %">
            <Toggle on={settings.pauseOnDrawdown>0} onToggle={()=>setSettings(p=>({...p,pauseOnDrawdown:p.pauseOnDrawdown>0?0:0.05}))}/>
            {settings.pauseOnDrawdown>0 && (
              <select value={settings.pauseOnDrawdown} onChange={e=>setSettings(p=>({...p,pauseOnDrawdown:parseFloat(e.target.value)}))} style={{...sel,marginLeft:8}}>
                {[0.03,0.05,0.1,0.2].map(v=><option key={v} value={v}>{(v*100).toFixed(0)}%</option>)}
              </select>
            )}
          </Row>
        </div>
      </div>

      {/* Asset filter */}
      <div style={card}>
        <ST title="Asset filter" desc="Only copy trades for specific asset classes." />
        <div style={{ display:'flex', gap:8 }}>
          {[['all','All assets'],['crypto','₿ Crypto'],['stocks','📈 Stocks'],['forex','💱 Forex']].map(([v,l])=>(
            <button key={v} onClick={()=>setSettings(p=>({...p,assetFilter:v}))} style={{...chip,...(settings.assetFilter===v?chipActive:{})}}>
              {l}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display:'flex', justifyContent:'flex-end', gap:10, alignItems:'center' }}>
        {saved && <span style={{ fontSize:13, color:'#4ade80' }}>✓ Settings saved</span>}
        <button onClick={save} style={{ background:'#14532d', color:'#4ade80', border:'0.5px solid #166534', padding:'8px 24px', borderRadius:'var(--border-radius-md)', fontSize:13, cursor:'pointer', fontWeight:500 }}>
          Save settings
        </button>
      </div>
    </div>
  );
}

function ST({ title, desc }) {
  return <div style={{ marginBottom:14 }}><div style={{ fontWeight:500, fontSize:14, marginBottom:3 }}>{title}</div><div style={{ fontSize:12, color:'var(--color-text-tertiary)' }}>{desc}</div></div>;
}
function Row({ label, desc, children }) {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
      <div><div style={{ fontSize:13, fontWeight:500 }}>{label}</div><div style={{ fontSize:11, color:'var(--color-text-tertiary)', marginTop:1 }}>{desc}</div></div>
      <div style={{ display:'flex', alignItems:'center' }}>{children}</div>
    </div>
  );
}
function Toggle({ on, onToggle }) {
  return <div onClick={onToggle} style={{ width:36, height:20, borderRadius:10, background:on?'#16a34a':'var(--color-border-tertiary)', position:'relative', cursor:'pointer', transition:'background 0.2s', flexShrink:0 }}><div style={{ width:14, height:14, borderRadius:'50%', background:'white', position:'absolute', top:3, left:on?19:3, transition:'left 0.2s' }}/></div>;
}

const card = { background:'var(--color-background-secondary)', borderRadius:'var(--border-radius-lg)', border:'0.5px solid var(--color-border-tertiary)', padding:'1.25rem' };
const sel  = { background:'var(--color-background-primary)', border:'0.5px solid var(--color-border-secondary)', color:'var(--color-text-primary)', fontSize:12, padding:'5px 8px', borderRadius:'var(--border-radius-md)' };
const chip = { display:'inline-flex', background:'var(--color-background-primary)', border:'0.5px solid var(--color-border-secondary)', borderRadius:20, padding:'6px 14px', fontSize:12, color:'var(--color-text-secondary)', cursor:'pointer' };
const chipActive = { borderColor:'#4ade80', color:'#4ade80', background:'#14532d' };
