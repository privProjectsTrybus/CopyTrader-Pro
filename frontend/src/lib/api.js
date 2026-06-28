const BASE = '/api';

function getToken() { return localStorage.getItem('ct_token') || ''; }

async function req(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 401) {
    localStorage.removeItem('ct_token');
    localStorage.removeItem('ct_user');
    window.location.reload();
    throw new Error('Session expired');
  }
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export const api = {
  // Auth
  login:          (u,p)         => fetch(`${BASE}/auth?action=login`,    { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({username:u,password:p}) }).then(r=>r.json()),
  register:       (u,p,code)    => fetch(`${BASE}/auth?action=register`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({username:u,password:p,inviteCode:code}) }).then(r=>r.json()),
  verify:         ()            => req('GET', '/auth?action=verify'),

  // Markets
  getPrices:      ()            => fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana,binancecoin,ripple,cardano,dogecoin,polkadot&vs_currencies=usd&include_24hr_change=true&include_24hr_high=true&include_24hr_low=true&include_24hr_vol=true').then(r=>r.json()),

  // Portfolio (auth required)
  getPortfolio:   ()            => req('GET', '/portfolio'),

  // Bot (auth required)
  getBotStatus:   ()            => req('GET',    '/bot?action=status'),
  getEvents:      (since=0)     => req('GET',    `/bot?action=events&since=${since}`),
  copyTrader:     (trader)      => req('POST',   '/bot?action=copy',     { trader }),
  stopCopying:    (traderId)    => req('DELETE',  `/bot?action=copy&traderId=${traderId}`),
  updateSettings: (s)           => req('PUT',    '/bot?action=settings', s),
  executeTrade:   (trade)       => req('POST',   '/bot?action=execute',  trade),
  pollTraders:    ()            => req('POST',   '/bot?action=poll',     {}),
};
