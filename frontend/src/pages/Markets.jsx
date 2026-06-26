import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const COINS = [
  { id: 'bitcoin',      sym: 'BTC', icon: '₿', color: '#f7931a' },
  { id: 'ethereum',     sym: 'ETH', icon: 'Ξ', color: '#627eea' },
  { id: 'solana',       sym: 'SOL', icon: '◎', color: '#9945ff' },
  { id: 'binancecoin',  sym: 'BNB', icon: '⬡', color: '#f3ba2f' },
  { id: 'ripple',       sym: 'XRP', icon: '✕', color: '#346aa9' },
  { id: 'cardano',      sym: 'ADA', icon: '₳', color: '#0033ad' },
  { id: 'dogecoin',     sym: 'DOGE',icon: 'Ð', color: '#c2a633' },
  { id: 'polkadot',     sym: 'DOT', icon: '●', color: '#e6007a' },
];

async function fetchPrices() {
  // Call CoinGecko directly from browser — no CORS issues, no geo-block
  const ids = COINS.map(c => c.id).join(',');
  const r = await fetch(
    `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true&include_24hr_high=true&include_24hr_low=true&include_24hr_vol=true`,
    { signal: AbortSignal.timeout(10000) }
  );
  if (!r.ok) throw new Error('CoinGecko failed');
  return r.json();
}

export default function Markets() {
  const [data, setData]       = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [updated, setUpdated] = useState(null);
  const [selected, setSelected] = useState('BTC');

  const load = async () => {
    try {
      const d = await fetchPrices();
      setData(d);
      setUpdated(new Date());
      setError(null);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); const t = setInterval(load, 15000); return () => clearInterval(t); }, []);

  const selectedCoin = COINS.find(c => c.sym === selected);
  const selectedData = selectedCoin ? data[selectedCoin.id] : null;

  // Simulated sparkline data based on 24h high/low
  const sparkline = selectedData ? Array.from({ length: 24 }, (_, i) => {
    const low = selectedData.usd_24h_low || selectedData.usd * 0.97;
    const high = selectedData.usd_24h_high || selectedData.usd * 1.03;
    const rand = Math.sin(i * 0.5 + Math.random() * 0.3) * 0.5 + 0.5;
    return { hour: `${i}h`, price: parseFloat((low + rand * (high - low)).toFixed(2)) };
  }) : [];

  if (loading) return <div style={{ color: 'var(--color-text-tertiary)', fontSize: 13, padding: '2rem' }}>Fetching live prices…</div>;
  if (error) return <div style={{ color: '#f87171', fontSize: 13, padding: '2rem' }}>⚠️ {error} — retrying…</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>
          {updated ? `Updated ${updated.toLocaleTimeString()}` : ''}
        </div>
        <div style={{ fontSize: 12, color: '#4ade80', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 6, height: 6, background: '#4ade80', borderRadius: '50%', display: 'inline-block' }} />
          Live · auto-refreshes every 15s
        </div>
      </div>

      {/* Price grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 10 }}>
        {COINS.map(coin => {
          const d = data[coin.id];
          if (!d) return null;
          const pos = (d.usd_24h_change || 0) >= 0;
          const isSelected = selected === coin.sym;
          return (
            <div key={coin.id} onClick={() => setSelected(coin.sym)} style={{
              ...card,
              cursor: 'pointer',
              border: isSelected ? `1px solid ${coin.color}40` : '0.5px solid var(--color-border-tertiary)',
              background: isSelected ? 'var(--color-background-secondary)' : 'var(--color-background-secondary)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: coin.color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, color: coin.color }}>
                    {coin.icon}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{coin.sym}</div>
                    <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)' }}>/ USD</div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 17, fontWeight: 600 }}>
                    ${d.usd < 1 ? d.usd.toFixed(4) : d.usd.toLocaleString('en', { maximumFractionDigits: 2 })}
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 500, color: pos ? '#4ade80' : '#f87171' }}>
                    {pos ? '▲' : '▼'} {Math.abs(d.usd_24h_change || 0).toFixed(2)}%
                  </div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                {[
                  { l: 'High 24h', v: `$${(d.usd_24h_high||d.usd).toLocaleString('en',{maximumFractionDigits:2})}` },
                  { l: 'Low 24h',  v: `$${(d.usd_24h_low||d.usd).toLocaleString('en',{maximumFractionDigits:2})}` },
                  { l: 'Volume',   v: `$${((d.usd_24h_vol||0)/1e6).toFixed(0)}M` },
                ].map(s => (
                  <div key={s.l} style={{ background: 'var(--color-background-primary)', borderRadius: 6, padding: '5px 7px' }}>
                    <div style={{ fontSize: 9, color: 'var(--color-text-tertiary)', marginBottom: 2 }}>{s.l}</div>
                    <div style={{ fontSize: 11, fontWeight: 500 }}>{s.v}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected coin chart */}
      {selectedData && (
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ fontWeight: 500 }}>{selected} / USD — 24h Range</div>
            <div style={{ fontSize: 13, color: (selectedData.usd_24h_change||0) >= 0 ? '#4ade80' : '#f87171', fontWeight: 500 }}>
              ${selectedData.usd.toLocaleString('en', { maximumFractionDigits: 2 })}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={sparkline} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <XAxis dataKey="hour" tick={{ fontSize: 10, fill: 'var(--color-text-tertiary)' }} axisLine={false} tickLine={false} interval={3} />
              <YAxis domain={['auto','auto']} tick={{ fontSize: 10, fill: 'var(--color-text-tertiary)' }} axisLine={false} tickLine={false} tickFormatter={v => `$${v.toLocaleString()}`} width={70} />
              <Tooltip formatter={v => [`$${v.toLocaleString('en', { maximumFractionDigits: 2 })}`, 'Price']} contentStyle={{ background: 'var(--color-background-secondary)', border: '0.5px solid var(--color-border-secondary)', borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="price" radius={[2,2,0,0]}>
                {sparkline.map((_, i) => <Cell key={i} fill={selectedCoin.color + '99'} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

const card = { background: 'var(--color-background-secondary)', borderRadius: 'var(--border-radius-lg)', border: '0.5px solid var(--color-border-tertiary)', padding: '1.25rem' };
