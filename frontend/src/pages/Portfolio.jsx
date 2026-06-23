import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

const COLORS = ['#4ade80', '#60a5fa', '#c084fc', '#fb923c', '#f87171', '#38bdf8'];

export default function Portfolio() {
  const [portfolio, setPortfolio] = useState(null);

  useEffect(() => {
    api.getPortfolio().then(setPortfolio).catch(() => {});
  }, []);

  if (!portfolio) return <div style={{ color: 'var(--color-text-tertiary)', fontSize: 13 }}>Loading portfolio…</div>;

  const pieData = portfolio.balances.map(b => ({ name: b.asset, value: b.usdValue }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {portfolio.demo && (
        <div style={{ background: '#451a03', border: '0.5px solid #92400e', borderRadius: 'var(--border-radius-md)', padding: '10px 14px', fontSize: 13, color: '#fb923c' }}>
          ⚠️ Demo mode — add your Binance API keys to .env to see real balances
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
        {/* Allocation pie chart */}
        <div style={card}>
          <div style={{ fontWeight: 500, fontSize: 13, marginBottom: 12 }}>Portfolio allocation</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <ResponsiveContainer width={140} height={140}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} dataKey="value" strokeWidth={0}>
                  {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => [`$${v.toFixed(2)}`, '']} contentStyle={{ background: 'var(--color-background-secondary)', border: '0.5px solid var(--color-border-secondary)', fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ flex: 1 }}>
              {portfolio.balances.map((b, i) => (
                <div key={b.asset} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: COLORS[i % COLORS.length], flexShrink: 0 }} />
                  <span style={{ fontSize: 13, flex: 1 }}>{b.asset}</span>
                  <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>${b.usdValue.toFixed(0)}</span>
                  <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>{((b.usdValue / portfolio.totalUsd) * 100).toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ borderTop: '0.5px solid var(--color-border-tertiary)', marginTop: 12, paddingTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>Total value</span>
            <span style={{ fontSize: 18, fontWeight: 500 }}>${portfolio.totalUsd.toLocaleString('en', { maximumFractionDigits: 2 })}</span>
          </div>
        </div>

        {/* Balances table */}
        <div style={card}>
          <div style={{ fontWeight: 500, fontSize: 13, marginBottom: 12 }}>Balances</div>
          <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--color-text-tertiary)' }}>
                <td style={{ paddingBottom: 8 }}>Asset</td>
                <td style={{ textAlign: 'right' }}>Balance</td>
                <td style={{ textAlign: 'right' }}>Price</td>
                <td style={{ textAlign: 'right' }}>Value</td>
              </tr>
            </thead>
            <tbody>
              {portfolio.balances.map((b, i) => (
                <tr key={b.asset} style={{ borderTop: '0.5px solid var(--color-border-tertiary)' }}>
                  <td style={{ padding: '9px 0', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: COLORS[i % COLORS.length] }} />
                    {b.asset}
                  </td>
                  <td style={{ textAlign: 'right', color: 'var(--color-text-secondary)' }}>{b.total.toFixed(4)}</td>
                  <td style={{ textAlign: 'right', color: 'var(--color-text-secondary)' }}>{b.asset === 'USDT' ? '$1.00' : `$${b.price?.toLocaleString()}`}</td>
                  <td style={{ textAlign: 'right', fontWeight: 500 }}>${b.usdValue.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Trade log */}
      <div style={card}>
        <div style={{ fontWeight: 500, fontSize: 13, marginBottom: 12 }}>Recent trades</div>
        {portfolio.tradeLog?.length === 0 ? (
          <div style={{ color: 'var(--color-text-tertiary)', fontSize: 13 }}>No trades yet — start copying a trader to see activity here.</div>
        ) : (
          <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--color-text-tertiary)' }}>
                <td style={{ paddingBottom: 8 }}>Time</td>
                <td>Trader</td>
                <td>Pair</td>
                <td>Side</td>
                <td style={{ textAlign: 'right' }}>Entry</td>
                <td style={{ textAlign: 'right' }}>P&L</td>
                <td style={{ textAlign: 'right' }}>Status</td>
              </tr>
            </thead>
            <tbody>
              {portfolio.tradeLog?.slice(0, 20).map((t, i) => (
                <tr key={i} style={{ borderTop: '0.5px solid var(--color-border-tertiary)' }}>
                  <td style={{ padding: '8px 0', color: 'var(--color-text-tertiary)', fontSize: 11 }}>{new Date(t.openedAt).toLocaleTimeString()}</td>
                  <td style={{ fontWeight: 500 }}>{t.traderName}</td>
                  <td>{t.symbol}</td>
                  <td><span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: t.side === 'long' ? '#14532d' : '#450a0a', color: t.side === 'long' ? '#4ade80' : '#f87171' }}>{t.side}</span></td>
                  <td style={{ textAlign: 'right', color: 'var(--color-text-secondary)' }}>${t.entryPrice?.toLocaleString()}</td>
                  <td style={{ textAlign: 'right', color: (t.pnl || 0) >= 0 ? '#4ade80' : '#f87171', fontWeight: 500 }}>{t.pnl ? `${t.pnl >= 0 ? '+' : ''}${t.pnl.toFixed(1)}%` : '—'}</td>
                  <td style={{ textAlign: 'right' }}><StatusBadge status={t.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const map = { open: ['#14532d', '#4ade80'], closed: ['#1e3a5f', '#60a5fa'], stopped: ['#450a0a', '#f87171'] };
  const [bg, color] = map[status] || ['#1c2026', '#888'];
  return <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 4, background: bg, color, fontWeight: 500 }}>{status}</span>;
}

const card = { background: 'var(--color-background-secondary)', borderRadius: 'var(--border-radius-lg)', border: '0.5px solid var(--color-border-tertiary)', padding: '1.25rem' };
