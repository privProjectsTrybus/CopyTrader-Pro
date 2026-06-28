import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';

const PAIRS = ['BTCUSDT','ETHUSDT','SOLUSDT','BNBUSDT','XRPUSDT','ADAUSDT','DOGEUSDT'];

export default function BotSettings() {
  const [status, setStatus]   = useState(null);
  const [settings, setSettings] = useState({ copyMode:'proportional', maxTradeUsd:100, autoStopLoss:2, copyCloses:true, assetFilter:'all' });
  const [saved, setSaved]     = useState('');
  const [loading, setLoad]    = useState(true);
  const [manualTrade, setMT]  = useState({ symbol:'BTCUSDT', side:'long', price:62000 });
  const [executing, setExec]  = useState(false);
  const [tradeResult, setTR]  = useState(null);

  const load = () => api.getBotStatus().then(s => { setStatus(s); setSettings(s.settings); setLoad(false); }).catch(() => setLoad(false));
  useEffect(() => { load(); const t = setInterval(load, 5000); return () => clearInterval(t); }, []);

  const save = async () => {
    await api.updateSettings(settings).catch(()=>{});
    setSaved('✓ Saved'); setTimeout(()=>setSaved(''), 2000);
  };

  const stopCopying = async (id) => {
    await api.stopCopying(id).catch(()=>{});
    load();
  };

  const executeTrade = async () => {
    setExec(true); setTR(null);
    try {
      const r = await api.executeTrade({
        traderId: 'manual', traderName: 'Manual Trade',
        symbol: manualTrade.symbol, side: manualTrade.side,
        action: 'open', currentPrice: parseFloat(manualTrade.price),
        exchange: 'binance',
      });
      setTR(r);
    } catch (e) { setTR({ error: e.message }); }
    finally { setExec(false); load(); }
  };

  if (loading) return <div style={{color:'var(--text-muted)',fontSize:13,padding:'2rem'}}>Loading bot status…</div>;

  const traders = status?.copiedTraders || [];
  const positions = status?.openPositions || [];

  return (
    <div className="fade-in" style={{display:'flex',flexDirection:'column',gap:'1.25rem',maxWidth:700}}>
      {/* Connection status */}
      <div style={{background:'var(--bg-card)',borderRadius:'var(--radius-lg)',padding:'1.25rem',border:'1px solid var(--border)'}}>
        <div style={{fontWeight:600,fontSize:14,marginBottom:14}}>Exchange Connection</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
          {[
            {name:'Binance',connected:status?.binanceConnected,key:'BINANCE_API_KEY'},
            {name:'Bybit',  connected:status?.bybitConnected,  key:'BYBIT_API_KEY'},
          ].map(ex=>(
            <div key={ex.name} style={{background:'var(--bg-hover)',borderRadius:'var(--radius-md)',padding:'12px 14px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <div>
                <div style={{fontWeight:600,fontSize:13}}>{ex.name}</div>
                <div style={{fontSize:11,color:'var(--text-muted)',marginTop:2}}>Spot trading</div>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:6,fontSize:12,fontWeight:600,color:ex.connected?'var(--green)':'var(--text-muted)'}}>
                <span style={{width:7,height:7,borderRadius:'50%',background:ex.connected?'var(--green)':'var(--border-light)',display:'inline-block'}}/>
                {ex.connected?'Connected':'No key'}
              </div>
            </div>
          ))}
        </div>
        {!status?.hasKeys && (
          <div style={{marginTop:12,fontSize:12,color:'var(--gold)',background:'#1c1800',border:'1px solid #92400e',borderRadius:'var(--radius-sm)',padding:'10px 12px'}}>
            ⚠️ Add your API keys in the <strong>API Keys</strong> tab to enable real trading
          </div>
        )}
      </div>

      {/* Currently copying */}
      <div style={{background:'var(--bg-card)',borderRadius:'var(--radius-lg)',padding:'1.25rem',border:'1px solid var(--border)'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
          <div style={{fontWeight:600,fontSize:14}}>Active Copies</div>
          <span style={{fontSize:11,background:traders.length>0?'var(--green-bg)':'var(--bg-hover)',color:traders.length>0?'var(--green)':'var(--text-muted)',padding:'3px 10px',borderRadius:10,fontWeight:600}}>
            {traders.length} copying
          </span>
        </div>
        {traders.length === 0 ? (
          <div style={{color:'var(--text-muted)',fontSize:13}}>
            No traders being copied. Go to <strong>Top Traders</strong> and click "Copy trader" to start.
          </div>
        ) : (
          traders.map((t,i)=>(
            <div key={t.id} style={{display:'flex',alignItems:'center',gap:12,padding:'10px 0',borderBottom:i<traders.length-1?'1px solid var(--border)':'none'}}>
              <div style={{width:36,height:36,borderRadius:'50%',background:t.color||'var(--green-bg)',color:t.textColor||'var(--green)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:700}}>
                {(t.name||t.id).slice(0,2).toUpperCase()}
              </div>
              <div style={{flex:1}}>
                <div style={{fontWeight:600,fontSize:13}}>{t.name}</div>
                <div style={{fontSize:11,color:'var(--text-muted)',marginTop:1}}>{t.source} · {t.tradeCount||0} trades copied · added {new Date(t.addedAt).toLocaleDateString()}</div>
              </div>
              <button onClick={()=>stopCopying(t.id)} style={{fontSize:11,padding:'5px 12px',borderRadius:20,background:'var(--red-bg)',color:'var(--red)',border:'1px solid #7f1d1d',cursor:'pointer',fontWeight:600}}>
                Stop
              </button>
            </div>
          ))
        )}
      </div>

      {/* Open positions */}
      {positions.length > 0 && (
        <div style={{background:'var(--bg-card)',borderRadius:'var(--radius-lg)',padding:'1.25rem',border:'1px solid var(--border)'}}>
          <div style={{fontWeight:600,fontSize:14,marginBottom:14}}>Open Positions</div>
          {positions.map((p,i)=>(
            <div key={i} style={{display:'flex',alignItems:'center',gap:10,padding:'9px 0',borderBottom:i<positions.length-1?'1px solid var(--border)':'none',fontSize:13}}>
              <span style={{fontWeight:700,flex:1}}>{p.symbol}</span>
              <span style={{fontSize:10,padding:'2px 8px',borderRadius:4,fontWeight:600,background:p.side==='long'?'var(--green-bg)':'var(--red-bg)',color:p.side==='long'?'var(--green)':'var(--red)'}}>{p.side.toUpperCase()}</span>
              <span style={{color:'var(--text-secondary)'}}>${p.entryPrice?.toLocaleString()}</span>
              <span style={{fontWeight:700,color:p.pnl>=0?'var(--green)':'var(--red)'}}>{p.pnl>=0?'+':''}{p.pnl?.toFixed(2)}%</span>
              <span style={{fontSize:11,color:'var(--text-muted)'}}>${p.sizeUsd}</span>
            </div>
          ))}
        </div>
      )}

      {/* Bot settings */}
      <div style={{background:'var(--bg-card)',borderRadius:'var(--radius-lg)',padding:'1.25rem',border:'1px solid var(--border)'}}>
        <div style={{fontWeight:600,fontSize:14,marginBottom:14}}>Bot Settings</div>
        <div style={{display:'flex',flexDirection:'column',gap:16}}>
          <Row label="Trade size (USD)" desc="How much to spend per copied trade">
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <input type="number" value={settings.maxTradeUsd} onChange={e=>setSettings(p=>({...p,maxTradeUsd:parseInt(e.target.value)}))} min={10} max={10000} style={{...inp,width:90,textAlign:'right'}}/>
              <span style={{fontSize:12,color:'var(--text-muted)'}}>USD</span>
            </div>
          </Row>
          <Row label="Copy mode" desc="How position size is calculated">
            <select value={settings.copyMode} onChange={e=>setSettings(p=>({...p,copyMode:e.target.value}))} style={sel}>
              <option value="proportional">Proportional</option>
              <option value="fixed">Fixed amount</option>
            </select>
          </Row>
          <Row label="Auto stop-loss" desc="Close if position drops below this %">
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <Toggle on={settings.autoStopLoss>0} onToggle={()=>setSettings(p=>({...p,autoStopLoss:p.autoStopLoss>0?0:2}))}/>
              {settings.autoStopLoss>0 && <>
                <input type="number" value={settings.autoStopLoss} onChange={e=>setSettings(p=>({...p,autoStopLoss:parseFloat(e.target.value)}))} min={0.5} max={20} step={0.5} style={{...inp,width:70,textAlign:'right'}}/>
                <span style={{fontSize:12,color:'var(--text-muted)'}}>%</span>
              </>}
            </div>
          </Row>
          <Row label="Copy closes" desc="Close position when trader closes theirs">
            <Toggle on={settings.copyCloses} onToggle={()=>setSettings(p=>({...p,copyCloses:!p.copyCloses}))}/>
          </Row>
        </div>
        <div style={{display:'flex',justifyContent:'flex-end',marginTop:16,gap:10,alignItems:'center'}}>
          {saved && <span style={{fontSize:13,color:'var(--green)'}}>{saved}</span>}
          <button onClick={save} style={{background:'var(--green)',color:'#000',border:'none',padding:'9px 24px',borderRadius:'var(--radius-md)',fontSize:13,fontWeight:700,cursor:'pointer'}}>Save settings</button>
        </div>
      </div>

      {/* Manual trade */}
      <div style={{background:'var(--bg-card)',borderRadius:'var(--radius-lg)',padding:'1.25rem',border:'1px solid var(--border)'}}>
        <div style={{fontWeight:600,fontSize:14,marginBottom:6}}>Manual Trade</div>
        <div style={{fontSize:12,color:'var(--text-muted)',marginBottom:14}}>Execute a trade directly on your connected exchange.</div>
        <div style={{display:'grid',gridTemplateColumns:'2fr 1fr 2fr 1fr',gap:8,alignItems:'end'}}>
          <div>
            <label style={{fontSize:11,color:'var(--text-muted)',display:'block',marginBottom:5}}>Pair</label>
            <select value={manualTrade.symbol} onChange={e=>setMT(p=>({...p,symbol:e.target.value}))} style={sel}>
              {PAIRS.map(p=><option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label style={{fontSize:11,color:'var(--text-muted)',display:'block',marginBottom:5}}>Side</label>
            <select value={manualTrade.side} onChange={e=>setMT(p=>({...p,side:e.target.value}))} style={sel}>
              <option value="long">Long (Buy)</option>
              <option value="short">Short (Sell)</option>
            </select>
          </div>
          <div>
            <label style={{fontSize:11,color:'var(--text-muted)',display:'block',marginBottom:5}}>Price (USD)</label>
            <input type="number" value={manualTrade.price} onChange={e=>setMT(p=>({...p,price:e.target.value}))} style={{...inp,width:'100%'}}/>
          </div>
          <button onClick={executeTrade} disabled={executing||!status?.hasKeys} style={{
            background:executing?'var(--green-dim)':'var(--green)',color:'#000',border:'none',padding:'9px 16px',
            borderRadius:'var(--radius-md)',fontSize:13,fontWeight:700,cursor:executing?'wait':'pointer',
            opacity:!status?.hasKeys?0.4:1,
          }}>
            {executing?'…':'Execute'}
          </button>
        </div>
        {!status?.hasKeys && <div style={{fontSize:11,color:'var(--text-muted)',marginTop:8}}>Add API keys to enable trading</div>}
        {tradeResult && (
          <div style={{marginTop:12,padding:'10px 12px',borderRadius:'var(--radius-sm)',background:tradeResult.error?'var(--red-bg)':'var(--green-bg)',border:`1px solid ${tradeResult.error?'#7f1d1d':'var(--green-dim)'}`,fontSize:13,color:tradeResult.error?'var(--red)':'var(--green)'}}>
            {tradeResult.error ? `❌ ${tradeResult.error}` : `✅ Order placed · ${manualTrade.symbol} ${manualTrade.side.toUpperCase()} · $${settings.maxTradeUsd}`}
          </div>
        )}
      </div>
    </div>
  );
}

function Row({label,desc,children}){return(<div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}><div><div style={{fontSize:13,fontWeight:600}}>{label}</div><div style={{fontSize:11,color:'var(--text-muted)',marginTop:1}}>{desc}</div></div><div style={{display:'flex',alignItems:'center',gap:8}}>{children}</div></div>);}
function Toggle({on,onToggle}){return(<div onClick={onToggle} style={{width:38,height:21,borderRadius:11,background:on?'var(--green)':'var(--border)',position:'relative',cursor:'pointer',transition:'background 0.2s'}}><div style={{width:15,height:15,borderRadius:'50%',background:'white',position:'absolute',top:3,left:on?20:3,transition:'left 0.2s'}}/>  </div>);}

const inp={background:'var(--bg-hover)',border:'1px solid var(--border)',color:'var(--text-primary)',padding:'8px 10px',borderRadius:'var(--radius-sm)',fontSize:13};
const sel={...inp,width:'100%'};
