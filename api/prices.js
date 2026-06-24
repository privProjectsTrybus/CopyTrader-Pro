export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=10');

  const symbols = ['BTCUSDT','ETHUSDT','SOLUSDT','BNBUSDT','ADAUSDT','DOGEUSDT','XRPUSDT','DOTUSDT'];
  const endpoints = [
    'https://api1.binance.com',
    'https://api2.binance.com',
    'https://api3.binance.com',
    'https://api4.binance.com',
    'https://data-api.binance.vision',
  ];

  for (const base of endpoints) {
    try {
      const [tickerRes, statsRes] = await Promise.all([
        fetch(`${base}/api/v3/ticker/price`, { signal: AbortSignal.timeout(6000) }),
        fetch(`${base}/api/v3/ticker/24hr`,  { signal: AbortSignal.timeout(6000) }),
      ]);
      if (!tickerRes.ok || !statsRes.ok) continue;

      const allPrices = await tickerRes.json();
      const allStats  = await statsRes.json();
      const priceMap  = Object.fromEntries(allPrices.map(p => [p.symbol, parseFloat(p.price)]));
      const statsMap  = Object.fromEntries(allStats.map(s => [s.symbol, s]));

      const markets = symbols.map(sym => {
        const s = statsMap[sym] || {};
        return {
          symbol: sym,
          price:     priceMap[sym] || 0,
          change24h: parseFloat(s.priceChangePercent || 0),
          high24h:   parseFloat(s.highPrice || 0),
          low24h:    parseFloat(s.lowPrice  || 0),
          volume24h: parseFloat(s.quoteVolume || 0),
        };
      }).filter(m => m.price > 0);

      return res.json({ markets, ts: Date.now(), live: true, source: base });
    } catch {}
  }

  // CoinGecko fallback — not geo-blocked
  try {
    const cgIds = 'bitcoin,ethereum,solana,binancecoin,cardano,dogecoin,ripple,polkadot';
    const r = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${cgIds}&vs_currencies=usd&include_24hr_change=true&include_24hr_high=true&include_24hr_low=true&include_24hr_vol=true`,
      { signal: AbortSignal.timeout(8000) }
    );
    const data = await r.json();
    const idMap = { bitcoin:'BTCUSDT', ethereum:'ETHUSDT', solana:'SOLUSDT', binancecoin:'BNBUSDT', cardano:'ADAUSDT', dogecoin:'DOGEUSDT', ripple:'XRPUSDT', polkadot:'DOTUSDT' };
    const markets = Object.entries(idMap).map(([cgId, sym]) => {
      const v = data[cgId] || {};
      return { symbol: sym, price: v.usd || 0, change24h: v.usd_24h_change || 0, high24h: v.usd_24h_high || 0, low24h: v.usd_24h_low || 0, volume24h: v.usd_24h_vol || 0 };
    }).filter(m => m.price > 0);
    return res.json({ markets, ts: Date.now(), live: true, source: 'coingecko' });
  } catch (e) {
    return res.json({ markets: [], error: e.message, live: false });
  }
}
