import { useState } from 'react';
import Sidebar from './components/Sidebar.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Traders from './pages/Traders.jsx';
import Portfolio from './pages/Portfolio.jsx';
import BotSettings from './pages/BotSettings.jsx';
import ApiKeys from './pages/ApiKeys.jsx';
import Markets from './pages/Markets.jsx';
import { useWebSocket } from './hooks/useWebSocket.js';

const TITLES = { dashboard:'Dashboard', markets:'Live Markets', traders:'Top Traders', bots:'My Bots', copied:'Trade Feed', portfolio:'Portfolio', history:'Trade History', settings:'Bot Settings', apikeys:'API Keys' };

export default function App() {
  const [page, setPage]           = useState('dashboard');
  const [copyingCount, setCopying] = useState(0);
  const { connected, feed }        = useWebSocket();

  const pages = {
    dashboard: <Dashboard feed={feed} connected={connected} />,
    markets:   <Markets />,
    traders:   <Traders onCopyChange={setCopying} />,
    bots:      <BotSettings />,
    copied:    <Dashboard feed={feed} connected={connected} />,
    portfolio: <Portfolio />,
    history:   <Portfolio />,
    settings:  <BotSettings />,
    apikeys:   <ApiKeys />,
  };

  return (
    <div style={{ display:'flex', minHeight:'100vh', background:'var(--bg-primary)' }}>
      <Sidebar page={page} setPage={setPage} botRunning={copyingCount>0} copyingCount={copyingCount} />
      <main style={{ marginLeft:220, flex:1, padding:'1.5rem', overflowY:'auto', minHeight:'100vh' }}>
        {/* Topbar */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'1.5rem' }}>
          <div>
            <div style={{ fontSize:20, fontWeight:700, letterSpacing:'-0.3px' }}>{TITLES[page]}</div>
            <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:2 }}>
              {page==='markets'?'Real-time crypto prices':page==='traders'?'Find and copy top-performing traders':page==='dashboard'?'Your portfolio overview':''}
            </div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ fontSize:12, padding:'5px 12px', borderRadius:20, background:connected?'var(--green-bg)':'var(--bg-card)', color:connected?'var(--green)':'var(--text-muted)', border:`1px solid ${connected?'var(--green-dim)':'var(--border)'}`, fontWeight:500, display:'flex', alignItems:'center', gap:6 }}>
              <span style={{ width:6, height:6, borderRadius:'50%', background:connected?'var(--green)':'var(--text-muted)', display:'inline-block' }}/>
              {connected?'Bot connected':'Bot offline'}
            </div>
          </div>
        </div>
        {pages[page] || pages.dashboard}
      </main>
    </div>
  );
}
