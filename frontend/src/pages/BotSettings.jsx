import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';

export default function BotSettings({ onSettingsChange }) {
  const [settings, setSettings] = useState(null);
  const [botStatus, setBotStatus] = useState(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.getBotStatus().then(s => {
      setBotStatus(s);
      setSettings(s.settings);
    }).catch(() => {});
  }, []);

  async function save() {
    await api.updateSettings(settings).catch(() => {});
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    onSettingsChange?.(settings);
  }

  async function toggleBot() {
    if (botStatus?.running) {
      await api.stopBot();
      setBotStatus(p => ({ ...p, running: false }));
    } else {
      await api.startBot();
      setBotStatus(p => ({ ...p, running: true }));
    }
  }

  if (!settings) return <div style={{ color: 'var(--color-text-tertiary)', fontSize: 13 }}>Loading settings…</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: 640 }}>
      {/* Bot status card */}
      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <div style={{ fontWeight: 500, marginBottom: 4 }}>Bot engine</div>
            <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>
              {settings.demoMode ? '⚠️ Demo mode — add API keys to trade live' : '✅ Live mode'}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 12, color: botStatus?.running ? '#4ade80' : '#f87171' }}>
              {botStatus?.running ? '● Running' : '● Stopped'}
            </span>
            <button onClick={toggleBot} style={{ ...btn, background: botStatus?.running ? '#450a0a' : '#14532d', color: botStatus?.running ? '#f87171' : '#4ade80', borderColor: botStatus?.running ? '#7f1d1d' : '#166534' }}>
              {botStatus?.running ? 'Stop bot' : 'Start bot'}
            </button>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          {[
            { label: 'Copied traders', val: botStatus?.copiedTraders?.length || 0 },
            { label: 'Open positions', val: botStatus?.openPositions?.length || 0 },
            { label: 'Trades today', val: botStatus?.tradeLog?.length || 0 },
          ].map(s => (
            <div key={s.label} style={{ background: 'var(--color-background-primary)', borderRadius: 6, padding: '8px 10px' }}>
              <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)', marginBottom: 2 }}>{s.label}</div>
              <div style={{ fontSize: 18, fontWeight: 500 }}>{s.val}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Copy mode */}
      <div style={card}>
        <SectionTitle title="Copy mode" desc="How trade sizes are calculated relative to the original trader." />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          {[
            { val: 'proportional', label: 'Proportional', desc: 'Mirror % of portfolio' },
            { val: 'fixed', label: 'Fixed amount', desc: 'Fixed USD per trade' },
            { val: 'fixedLot', label: 'Fixed lot', desc: 'Exact same quantity' },
          ].map(m => (
            <button key={m.val} onClick={() => setSettings(p => ({ ...p, copyMode: m.val }))} style={{ ...modeCard, border: settings.copyMode === m.val ? '1.5px solid #4ade80' : '0.5px solid var(--color-border-secondary)' }}>
              <div style={{ fontWeight: 500, fontSize: 13, marginBottom: 4 }}>{m.label}</div>
              <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>{m.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Risk limits */}
      <div style={card}>
        <SectionTitle title="Risk limits" desc="Automatic protections on all copied trades." />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Row label="Max trade size (USD)" desc="Maximum USD value per copied trade">
            <select value={settings.maxTradeSize} onChange={e => setSettings(p => ({ ...p, maxTradeSize: parseInt(e.target.value) }))} style={select}>
              {[100, 250, 500, 1000, 2500, 5000].map(v => <option key={v} value={v}>${v.toLocaleString()}</option>)}
            </select>
          </Row>
          <Row label="Auto stop-loss" desc="Close position if it drops below this %">
            <Toggle on={settings.autoStopLoss > 0} onToggle={() => setSettings(p => ({ ...p, autoStopLoss: p.autoStopLoss > 0 ? 0 : 0.02 }))} />
            {settings.autoStopLoss > 0 && (
              <select value={settings.autoStopLoss} onChange={e => setSettings(p => ({ ...p, autoStopLoss: parseFloat(e.target.value) }))} style={{ ...select, marginLeft: 8 }}>
                {[0.01, 0.02, 0.03, 0.05, 0.1].map(v => <option key={v} value={v}>{(v * 100).toFixed(0)}%</option>)}
              </select>
            )}
          </Row>
          <Row label="Pause on drawdown" desc="Stop all copying if portfolio drops this %">
            <Toggle on={settings.pauseOnDrawdown > 0} onToggle={() => setSettings(p => ({ ...p, pauseOnDrawdown: p.pauseOnDrawdown > 0 ? 0 : 0.05 }))} />
            {settings.pauseOnDrawdown > 0 && (
              <select value={settings.pauseOnDrawdown} onChange={e => setSettings(p => ({ ...p, pauseOnDrawdown: parseFloat(e.target.value) }))} style={{ ...select, marginLeft: 8 }}>
                {[0.03, 0.05, 0.1, 0.2].map(v => <option key={v} value={v}>{(v * 100).toFixed(0)}%</option>)}
              </select>
            )}
          </Row>
          <Row label="Copy trade closes" desc="Automatically close your position when leader closes theirs">
            <Toggle on={settings.copyCloses} onToggle={() => setSettings(p => ({ ...p, copyCloses: !p.copyCloses }))} />
          </Row>
        </div>
      </div>

      {/* Asset filter */}
      <div style={card}>
        <SectionTitle title="Asset filter" desc="Only copy trades for specific asset classes." />
        <div style={{ display: 'flex', gap: 8 }}>
          {['all', 'crypto', 'stocks', 'forex'].map(f => (
            <button key={f} onClick={() => setSettings(p => ({ ...p, assetFilter: f }))} style={{ ...chip, ...(settings.assetFilter === f ? chipActive : {}) }}>
              {{ all: 'All assets', crypto: '₿ Crypto', stocks: '📈 Stocks', forex: '💱 Forex' }[f]}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
        {saved && <span style={{ fontSize: 13, color: '#4ade80', alignSelf: 'center' }}>✓ Saved</span>}
        <button onClick={save} style={{ ...btn, background: '#14532d', color: '#4ade80', borderColor: '#166534', padding: '8px 24px' }}>Save settings</button>
      </div>
    </div>
  );
}

function SectionTitle({ title, desc }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontWeight: 500, fontSize: 14, marginBottom: 3 }}>{title}</div>
      <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>{desc}</div>
    </div>
  );
}

function Row({ label, desc, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 500 }}>{label}</div>
        <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 1 }}>{desc}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center' }}>{children}</div>
    </div>
  );
}

