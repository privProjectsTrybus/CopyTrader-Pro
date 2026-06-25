const BASE = '/api';

async function req(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export const api = {
  getPrices:      ()           => req('GET',    '/prices'),
  getTraders:     (p={})       => req('GET',    `/traders?${new URLSearchParams(p)}`),
  getTrader:      (id)         => req('GET',    `/traders?id=${id}`),
  getPortfolio:   ()           => req('GET',    '/portfolio'),
  getBotStatus:   ()           => req('GET',    '/bot?action=status'),
  getEvents:      (since=0)    => req('GET',    `/bot?action=events&since=${since}`),
  copyTrader:     (trader)     => req('POST',   '/bot?action=copy',     { trader }),
  stopCopying:    (traderId)   => req('DELETE', `/bot?action=copy&traderId=${traderId}`),
  updateSettings: (settings)   => req('PUT',    '/bot?action=settings', settings),
  executeTrade:   (trade)      => req('POST',   '/bot?action=execute',  trade),
  signalTrade:    (signal)     => req('POST',   '/bot?action=signal',   signal),
};
