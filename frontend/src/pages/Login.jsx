import { useState } from 'react';

const API = '/api';

export default function Login({ onLogin }) {
  const [mode, setMode]       = useState('login'); // 'login' | 'register'
  const [username, setUser]   = useState('');
  const [password, setPass]   = useState('');
  const [invite, setInvite]   = useState('');
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError(''); setLoading(true);
    try {
      const body = mode === 'login'
        ? { username, password }
        : { username, password, inviteCode: invite };
      const r = await fetch(`${API}/auth?action=${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await r.json();
      if (!r.ok) { setError(data.error || 'Something went wrong'); return; }
      localStorage.setItem('ct_token', data.token);
      localStorage.setItem('ct_user', data.username);
      onLogin(data);
    } catch { setError('Network error — try again'); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg-primary)', display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem' }}>
      <div style={{ width:'100%', maxWidth:420 }}>
        {/* Logo */}
        <div style={{ textAlign:'center', marginBottom:'2rem' }}>
          <div style={{ width:56, height:56, borderRadius:16, background:'linear-gradient(135deg,#22c55e,#16a34a)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:28, margin:'0 auto 12px' }}>📈</div>
          <div style={{ fontSize:24, fontWeight:800, letterSpacing:'-0.5px' }}>CopyTrader Pro</div>
          <div style={{ fontSize:13, color:'var(--text-muted)', marginTop:4 }}>Automated crypto copy trading</div>
        </div>

        <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:'var(--radius-xl)', padding:'2rem' }}>
          {/* Tabs */}
          <div style={{ display:'flex', gap:4, marginBottom:'1.5rem', background:'var(--bg-hover)', borderRadius:'var(--radius-md)', padding:4 }}>
            {['login','register'].map(m => (
              <button key={m} onClick={() => { setMode(m); setError(''); }} style={{
                flex:1, padding:'8px', borderRadius:'var(--radius-sm)', border:'none', cursor:'pointer', fontSize:13, fontWeight:600, transition:'all 0.15s',
                background: mode === m ? 'var(--bg-card)' : 'transparent',
                color: mode === m ? 'var(--text-primary)' : 'var(--text-muted)',
                boxShadow: mode === m ? '0 1px 3px rgba(0,0,0,0.3)' : 'none',
              }}>
                {m === 'login' ? 'Sign In' : 'Register'}
              </button>
            ))}
          </div>

          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            <div>
              <label style={{ fontSize:12, fontWeight:600, color:'var(--text-secondary)', display:'block', marginBottom:6 }}>Username</label>
              <input
                value={username} onChange={e => setUser(e.target.value)}
                placeholder="Enter username"
                onKeyDown={e => e.key === 'Enter' && submit()}
                style={inp}
              />
            </div>
            <div>
              <label style={{ fontSize:12, fontWeight:600, color:'var(--text-secondary)', display:'block', marginBottom:6 }}>Password</label>
              <input
                type="password" value={password} onChange={e => setPass(e.target.value)}
                placeholder="Enter password"
                onKeyDown={e => e.key === 'Enter' && submit()}
                style={inp}
              />
            </div>
            {mode === 'register' && (
              <div>
                <label style={{ fontSize:12, fontWeight:600, color:'var(--text-secondary)', display:'block', marginBottom:6 }}>Invite Code</label>
                <input
                  value={invite} onChange={e => setInvite(e.target.value.toUpperCase())}
                  placeholder="Enter invite code"
                  onKeyDown={e => e.key === 'Enter' && submit()}
                  style={inp}
                />
                <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:5 }}>Need an invite code? Contact the admin.</div>
              </div>
            )}

            {error && (
              <div style={{ background:'var(--red-bg)', border:'1px solid #7f1d1d', borderRadius:'var(--radius-sm)', padding:'10px 12px', fontSize:13, color:'var(--red)' }}>
                {error}
              </div>
            )}

            <button onClick={submit} disabled={loading || !username || !password} style={{
              background: loading ? 'var(--green-dim)' : 'var(--green)',
              color: '#000', border:'none', borderRadius:'var(--radius-md)', padding:'12px',
              fontSize:14, fontWeight:700, cursor: loading ? 'wait' : 'pointer',
              opacity: (!username || !password) ? 0.5 : 1,
              transition:'all 0.15s', marginTop:4,
            }}>
              {loading ? 'Loading…' : mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </div>
        </div>

        <div style={{ textAlign:'center', marginTop:'1rem', fontSize:12, color:'var(--text-muted)' }}>
          Your API keys are encrypted and never shared
        </div>
      </div>
    </div>
  );
}

const inp = { width:'100%', background:'var(--bg-hover)', border:'1px solid var(--border)', color:'var(--text-primary)', padding:'10px 12px', borderRadius:'var(--radius-md)', fontSize:14, outline:'none' };
