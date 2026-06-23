const BASE = import.meta.env.VITE_API_URL || 
  (import.meta.env.PROD ? '/_/backend/api' : 'http://localhost:3001/api');

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
  getTrader: (id) => req('GET', `/traders/${id}`),
  getBotStatus: () => req('GET', '/bot/status'),
  copyTrader: (trader) => req('POST', '/bot/copy', { trader }),
  stopCopying: (traderId) => req('DELETE', `/bot/copy/${traderId}`),
  updateSettings: (settings) => req('PUT', '/bot/settings', settings),
  startBot: () => req('POST', '/bot/start'),
  stopBot: () => req('POST', '/bot/stop'),
  getPortfolio: () => req('GET', '/portfolio'),
  getHistory: () => req('GET', '/portfolio/history'),
};
