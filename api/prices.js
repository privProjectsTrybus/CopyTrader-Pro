// Real-time prices from Binance public API — no key needed
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=10');

  const symbols = ['BTCUSDT','ETHUSDT','SOLUSDT','BNBUSDT','ADAUSDT','DOGEUSDT','XRPUSDT','DOTUSDT'];

  try {
    const [tickerRes, statsRes] = await Promise.all([
      fetch('https://api.binance.com/api/v3/ticker/price', { signal: AbortSignal.timeout(5000) }),
      fetch('https://api.binance.com/api/v3/ticker/24hr', { signal: AbortSignal.timeout(5000) }),
    ]);

    const allPrices = await tickerRes.json();
    const allStats = await statsRes.json();

    const priceMap = Object.fromEntries(allPrices.map(p => [p.symbol, parseFloat(p.price)]));
    const statsMap = Object.fromEntries(allStats.map(s => [s.symbol, s]));

    const markets = symbols.map(sym => {
      const s = statsMap[sym] || {};
      return {
        symbol: sym,
        price: priceMap[sym] || 0,
        change24h: parseFloat(s.priceChangePercent || 0),
        high24h: parseFloat(s.highPrice || 0),
        low24h: parseFloat(s.lowPrice || 0),
        volume24h: parseFloat(s.quoteVolume || 0),
      };
    }).filter(m => m.price > 0);

    res.json({ markets, ts: Date.now(), live: true });
  } catch (err) {
    res.json({ markets: [], error: err.message, live: false });
  }
}
