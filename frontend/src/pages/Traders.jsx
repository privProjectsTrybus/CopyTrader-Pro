import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';

const SOURCES = ['all', 'binance', 'etoro', 'bybit', 'kraken', '3commas'];
const SORTS = [
  { val: 'pnl30d', label: '30d P&L' },
  { val: 'winRate', label: 'Win rate' },
  { val: 'copiers', label: 'Copiers' },
];

export default function Traders() {
  const [traders, setTraders] = useState([]);
  const [copying, setCopying] = useState(new Set());
  const [source, setSource] = useState('all');
  const [sort, setSort] = useState('pnl30d');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    setLoading(true);
    const params = { sort };
    if (source !== 'all') params.source = source;
    api.getTraders(params).then(d => { setTraders(d.traders); setLoading(false); }).catch(() => setLoading(false));
  }, [source, sort]);

  async function toggleCopy(trader) {
    if (copying.has(trader.id)) {
      await api.stopCopying(trader.id).catch(() => {});
      setCopying(prev => { const n = new Set(prev); n.delete(trader.id); return n; });
    } else {
      await api.copyTrader(trader).catch(() => {});
      setCopying(prev => new Set([...prev, trader.id]));
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Filters */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>Source:</span>
        {SOURCES.map(s => (
          <button key={s} onClick={() => setSource(s)} style={{ ...chip, ...(source === s ? chipActive : {}) }}>{s}</button>
        ))}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>Sort by:</span>
          {SORTS.map(s => (
            <button key={s.val} onClick={() => setSort(s.val)} style={{ ...chip, ...(sort === s.val ? chipActive : {}) }}>{s.label}</button>
          ))}
        </div>
      </div>

      {/* Leaderboard */}
      {loading ? (
        <div style={{ color: 'var(--color-text-tertiary)', fontSize: 13 }}>Loading traders…</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
          {traders.map((t, i) => (
            <div key={t.id} style={{ ...card, cursor: 'pointer', border: copying.has(t.id) ? '0.5px solid #4ade80' : '0.5px solid var(--color-border-tertiary)' }} onClick={() => setSelected(t)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{ width: 38, height: 38, borderRadius: '50%', background: t.color, color: t.textColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 500 }}>{t.avatar}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500, fontSize: 14 }}>#{i + 1} {t.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 1 }}>{t.source} · {t.copiers?.toLocaleString()} copiers</div>
                </div>
                <div style={{ fontSize: 20, fontWeight: 500, color: '#4ade80' }}>+{t.pnl30d}%</div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12 }}>
                {[
                  { label: 'Win rate', val: `${t.winRate}%` },
                  { label: '7d P&L', val: `+${t.pnl7d}%` },
                  { label: 'Avg hold', val: t.avgHold },
                ].map(s => (
                  <div key={s.label} style={{ background: 'var(--color-background-primary)', borderRadius: 6, padding: '6px 8px' }}>
                    <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)', marginBottom: 2 }}>{s.label}</div>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{s.val}</div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <RiskBadge score={t.riskScore} />
                <button
                  onClick={(e) => { e.stopPropagation(); toggleCopy(t); }}
                  style={{ marginLeft: 'auto', fontSize: 12, padding: '5px 14px', borderRadius: 20, border: '0.5px solid', cursor: 'pointer', fontWeight: 500,
                    background: copying.has(t.id) ? '#14532d' : 'transparent',
                    color: copying.has(t.id) ? '#4ade80' : 'var(--color-text-secondary)',
                    borderColor: copying.has(t.id) ? '#166534' : 'var(--color-border-secondary)',
                  }}
                >
                  {copying.has(t.id) ? '✓ Copying' : 'Copy trader'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Trader detail modal */}
      {selected && <TraderModal trader={selected} copying={copying.has(selected.id)} onCopy={() => toggleCopy(selected)} onClose={() => setSelected(null)} />}
    </div>
  );
}

function RiskBadge({ score }) {
  const colors = ['', '#14532d', '#166534', '#854d0e', '#9a3412', '#450a0a'];
  const textColors = ['', '#4ade80', '#86efac', '#fde047', '#fdba74', '#fca5a5'];
  const labels = ['', 'Very Low', 'Low', 'Medium', 'High', 'Very High'];
  return (
    <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, background: colors[score], color: textColors[score], fontWeight: 500 }}>
      Risk: {labels[score]}
    </span>
  );
}

function TraderModal({ trader, copying, onCopy, onClose }) {
  const [detail, setDetail] = useState(null);
  useEffect(() => { api.getTrader(trader.id).then(setDetail).catch(() => {}); }, [trader.id]);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={onClose}>
      <div style={{ ...card, width: 480, maxHeight: '80vh', overflowY: 'auto', position: 'relative' }} onClick={e => e.stopPropagation()}>
        <button onClick={onClose} style={{ position: 'absolute', top: 12, right: 12, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)', fontSize: 18 }}>✕</button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div style={{ width: 48, height: 48, borderRadius: '50%', background: trader.color, color: trader.textColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 500 }}>{trader.avatar}</div>
          <div>
            <div style={{ fontWeight: 500, fontSize: 16 }}>{trader.name}</div>
            <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>{trader.source} · {trader.copiers?.toLocaleString()} copiers</div>
          </div>
          <button onClick={onCopy} style={{ marginLeft: 'auto', fontSize: 13, padding: '7px 18px', borderRadius: 20, border: '0.5px solid', cursor: 'pointer', fontWeight: 500, background: copying ? '#14532d' : 'transparent', color: copying ? '#4ade80' : 'var(--color-text-primary)', borderColor: copying ? '#166534' : 'var(--color-border-secondary)' }}>
            {copying ? '✓ Copying' : 'Start copying'}
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 16 }}>
          {[
            { label: '30d P&L', val: `+${trader.pnl30d}%`, color: '#4ade80' },
            { label: 'Win rate', val: `${trader.winRate}%` },
            { label: 'Total trades', val: trader.trades?.toLocaleString() },
            { label: 'Avg hold', val: trader.avgHold },
          ].map(s => (
            <div key={s.label} style={{ background: 'var(--color-background-primary)', borderRadius: 6, padding: '8px' }}>
              <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)', marginBottom: 3 }}>{s.label}</div>
              <div style={{ fontSize: 14, fontWeight: 500, color: s.color || 'var(--color-text-primary)' }}>{s.val}</div>
            </div>
          ))}
        </div>

        {detail && (
          <>
            <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 8, color: 'var(--color-text-secondary)' }}>Recent trades</div>
            {detail.recentTrades?.slice(0, 6).map((t, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0', borderBottom: '0.5px solid var(--color-border-tertiary)', fontSize: 12 }}>
                <span style={{ fontWeight: 500, width: 80 }}>{t.symbol}</span>
                <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: t.side === 'long' ? '#14532d' : '#450a0a', color: t.side === 'long' ? '#4ade80' : '#f87171' }}>{t.side}</span>
                <span style={{ marginLeft: 'auto', color: parseFloat(t.pnl) >= 0 ? '#4ade80' : '#f87171', fontWeight: 500 }}>{parseFloat(t.pnl) >= 0 ? '+' : ''}{t.pnl}%</span>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

const card = { background: 'var(--color-background-secondary)', borderRadius: 'var(--border-radius-lg)', border: '0.5px solid var(--color-border-tertiary)', padding: '1.25rem' };
const chip = { display: 'inline-flex', alignItems: 'center', background: 'var(--color-background-secondary)', border: '0.5px solid var(--color-border-secondary)', borderRadius: 20, padding: '4px 12px', fontSize: 12, color: 'var(--color-text-secondary)', cursor: 'pointer' };
const chipActive = { borderColor: '#4ade80', color: '#4ade80', background: '#14532d' };
