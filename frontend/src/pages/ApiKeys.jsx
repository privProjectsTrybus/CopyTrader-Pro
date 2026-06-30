import { useState, useEffect } from 'react';
import { saveKeys, loadKeys, clearKeys, getBinanceBalances, getBybitBalances } from '../lib/exchange.js';

export default function ApiKeys() {
  const [keys, setKeys]       = useState({ binanceKey:'', binanceSecret:'', bybitKey:'', bybitSecret:'' });
  const [saved, setSaved]     = useState(false);
  const [testing, setTesting] = useState({ binance:false, bybit:false });
  const [results, setResults] = useState({ binance:null, bybit:null });

  useEffect(() => {
    const stored = loadKeys();
    if (stored.binanceKey) setKeys(stored);
  }, []);

  const save = () => {
    saveKeys(keys);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const testBinance = async () => {
    if (!keys.binanceKey || !keys.binanceSecret) return;
    setTesting(p => ({ ...p, binance: true }));
    setResults(p => ({ ...p, binance: null }));
    try {
      const bals = await getBinanceBalances(keys.binanceKey, keys.binanceSecret);
      const total = bals.reduce((s, b) => s + parseFloat(b.free) + parseFloat(b.locked), 0);
      setResults(p => ({ ...p, binance: { ok: true, msg: `✅ Connected · ${bals.length} asset${bals.length !== 1 ? 's' : ''} with balance` } }));
    } catch (e) {
      setResults(p => ({ ...p, binance: { ok: false, msg: `❌ ${e.message}` } }));
    } finally {
      setTesting(p => ({ ...p, binance: false }));
    }
  };

  const testBybit = async () => {
    if (!keys.bybitKey || !keys.bybitSecret) return;
    setTesting(p => ({ ...p, bybit: true }));
    setResults(p => ({ ...p, bybit: null }));
    try {
      const bals = await getBybitBalances(keys.bybitKey, keys.bybitSecret);
      setResults(p => ({ ...p, bybit: { ok: true, msg: `✅ Connected · ${bals.length} asset${bals.length !== 1 ? 's' : ''} with balance` } }));
    } catch (e) {
      setResults(p => ({ ...p, bybit: { ok: false, msg: `❌ ${e.message}` } }));
    } finally {
      setTesting(p => ({ ...p, bybit: false }));
    }
  };

  const clear = () => { clearKeys(); setKeys({ binanceKey:'', binanceSecret:'', bybitKey:'', bybitSecret:'' }); setResults({ binance:null, bybit:null }); };

  const stored = loadKeys();
  const hasBinance = !!stored.binanceKey;
  const hasBybit   = !!stored.bybitKey;

  return (
    <div className="fade-in" style={{ display:'flex', flexDirection:'column', gap:'1.25rem', maxWidth:580 }}>

      {/* Status */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
        {[
          { name:'Binance', connected:hasBinance },
          { name:'Bybit',   connected:hasBybit   },
        ].map(ex => (
          <div key={ex.name} style={{ background:'var(--bg-card)', border:`1px solid ${ex.connected ? 'var(--green-dim)' : 'var(--border)'}`, borderRadius:'var(--radius-lg)', padding:'1rem', display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:10, height:10, borderRadius:'50%', background:ex.connected?'var(--green)':'var(--border-light)', flexShrink:0 }}/>
            <div>
              <div style={{ fontWeight:600, fontSize:13 }}>{ex.name}</div>
              <div style={{ fontSize:11, color:ex.connected?'var(--green)':'var(--text-muted)' }}>{ex.connected ? 'Connected' : 'Not connected'}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ background:'var(--green-bg)', border:'1px solid var(--green-dim)', borderRadius:'var(--radius-md)', padding:'12px 14px', fontSize:12, color:'var(--green)' }}>
        🔒 Keys are stored in your browser only — never sent to any server. All exchange calls go directly from your browser using your own IP address.
      </div>

      {/* Binance */}
      <Section title="Binance API" badge={hasBinance ? 'Connected' : null}>
        <div style={{ fontSize:12, color:'var(--text-muted)', marginBottom:12 }}>
          Create at binance.com → Account → API Management → Enable <strong>Spot trading</strong>. Leave IP restriction off.
        </div>
        <Field label="API Key"    value={keys.binanceKey}    onChange={v => setKeys(p => ({...p, binanceKey: v}))}    placeholder="Starts with letters and numbers…"/>
        <Field label="API Secret" value={keys.binanceSecret} onChange={v => setKeys(p => ({...p, binanceSecret: v}))} placeholder="Your Binance secret…" secret/>
        {results.binance && (
          <div style={{ fontSize:12, padding:'8px 10px', borderRadius:'var(--radius-sm)', background:results.binance.ok?'var(--green-bg)':'var(--red-bg)', color:results.binance.ok?'var(--green)':'var(--red)', border:`1px solid ${results.binance.ok?'var(--green-dim)':'#7f1d1d'}` }}>
            {results.binance.msg}
          </div>
        )}
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={testBinance} disabled={testing.binance || !keys.binanceKey || !keys.binanceSecret} style={btnSecondary}>
            {testing.binance ? 'Testing…' : 'Test connection'}
          </button>
        </div>
      </Section>

      {/* Bybit */}
      <Section title="Bybit API" badge={hasBybit ? 'Connected' : null}>
        <div style={{ fontSize:12, color:'var(--text-muted)', marginBottom:12 }}>
          Create at bybit.com → Account → API Management → Enable <strong>Read + Trade</strong>.
        </div>
        <Field label="API Key"    value={keys.bybitKey}    onChange={v => setKeys(p => ({...p, bybitKey: v}))}    placeholder="Your Bybit API key…"/>
        <Field label="API Secret" value={keys.bybitSecret} onChange={v => setKeys(p => ({...p, bybitSecret: v}))} placeholder="Your Bybit secret…" secret/>
        {results.bybit && (
          <div style={{ fontSize:12, padding:'8px 10px', borderRadius:'var(--radius-sm)', background:results.bybit.ok?'var(--green-bg)':'var(--red-bg)', color:results.bybit.ok?'var(--green)':'var(--red)', border:`1px solid ${results.bybit.ok?'var(--green-dim)':'#7f1d1d'}` }}>
            {results.bybit.msg}
          </div>
        )}
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={testBybit} disabled={testing.bybit || !keys.bybitKey || !keys.bybitSecret} style={btnSecondary}>
            {testing.bybit ? 'Testing…' : 'Test connection'}
          </button>
        </div>
      </Section>

      {/* Webhook */}
      <Section title="TradingView / 3Commas Webhook">
        <div style={{ fontSize:12, color:'var(--text-muted)', marginBottom:8 }}>Send signals from TradingView alerts or 3Commas bots to this endpoint:</div>
        <code style={{ display:'block', background:'var(--bg-hover)', padding:'10px 12px', borderRadius:'var(--radius-sm)', fontSize:12, marginBottom:8, wordBreak:'break-all', color:'var(--text-primary)' }}>
          POST https://copy-trader-pro-uels.vercel.app/api/bot?action=signal
        </code>
        <div style={{ fontSize:11, color:'var(--text-muted)' }}>
          Body: <code style={{color:'var(--text-secondary)'}}>{'{"symbol":"BTCUSDT","side":"long","action":"open","price":62000}'}</code>
        </div>
      </Section>

      {/* Save / Clear */}
      <div style={{ display:'flex', gap:10, alignItems:'center' }}>
        {saved && <span style={{ fontSize:13, color:'var(--green)', fontWeight:500 }}>✓ Keys saved to browser</span>}
        <button onClick={save} disabled={!keys.binanceKey && !keys.bybitKey} style={btnPrimary}>Save keys</button>
        {(hasBinance || hasBybit) && (
          <button onClick={clear} style={{ ...btnSecondary, color:'var(--red)', borderColor:'#7f1d1d' }}>Clear all keys</button>
        )}
      </div>
    </div>
  );
}

function Section({ title, badge, children }) {
  return (
    <div style={{ background:'var(--bg-card)', borderRadius:'var(--radius-lg)', border:'1px solid var(--border)', padding:'1.25rem' }}>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
        <div style={{ fontWeight:600, fontSize:14 }}>{title}</div>
        {badge && <span style={{ fontSize:10, background:'var(--green-bg)', color:'var(--green)', padding:'2px 8px', borderRadius:10, fontWeight:600 }}>{badge}</span>}
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>{children}</div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, secret }) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label style={{ fontSize:11, fontWeight:600, color:'var(--text-secondary)', display:'block', marginBottom:5 }}>{label}</label>
      <div style={{ position:'relative' }}>
        <input
          type={secret && !show ? 'password' : 'text'}
          value={value} onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          style={{ width:'100%', background:'var(--bg-hover)', border:'1px solid var(--border)', color:'var(--text-primary)', padding:'9px 36px 9px 12px', borderRadius:'var(--radius-md)', fontSize:13 }}
        />
        {secret && (
          <button onClick={() => setShow(p => !p)} style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer', fontSize:13 }}>
            {show ? '🙈' : '👁'}
          </button>
        )}
      </div>
    </div>
  );
}

const btnPrimary   = { background:'var(--green)', color:'#000', border:'none', padding:'9px 24px', borderRadius:'var(--radius-md)', fontSize:13, fontWeight:700, cursor:'pointer' };
const btnSecondary = { background:'var(--bg-hover)', color:'var(--text-primary)', border:'1px solid var(--border)', padding:'8px 16px', borderRadius:'var(--radius-md)', fontSize:13, fontWeight:500, cursor:'pointer' };
