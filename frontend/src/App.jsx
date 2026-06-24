import { useState } from 'react';
import Sidebar from './components/Sidebar.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Traders from './pages/Traders.jsx';
import Portfolio from './pages/Portfolio.jsx';
import BotSettings from './pages/BotSettings.jsx';
import ApiKeys from './pages/ApiKeys.jsx';
import Markets from './pages/Markets.jsx';
import { useWebSocket } from './hooks/useWebSocket.js';

export default function App() {
  const [page, setPage] = useState('dashboard');
  const { connected, feed } = useWebSocket();

  const pages = {
    dashboard: <Dashboard feed={feed} connected={connected} />,
    markets:   <Markets />,
    traders:   <Traders />,
    bots:      <BotSettings />,
    copied:    <Dashboard feed={feed} connected={connected} />,
    portfolio: <Portfolio />,
    history:   <Portfolio />,
    settings:  <BotSettings />,
    apikeys:   <ApiKeys />,
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--color-background-primary)' }}>
      <Sidebar page={page} setPage={setPage} botRunning={connected} />
      <main style={{ marginLeft: 220, flex: 1, padding: '1.25rem 1.5rem', overflowY: 'auto', minHeight: '100vh' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <div style={{ fontSize: 15, fontWeight: 500, textTransform: 'capitalize' }}>
            {{ dashboard:'Dashboard', markets:'Live Markets', traders:'Top Traders', bots:'My Bots', copied:'Copied Trades', portfolio:'Portfolio', history:'Trade History', settings:'Bot Settings', apikeys:'API Keys' }[page]}
          </div>
          <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 20, background: connected ? '#14532d' : '#1c1c1c', color: connected ? '#4ade80' : '#6e7681', border: `0.5px solid ${connected ? '#166534' : '#30363d'}` }}>
            {connected ? '● Live' : '● Demo mode — add API keys'}
          </span>
        </div>
        {pages[page] || pages.dashboard}
      </main>
    </div>
  );
}
