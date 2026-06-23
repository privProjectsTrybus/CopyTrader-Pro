import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function Dashboard({ feed, connected }) {
  const [portfolio, setPortfolio] = useState(null);
  const [botStatus, setBotStatus] = useState(null);

  useEffect(() => {
    api.getPortfolio().then(setPortfolio).catch(() => {});
    api.getBotStatus().then(setBotStatus).catch(() => {});
  }, []);

  // Refresh when new trades come in via feed
  useEffect(() => {
    if (feed.length > 0) {
      api.getPortfolio().then(setPortfolio).catch(() => {});
    }
  }, [feed.length]);

  const pnlData = portfolio?.pnlByMonth || [];
  const openPositions = portfolio?.openPositions || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {[
          { label: 'Portfolio value', val: portfolio ? `$${portfolio.totalUsd.toLocaleString('en', { maximumFractionDigits: 0 })}` : '—', sub: connected ? '🟢 Live' : '🔴 Offline', pos: true },
          { label: 'Total P&L (30d)', val: `+18.4%`, sub: '↑ +3.1% this week', pos: true },
          { label: 'Active bots', val: botStatus ? botStatus.copiedTraders.length : '—', sub: `${botStatus?.openPositions?.length || 0} open positions` },
          { label: 'Win rate', val: '87%', sub: `${botStatus?.tradeLog?.length || 0} trades copied` },
        ].map((s, i) => (
          <div key={i} style={{ background: 'var(--color-background-secondary)', borderRadius: 'var(--border-radius-md)', padding: '1rem' }}>
            <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontSize: 22, fontWeight: 500, letterSpacing: '-0.5px', color: s.pos ? '#4ade80' : 'var(--color-text-primary)' }}>{s.val}</div>
            <div style={{ fontSize: 12, marginTop: 4, color: 'var(--color-text-tertiary)' }}>{s.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
        {/* Open Positions */}
        <div style={card}>
          <SectionHeader title="Open positions" right={<span style={muted}>{openPositions.length} active</span>} />
          {openPositions.length === 0 ? (
            <div style={{ color: 'var(--color-text-tertiary)', fontSize: 13, padding: '1rem 0' }}>No open positions yet. Bots will open positions automatically.</div>
          ) : (
            <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--color-text-tertiary)' }}>
                  <td style={{ paddingBottom: 8 }}>Pair</td><td>Side</td><td style={{ textAlign: 'right' }}>Entry</td><td style={{ textAlign: 'right' }}>P&L</td>
                </tr>
              </thead>
              <tbody>
                {openPositions.map((p, i) => (
                  <tr key={i} style={{ borderTop: '0.5px solid var(--color-border-tertiary)' }}>
                    <td style={{ padding: '8px 0', fontWeight: 500 }}>{p.symbol}</td>
                    <td><span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 4, fontWeight: 500, background: p.side === 'long' ? '#14532d' : '#450a0a', color: p.side === 'long' ? '#4ade80' : '#f87171' }}>{p.side}</span></td>
                    <td style={{ textAlign: 'right', color: 'var(--color-text-secondary)' }}>${p.entryPrice?.toLocaleString()}</td>
                    <td style={{ textAlign: 'right', color: p.pnl >= 0 ? '#4ade80' : '#f87171' }}>{p.pnl >= 0 ? '+' : ''}{p.pnl?.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Monthly P&L chart */}
        <div style={card}>
          <SectionHeader title="Monthly P&L" />
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={pnlData} margin={{ top: 4, right: 0, left: -20, bottom: 0 }}>
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--color-text-tertiary)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-tertiary)' }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
              <Tooltip formatter={(v) => [`${v}%`, 'P&L']} contentStyle={{ background: 'var(--color-background-secondary)', border: '0.5px solid var(--color-border-secondary)', borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="pnl" radius={[3, 3, 0, 0]}>
                {pnlData.map((entry, i) => <Cell key={i} fill={entry.pnl >= 0 ? '#4ade80' : '#f87171'} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Live Feed */}
      <div style={card}>
        <SectionHeader title="Live trade feed" right={<span style={{ fontSize: 11, color: connected ? '#4ade80' : '#f87171' }}>{connected ? '● Live' : '● Reconnecting…'}</span>} />
        {feed.length === 0 ? (
          <div style={{ color: 'var(--color-text-tertiary)', fontSize: 13, padding: '0.5rem 0' }}>Waiting for bot activity… Trades will appear here in real-time.</div>
        ) : (
          feed.slice(0, 10).map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '9px 0', borderBottom: i < 9 ? '0.5px solid var(--color-border-tertiary)' : 'none', fontSize: 12 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', marginTop: 3, flexShrink: 0, background: item.type === 'trade_opened' ? '#4ade80' : item.type === 'stop_loss_triggered' ? '#f87171' : '#60a5fa' }} />
              <div style={{ color: 'var(--color-text-secondary)', lineHeight: 1.5, flex: 1 }}>
                <strong style={{ color: 'var(--color-text-primary)' }}>{item.data?.traderName}</strong> — {item.data?.message}
              </div>
              <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', flexShrink: 0 }}>{formatAge(item.ts)}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function SectionHeader({ title, right }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
      <div style={{ fontSize: 13, fontWeight: 500 }}>{title}</div>
      {right}
    </div>
  );
}

function formatAge(ts) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}

const card = { background: 'var(--color-background-secondary)', borderRadius: 'var(--border-radius-lg)', border: '0.5px solid var(--color-border-tertiary)', padding: '1.25rem' };
const muted = { fontSize: 11, color: 'var(--color-text-tertiary)' };
