import { useState, useEffect, useRef } from 'react';
import { loadKeys, getBinanceBalances, getBybitBalances, placeBinanceOrder, placeBybitOrder, getTraderPositions } from '../lib/exchange.js';

// In-browser bot state
const BOT = {
  running: false,
  copiedTraders: {},
  openPositions: {},
  tradeLog: [],
  settings: { maxTradeUsd: 50, copyMode: 'fixed', autoStopLoss: 2, copyCloses: true },
  intervalId: null,
};

const PAIRS = ['BTCUSDT','ETHUSDT','SOLUSDT','BNBUSDT','XRPUSDT','ADAUSDT','DOGEUSDT'];

export default function BotSettings() {
  const [, forceUpdate] = useState(0);
  const [settings, setSettings]   = useState({ ...BOT.settings });
  const [saved, setSaved]         = useState('');
  const [keys, setKeys]           = useState({});
  const [executing, setExec]      = useState(false);
  const [tradeResult, setTR]      = useState(null);
  const [manualTrade, setMT]      = useState({ symbol:'BTCUSDT', side:'long' });
  const refresh = () => forceUpdate(n => n+1);

  useEffect(() => {
    setKeys(loadKeys());
    const t = setInterval(refresh, 3000);
    return () => clearInterval(t);
  }, []);

  const hasKeys = !!(keys.binanceKey || keys.bybitKey);

  const save = () => {
    Object.assign(BOT.settings, settings);
    setSaved('✓ Saved'); setTimeout(() => setSaved(''), 2000);
  };

  const stopCopying = (id) => {
    delete BOT.copiedTraders[id];
    if (Object.keys(BOT.copiedTraders).length === 0) {
      BOT.running = false;
      if (BOT.intervalId) { clearInterval(BOT.intervalId); BOT.intervalId = null; }
    }
    refresh();
  };

  const executeTrade = async () => {
    if (!hasKeys) return;
    setExec(true); setTR(null);
    const k = loadKeys();
    try {
      // Get current price
      const r = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${manualTrade.symbol}`);
      const { price } = await r.json();
      const currentPrice = parseFloat(price);

      let result;
      if (k.binanceKey) {
        result = await placeBinanceOrder(k.binanceKey, k.binanceSecret, { symbol: manualTrade.symbol, side: manualTrade.side, quoteQty: BOT.settings.maxTradeUsd });
      } else if (k.bybitKey) {
        result = await placeBybitOrder(k.bybitKey, k.bybitSecret, { symbol: manualTrade.symbol, side: manualTrade.side, quoteQty: BOT.settings.maxTradeUsd });
      }

      const posId = `manual_${manualTrade.symbol}_${Date.now()}`;
      BOT.openPositions[posId] = { id:posId, traderId:'manual', traderName:'Manual', symbol:manualTrade.symbol, side:manualTrade.side, entryPrice:currentPrice, sizeUsd:BOT.settings.maxTradeUsd, openedAt:Date.now(), status:'open', pnl:0, exchange:k.binanceKey?'binance':'bybit' };
      BOT.tradeLog.unshift({ ...BOT.openPositions[posId], type:'open' });
      setTR({ ok: true, msg: `✅ ${manualTrade.side.toUpperCase()} ${manualTrade.symbol} @ $${currentPrice.toLocaleString()} · $${BOT.settings.maxTradeUsd} placed` });
    } catch (e) {
      setTR({ ok: false, msg: `❌ ${e.message}` });
    } finally {
      setExec(false); refresh();
    }
  };

  const traders = Object.values(BOT.copiedTraders);
  const positions = Object.values(BOT.openPositions);

  return (
    <div className="fade-in" style={{display:'flex',flexDirection:'column',gap:'1.25rem',maxWidth:700}}>

      {/* Exchange status */}
      <div style={{background:'var(--bg-card)',borderRadius:'var(--radius-lg)',padding:'1.25rem',border:'1px solid var(--border)'}}>
        <div style={{fontWeight:600,fontSize:14,marginBottom:14}}>Exchange Connection</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
          {[
            {name:'Binance', connected:!!keys.binanceKey},
            {name:'Bybit',   connected:!!keys.bybitKey},
          ].map(ex=>(
            <div key={ex.name} style={{background:'var(--bg-hover)',borderRadius:'var(--radius-md)',padding:'12px 14px',display:'flex',alignItems:'center',justifyContent:'space-between',border:`1px solid ${ex.connected?'var(--green-dim)':'var(--border)'}`}}>
              <div>
                <div style={{fontWeight:600,fontSize:13}}>{ex.name}</div>
                <div style={{fontSize:11,color:ex.connected?'var(--green)':'var(--text-muted)'}}>{ex.connected?'Connected · Browser-side':'No key saved'}</div>
              </div>
              <div style={{width:8,height:8,borderRadius:'50%',background:ex.connected?'var(--green)':'var(--border-light)'}}/>
            </div>
          ))}
        </div>
        {!hasKeys && (
          <div style={{marginTop:12,fontSize:12,color:'#fcd34d',background:'#1c1800',border:'1px solid #92400e',borderRadius:'var(--radius-sm)',padding:'10px 12px'}}>
            ⚠️ Add your API keys in the <strong>API Keys</strong> tab to enable trading
          </div>
        )}
      </div>

      {/* Active copies */}
      <div style={{background:'var(--bg-card)',borderRadius:'var(--radius-lg)',padding:'1.25rem',border:'1px solid var(--border)'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
          <div style={{fontWeight:600,fontSize:14}}>Active Copies</div>
          <span style={{fontSize:11,background:traders.length>0?'var(--green-bg)':'var(--bg-hover)',color:traders.length>0?'var(--green)':'var(--text-muted)',padding:'3px 10px',borderRadius:10,fontWeight:600}}>
            {BOT.running ? `● Running · ${traders.length} trader${traders.length!==1?'s':''}` : traders.length > 0 ? `${traders.length} paused` : 'Idle'}
          </span>
        </div>
        {traders.length === 0 ? (
          <div style={{color:'var(--text-muted)',fontSize:13}}>
            No traders being copied. Go to <strong>Top Traders</strong> and click <strong>Copy trader</strong> to start.
          </div>
        ) : (
          traders.map((t,i)=>(
            <div key={t.id} style={{display:'flex',alignItems:'center',gap:12,padding:'10px 0',borderBottom:i<traders.length-1?'1px solid var(--border)':'none'}}>
              <div style={{width:36,height:36,borderRadius:'50%',background:t.color||'var(--green-bg)',color:t.textColor||'var(--green)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:700}}>
                {(t.name||t.id).slice(0,2).toUpperCase()}
              </div>
              <div style={{flex:1}}>
                <div style={{fontWeight:600,fontSize:13}}>{t.name}</div>
                <div style={{fontSize:11,color:'var(--text-muted)',marginTop:1}}>{t.source} · {t.tradeCount||0} trades · Added {new Date(t.addedAt).toLocaleDateString()}</div>
              </div>
              <button onClick={()=>stopCopying(t.id)} style={{fontSize:11,padding:'5px 12px',borderRadius:20,background:'var(--red-bg)',color:'var(--red)',border:'1px solid #7f1d1d',cursor:'pointer',fontWeight:600}}>Stop</button>
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
              <span style={{color:'var(--text-muted)',fontSize:12}}>${p.sizeUsd}</span>
              <span style={{fontWeight:700,color:p.pnl>=0?'var(--green)':'var(--red)'}}>{p.pnl>=0?'+':''}{p.pnl?.toFixed(2)}%</span>
            </div>
          ))}
        </div>
      )}

      {/* Settings */}
      <div style={{background:'var(--bg-card)',borderRadius:'var(--radius-lg)',padding:'1.25rem',border:'1px solid var(--border)'}}>
        <div style={{fontWeight:600,fontSize:14,marginBottom:14}}>Bot Settings</div>
        <div style={{display:'flex',flexDirection:'column',gap:16}}>
          <Row label="Trade size (USD)" desc="Spend this much USDT per copied trade">
            <div style={{display:'flex',alignItems:'center',gap:6}}>
              <input type="number" value={settings.maxTradeUsd} min={5} max={10000}
                onChange={e=>setSettings(p=>({...p,maxTradeUsd:parseInt(e.target.value)}))}
                style={{...inp,width:80,textAlign:'right'}}/>
              <span style={{fontSize:12,color:'var(--text-muted)'}}>USDT</span>
            </div>
          </Row>
          <Row label="Auto stop-loss" desc="Close position if it drops this many %">
            <Toggle on={settings.autoStopLoss>0} onToggle={()=>setSettings(p=>({...p,autoStopLoss:p.autoStopLoss>0?0:2}))}/>
            {settings.autoStopLoss>0 && (
              <input type="number" value={settings.autoStopLoss} min={0.5} max={50} step={0.5}
                onChange={e=>setSettings(p=>({...p,autoStopLoss:parseFloat(e.target.value)}))}
                style={{...inp,width:60,textAlign:'right',marginLeft:8}}/>
            )}
            {settings.autoStopLoss>0 && <span style={{fontSize:12,color:'var(--text-muted)',marginLeft:4}}>%</span>}
          </Row>
          <Row label="Copy closes" desc="Close your position when the trader closes theirs">
            <Toggle on={settings.copyCloses} onToggle={()=>setSettings(p=>({...p,copyCloses:!p.copyCloses}))}/>
          </Row>
        </div>
        <div style={{display:'flex',justifyContent:'flex-end',marginTop:16,gap:10,alignItems:'center'}}>
          {saved && <span style={{fontSize:13,color:'var(--green)'}}>{saved}</span>}
          <button onClick={save} style={{background:'var(--green)',color:'#000',border:'none',padding:'9px 24px',borderRadius:'var(--radius-md)',fontSize:13,fontWeight:700,cursor:'pointer'}}>Save</button>
        </div>
      </div>

      {/* Manual trade */}
      <div style={{background:'var(--bg-card)',borderRadius:'var(--radius-lg)',padding:'1.25rem',border:'1px solid var(--border)'}}>
        <div style={{fontWeight:600,fontSize:14,marginBottom:4}}>Manual Trade</div>
        <div style={{fontSize:12,color:'var(--text-muted)',marginBottom:14}}>Place a market order directly on your exchange now (uses your saved trade size of ${settings.maxTradeUsd} USDT).</div>
        <div style={{display:'grid',gridTemplateColumns:'2fr 1fr auto',gap:8,alignItems:'end'}}>
          <div>
            <label style={{fontSize:11,color:'var(--text-muted)',display:'block',marginBottom:5}}>Pair</label>
            <select value={manualTrade.symbol} onChange={e=>setMT(p=>({...p,symbol:e.target.value}))} style={{...inp,width:'100%'}}>
              {PAIRS.map(p=><option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label style={{fontSize:11,color:'var(--text-muted)',display:'block',marginBottom:5}}>Direction</label>
            <select value={manualTrade.side} onChange={e=>setMT(p=>({...p,side:e.target.value}))} style={{...inp,width:'100%'}}>
              <option value="long">BUY (Long)</option>
              <option value="short">SELL (Short)</option>
            </select>
          </div>
          <button onClick={executeTrade} disabled={executing||!hasKeys} style={{
            background:executing?'var(--green-dim)':'var(--green)',color:'#000',border:'none',
            padding:'9px 20px',borderRadius:'var(--radius-md)',fontSize:13,fontWeight:700,
            cursor:executing||!hasKeys?'not-allowed':'pointer',opacity:!hasKeys?0.4:1,
          }}>
            {executing?'Placing…':'Place Order'}
          </button>
        </div>
        {tradeResult && (
          <div style={{marginTop:10,padding:'10px 12px',borderRadius:'var(--radius-sm)',background:tradeResult.ok?'var(--green-bg)':'var(--red-bg)',border:`1px solid ${tradeResult.ok?'var(--green-dim)':'#7f1d1d'}`,fontSize:13,color:tradeResult.ok?'var(--green)':'var(--red)'}}>
            {tradeResult.msg}
          </div>
        )}
      </div>

      {/* Trade log */}
      {BOT.tradeLog.length > 0 && (
        <div style={{background:'var(--bg-card)',borderRadius:'var(--radius-lg)',padding:'1.25rem',border:'1px solid var(--border)'}}>
          <div style={{fontWeight:600,fontSize:14,marginBottom:14}}>Trade Log</div>
          {BOT.tradeLog.slice(0,10).map((t,i)=>(
            <div key={i} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 0',borderBottom:i<Math.min(9,BOT.tradeLog.length-1)?'1px solid var(--border)':'none',fontSize:12}}>
              <span style={{fontWeight:700,width:80}}>{t.symbol}</span>
              <span style={{fontSize:10,padding:'2px 6px',borderRadius:4,background:t.side==='long'?'var(--green-bg)':'var(--red-bg)',color:t.side==='long'?'var(--green)':'var(--red)',fontWeight:600}}>{t.side?.toUpperCase()}</span>
              <span style={{color:'var(--text-muted)',flex:1}}>{t.traderName}</span>
              <span style={{color:'var(--text-secondary)'}}>${t.entryPrice?.toLocaleString()}</span>
              <span style={{color:t.pnl>=0?'var(--green)':'var(--red)',fontWeight:600}}>{t.type==='open'?'opened':`${t.pnl>=0?'+':''}${t.pnl?.toFixed(2)}%`}</span>
              <span style={{color:'var(--text-muted)',fontSize:11}}>{new Date(t.openedAt).toLocaleTimeString()}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Expose BOT globally so Traders page can add to it
window._BOT = BOT;

function Row({label,desc,children}){return(<div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}><div><div style={{fontSize:13,fontWeight:600}}>{label}</div><div style={{fontSize:11,color:'var(--text-muted)',marginTop:1}}>{desc}</div></div><div style={{display:'flex',alignItems:'center',gap:8}}>{children}</div></div>);}
function Toggle({on,onToggle}){return(<div onClick={onToggle} style={{width:38,height:21,borderRadius:11,background:on?'var(--green)':'var(--border)',position:'relative',cursor:'pointer',transition:'background 0.2s',flexShrink:0}}><div style={{width:15,height:15,borderRadius:'50%',background:'white',position:'absolute',top:3,left:on?20:3,transition:'left 0.2s'}}/></div>);}
const inp={background:'var(--bg-hover)',border:'1px solid var(--border)',color:'var(--text-primary)',padding:'8px 10px',borderRadius:'var(--radius-sm)',fontSize:13};
