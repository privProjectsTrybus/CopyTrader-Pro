import { useState } from 'react';
import Sidebar from './components/Sidebar.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Traders from './pages/Traders.jsx';
import Portfolio from './pages/Portfolio.jsx';
import BotSettings from './pages/BotSettings.jsx';
import ApiKeys from './pages/ApiKeys.jsx';
import { useWebSocket } from './hooks/useWebSocket.js';

export default function App() {
  const [page, setPage] = useState('dashboard');
  const { connected, feed } = useWebSocket(
    (import.meta.env.VITE_WS_URL || 'ws://localhost:3001')
  );

  const pages = {
    dashboard: <Dashboard feed={feed} connected={connected} />,
    traders: <Traders />,
    bots: <BotSettings />,
    portfolio: <Portfolio />,
    history: <Portfolio />,
    settings: <BotSettings />,
    apikeys: <ApiKeys />,
    markets: <div style={{ color: 'var(--color-text-tertiary)', fontSize: 13, padding: '2rem' }}>Live markets coming soon.</div>,
    copied: <Dashboard feed={feed} connected={connected} />,
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--color-background-primary)' }}>
      <Sidebar page={page} setPage={setPage} botRunning={connected} />
      <main style={{ marginLeft: 220, flex: 1, padding: '1.25rem 1.5rem', overflowY: 'auto', minHeight: '100vh' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <div style={{ fontSize: 15, fontWeight: 500, textTransform: 'capitalize' }}>{page.replace(/([A-Z])/g, ' $1')}</div>
          <span style={{ fontSize: 12, color: connected ? '#4ade80' : '#94a3b8' }}>
            {connected ? '● Backend live' : '● Demo mode'}
          </span>
        </div>
        {pages[page] || pages.dashboard}
      </main>
    </div>
  );
}
