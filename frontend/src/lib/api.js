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
  getTraders: (params = {}) => req('GET', `/traders?${new URLSearchParams(params)}`),
  getTrader: (id) => req('GET', `/traders?id=${id}`),
  getBotStatus: () => req('GET', '/bot?action=status'),
  copyTrader: (trader) => req('POST', '/bot?action=copy', { trader }),
  stopCopying: (traderId) => req('DELETE', `/bot?action=copy&traderId=${traderId}`),
  updateSettings: (settings) => req('PUT', '/bot?action=settings', settings),
  startBot: () => req('POST', '/bot?action=start'),
  stopBot: () => req('POST', '/bot?action=stop'),
  getPortfolio: () => req('GET', '/portfolio'),
  getHistory: () => req('GET', '/portfolio'),
};
