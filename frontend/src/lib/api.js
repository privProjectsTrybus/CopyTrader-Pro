// Auto-detect: /api in prod (Vercel), localhost:3001 in dev
const IS_PROD = import.meta.env.PROD;
const BASE = IS_PROD ? '/api' : (import.meta.env.VITE_API_URL || 'http://localhost:3001/api');

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
  // Traders
  getTraders: (params = {}) => req('GET', `/traders?${new URLSearchParams(params)}`),
  getTrader: (id) => req('GET', `/traders?id=${id}`),

  // Live prices
  getPrices: () => req('GET', '/prices'),

  // Portfolio (real balances via API keys)
  getPortfolio: () => req('GET', '/portfolio'),

  // Bot controls
  getBotStatus: () => req('GET', '/bot?action=status'),
  copyTrader: (trader) => req('POST', '/bot?action=copy', { trader }),
  stopCopying: (traderId) => req('DELETE', `/bot?action=copy&traderId=${traderId}`),
  updateSettings: (settings) => req('PUT', '/bot?action=settings', settings),
  executeTrade: (trade) => req('POST', '/bot?action=execute', trade),
  getEvents: (since = 0) => req('GET', `/bot?action=events&since=${since}`),
};