function Toggle({ on, onToggle }) {
  return (
    <div onClick={onToggle} style={{ width: 36, height: 20, borderRadius: 10, background: on ? '#16a34a' : 'var(--color-border-tertiary)', position: 'relative', cursor: 'pointer', transition: 'background 0.2s', flexShrink: 0 }}>
      <div style={{ width: 14, height: 14, borderRadius: '50%', background: 'white', position: 'absolute', top: 3, left: on ? 19 : 3, transition: 'left 0.2s' }} />
    </div>
  );
}

const card = { background: 'var(--color-background-secondary)', borderRadius: 'var(--border-radius-lg)', border: '0.5px solid var(--color-border-tertiary)', padding: '1.25rem' };
const btn = { fontSize: 13, padding: '6px 16px', borderRadius: 'var(--border-radius-md)', border: '0.5px solid var(--color-border-secondary)', cursor: 'pointer', fontWeight: 500 };
const select = { background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-secondary)', color: 'var(--color-text-primary)', fontSize: 12, padding: '5px 8px', borderRadius: 'var(--border-radius-md)' };
const modeCard = { background: 'var(--color-background-primary)', borderRadius: 'var(--border-radius-md)', padding: '10px 12px', cursor: 'pointer', textAlign: 'left' };
const chip = { display: 'inline-flex', background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-secondary)', borderRadius: 20, padding: '6px 14px', fontSize: 12, color: 'var(--color-text-secondary)', cursor: 'pointer' };
const chipActive = { borderColor: '#4ade80', color: '#4ade80', background: '#14532d' };
