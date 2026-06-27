export default function Sidebar({ page, setPage, botRunning, copyingCount = 0 }) {
  const nav = [
    { section: 'Overview' },
    { id: 'dashboard', label: 'Dashboard',     icon: 'ti-layout-dashboard' },
    { id: 'markets',   label: 'Live Markets',  icon: 'ti-chart-candlestick' },
    { section: 'Copy Trading' },
    { id: 'traders',   label: 'Top Traders',   icon: 'ti-trophy',   badge: null },
    { id: 'bots',      label: 'My Bots',       icon: 'ti-robot',    badge: copyingCount > 0 ? copyingCount : null },
    { id: 'copied',    label: 'Trade Feed',    icon: 'ti-activity' },
    { section: 'Account' },
    { id: 'portfolio', label: 'Portfolio',     icon: 'ti-wallet' },
    { id: 'history',   label: 'History',       icon: 'ti-history' },
    { id: 'apikeys',   label: 'API Keys',      icon: 'ti-key' },
  ];

  return (
    <aside style={{
      width: 220, background: 'var(--bg-secondary)',
      borderRight: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column',
      position: 'fixed', height: '100vh', overflowY: 'auto', zIndex: 10,
    }}>
      {/* Logo */}
      <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, #22c55e, #16a34a)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>📈</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: '-0.3px' }}>CopyTrader</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Pro</div>
          </div>
        </div>
        <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 6, background: botRunning ? 'var(--green-bg)' : 'var(--bg-card)', border: `1px solid ${botRunning ? 'var(--green-dim)' : 'var(--border)'}`, borderRadius: 6, padding: '5px 10px' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: botRunning ? 'var(--green)' : 'var(--text-muted)', animation: botRunning ? 'pulse 1.5s infinite' : 'none', display: 'inline-block' }} />
          <span style={{ fontSize: 11, color: botRunning ? 'var(--green)' : 'var(--text-muted)', fontWeight: 500 }}>{botRunning ? 'Bot Active' : 'Bot Idle'}</span>
        </div>
      </div>

      {/* Nav */}
      <div style={{ flex: 1, padding: '8px 0' }}>
        {nav.map((item, i) => item.section ? (
          <div key={i} style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted)', padding: '14px 20px 5px', fontWeight: 600 }}>{item.section}</div>
        ) : (
          <button key={item.id} onClick={() => setPage(item.id)} style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '9px 20px',
            fontSize: 13, fontWeight: page === item.id ? 600 : 400,
            color: page === item.id ? 'var(--text-primary)' : 'var(--text-secondary)',
            background: page === item.id ? 'var(--bg-hover)' : 'transparent',
            border: 'none', borderLeft: `2px solid ${page === item.id ? 'var(--green)' : 'transparent'}`,
            width: '100%', textAlign: 'left', transition: 'all 0.15s', cursor: 'pointer',
          }}>
            <i className={`ti ${item.icon}`} style={{ fontSize: 17, opacity: page === item.id ? 1 : 0.6 }} />
            <span style={{ flex: 1 }}>{item.label}</span>
            {item.badge && <span style={{ background: 'var(--green)', color: '#000', fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 10 }}>{item.badge}</span>}
          </button>
        ))}
      </div>

      {/* Footer */}
      <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', fontSize: 11, color: 'var(--text-muted)' }}>
        v2.0 · github.com/privProjectsTrybus
      </div>
    </aside>
  );
}
