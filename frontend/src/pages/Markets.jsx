import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const ICONS = { BTC: '₿', ETH: 'Ξ', SOL: '◎', BNB: '⬡', ADA: '₳', DOGE: 'Ð', XRP: '✕', DOT: '●' };

export default function Markets() {
  const [markets, setMarkets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);

  const fetchPrices = () => {
    api.getPrices().then(d => {
      setMarkets(d.markets || []);
      setLastUpdate(new Date());
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchPrices();
    const t = setInterval(fetchPrices, 10000); // refresh every 10s
    return () => clearInterval(t);
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>
          {lastUpdate ? `Updated ${lastUpdate.toLocaleTimeString()}` : 'Loading…'}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#4ade80' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ade80', display: 'inline-block', animation: 'pulse 1.5s infinite' }} />
          Live from Binance
        </div>
      </div>

      {loading ? (
        <div style={{ color: 'var(--color-text-tertiary)', fontSize: 13 }}>Fetching live prices…</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
          {markets.map(m => {
            const base = m.symbol.replace('USDT','');
            const pos = m.change24h >= 0;
            return (
              <div key={m.symbol} style={card}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: pos ? '#14532d' : '#450a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>
                      {ICONS[base] || base[0]}
                    </div>
                    <div>
                      <div style={{ fontWeight: 500 }}>{base}</div>
                      <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>vs USDT</div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 18, fontWeight: 500 }}>${m.price < 1 ? m.price.toFixed(4) : m.price.toLocaleString('en', { maximumFractionDigits: 2 })}</div>
                    <div style={{ fontSize: 13, color: pos ? '#4ade80' : '#f87171', fontWeight: 500 }}>
                      {pos ? '+' : ''}{m.change24h.toFixed(2)}%
                    </div>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
                  {[
                    { label: '24h High', val: `$${m.high24h.toLocaleString('en', { maximumFractionDigits: 2 })}` },
                    { label: '24h Low',  val: `$${m.low24h.toLocaleString('en', { maximumFractionDigits: 2 })}` },
                    { label: 'Volume',   val: `$${(m.volume24h/1e6).toFixed(0)}M` },
                  ].map(s => (
                    <div key={s.label} style={{ background: 'var(--color-background-primary)', borderRadius: 6, padding: '5px 7px' }}>
                      <div style={{ fontSize: 9, color: 'var(--color-text-tertiary)', marginBottom: 2 }}>{s.label}</div>
                      <div style={{ fontSize: 11, fontWeight: 500 }}>{s.val}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const card = { background: 'var(--color-background-secondary)', borderRadius: 'var(--border-radius-lg)', border: '0.5px solid var(--color-border-tertiary)', padding: '1.25rem' };
