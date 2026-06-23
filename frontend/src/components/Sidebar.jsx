export default function Sidebar({ page, setPage, botRunning }) {
  const nav = [
    { section: 'Overview' },
    { id: 'dashboard', label: 'Dashboard', icon: 'ti-layout-dashboard' },
    { id: 'markets', label: 'Live Markets', icon: 'ti-chart-line' },
    { section: 'Copy Trading' },
    { id: 'traders', label: 'Top Traders', icon: 'ti-users' },
    { id: 'bots', label: 'My Bots', icon: 'ti-robot' },
    { id: 'copied', label: 'Copied Trades', icon: 'ti-copy' },
    { section: 'Portfolio' },
    { id: 'portfolio', label: 'Portfolio', icon: 'ti-wallet' },
    { id: 'history', label: 'Trade History', icon: 'ti-history' },
    { section: 'Settings' },
    { id: 'settings', label: 'Bot Settings', icon: 'ti-settings' },
    { id: 'apikeys', label: 'API Keys', icon: 'ti-api' },
  ];

  return (
    <aside style={{
      width: 220, background: 'var(--color-background-secondary)',
      borderRight: '0.5px solid var(--color-border-tertiary)',
      display: 'flex', flexDirection: 'column', padding: '1.25rem 0',
      position: 'fixed', height: '100vh', overflowY: 'auto',
    }}>
      <div style={{ padding: '0 1.25rem 1.25rem', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: botRunning ? '#4ade80' : '#f87171', display: 'inline-block' }} />
        <span style={{ fontSize: 15, fontWeight: 500, letterSpacing: '-0.3px' }}>CopyTrader Pro</span>
      </div>

      {nav.map((item, i) =>
        item.section ? (
          <div key={i} style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--color-text-tertiary)', padding: '1rem 1.25rem 0.4rem' }}>
            {item.section}
          </div>
        ) : (
          <button key={item.id} onClick={() => setPage(item.id)} style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '8px 1.25rem',
            fontSize: 13, color: page === item.id ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
            cursor: 'pointer', background: page === item.id ? 'var(--color-background-primary)' : 'transparent',
            border: 'none', borderLeft: page === item.id ? '2px solid #4ade80' : '2px solid transparent',
            fontWeight: page === item.id ? 500 : 400, width: '100%', textAlign: 'left',
          }}>
            <i className={`ti ${item.icon}`} style={{ fontSize: 16 }} />
            {item.label}
          </button>
        )
      )}
    </aside>
  );
}
