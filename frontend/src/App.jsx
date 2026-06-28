import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Traders from './pages/Traders.jsx';
import Portfolio from './pages/Portfolio.jsx';
import BotSettings from './pages/BotSettings.jsx';
import ApiKeys from './pages/ApiKeys.jsx';
import Markets from './pages/Markets.jsx';
import Login from './pages/Login.jsx';
import { useWebSocket } from './hooks/useWebSocket.js';

const TITLES = { dashboard:'Dashboard', markets:'Live Markets', traders:'Top Traders', bots:'My Bots', copied:'Trade Feed', portfolio:'Portfolio', history:'Trade History', settings:'Bot Settings', apikeys:'API Keys' };

export default function App() {
  const [user, setUser]           = useState(null);
  const [authChecked, setChecked] = useState(false);
  const [page, setPage]           = useState('dashboard');
  const [copyingCount, setCopy]   = useState(0);
  const { connected, feed }        = useWebSocket();

  // Check existing session on load
  useEffect(() => {
    const token = localStorage.getItem('ct_token');
    const username = localStorage.getItem('ct_user');
    if (token && username) {
      // Verify token is still valid
      fetch('/api/auth?action=verify', { headers: { 'Authorization': `Bearer ${token}` } })
        .then(r => r.json())
        .then(d => {
          if (d.valid) setUser({ username: d.username, role: d.role });
          else { localStorage.removeItem('ct_token'); localStorage.removeItem('ct_user'); }
        })
        .catch(() => setUser({ username })) // network error — keep session
        .finally(() => setChecked(true));
    } else setChecked(true);
  }, []);

  const logout = () => {
    localStorage.removeItem('ct_token');
    localStorage.removeItem('ct_user');
    setUser(null);
  };

  if (!authChecked) return (
    <div style={{ minHeight:'100vh', background:'var(--bg-primary)', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ color:'var(--text-muted)', fontSize:14 }}>Loading…</div>
    </div>
  );

  if (!user) return <Login onLogin={setUser} />;

  const pages = {
    dashboard: <Dashboard feed={feed} connected={connected} />,
    markets:   <Markets />,
    traders:   <Traders onCopyChange={setCopy} />,
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
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'1.5rem' }}>
          <div>
            <div style={{ fontSize:20, fontWeight:700, letterSpacing:'-0.3px' }}>{TITLES[page]}</div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ fontSize:12, padding:'5px 12px', borderRadius:20, background:'var(--bg-card)', color:'var(--text-secondary)', border:'1px solid var(--border)', fontWeight:500 }}>
              👤 {user.username}
            </div>
            <button onClick={logout} style={{ fontSize:12, padding:'5px 12px', borderRadius:20, background:'transparent', color:'var(--text-muted)', border:'1px solid var(--border)', cursor:'pointer' }}>
              Sign out
            </button>
          </div>
        </div>
        {pages[page] || pages.dashboard}
      </main>
    </div>
  );
}
