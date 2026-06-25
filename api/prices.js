export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=15');

  const symbols = ['BTCUSDT','ETHUSDT','SOLUSDT','BNBUSDT','ADAUSDT','DOGEUSDT','XRPUSDT','DOTUSDT'];

  // 1. Try Binance public data mirror (no geo-block, no auth needed)
  try {
    const [t, s] = await Promise.all([
      fetch('https://data-api.binance.vision/api/v3/ticker/price', { signal: AbortSignal.timeout(6000) }),
      fetch('https://data-api.binance.vision/api/v3/ticker/24hr',  { signal: AbortSignal.timeout(6000) }),
    ]);
    if (t.ok && s.ok) {
      const allPrices = await t.json();
      const allStats  = await s.json();
      if (Array.isArray(allPrices) && allPrices.length > 0) {
        const pm = Object.fromEntries(allPrices.map(p => [p.symbol, parseFloat(p.price)]));
        const sm = Object.fromEntries(allStats.map(s => [s.symbol, s]));
        const markets = symbols.map(sym => ({
          symbol: sym, price: pm[sym]||0,
          change24h: parseFloat(sm[sym]?.priceChangePercent||0),
          high24h:   parseFloat(sm[sym]?.highPrice||0),
          low24h:    parseFloat(sm[sym]?.lowPrice||0),
          volume24h: parseFloat(sm[sym]?.quoteVolume||0),
        })).filter(m => m.price > 0);
        if (markets.length > 0) return res.json({ markets, ts: Date.now(), live: true, source: 'binance-vision' });
      }
    }
  } catch {}

  // 2. CoinGecko — always works, no geo-block
  try {
    const cgIds = 'bitcoin,ethereum,solana,binancecoin,cardano,dogecoin,ripple,polkadot';
    const r = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${cgIds}&vs_currencies=usd&include_24hr_change=true&include_24hr_high=true&include_24hr_low=true&include_24hr_vol=true`, { signal: AbortSignal.timeout(8000) });
    if (r.ok) {
      const data = await r.json();
      const idMap = { bitcoin:'BTCUSDT', ethereum:'ETHUSDT', solana:'SOLUSDT', binancecoin:'BNBUSDT', cardano:'ADAUSDT', dogecoin:'DOGEUSDT', ripple:'XRPUSDT', polkadot:'DOTUSDT' };
      const markets = Object.entries(idMap).map(([id, sym]) => {
        const v = data[id]||{};
        return { symbol:sym, price:v.usd||0, change24h:v.usd_24h_change||0, high24h:v.usd_24h_high||0, low24h:v.usd_24h_low||0, volume24h:v.usd_24h_vol||0 };
      }).filter(m => m.price > 0);
      if (markets.length > 0) return res.json({ markets, ts: Date.now(), live: true, source: 'coingecko' });
    }
  } catch {}

  // 3. Kraken public API — no geo-block
  try {
    const krakenPairs = { 'XXBTZUSD':'BTCUSDT', 'XETHZUSD':'ETHUSDT', 'SOLUSD':'SOLUSDT', 'XRPUSD':'XRPUSDT', 'DOGEUSD':'DOGEUSDT' };
    const r = await fetch('https://api.kraken.com/0/public/Ticker?pair=XXBTZUSD,XETHZUSD,SOLUSD,XRPUSD', { signal: AbortSignal.timeout(6000) });
    if (r.ok) {
      const data = await r.json();
      const result = data.result || {};
      const markets = Object.entries(krakenPairs).map(([kPair, sym]) => {
        const t = result[kPair];
        if (!t) return null;
        return { symbol:sym, price:parseFloat(t.c[0]), change24h:0, high24h:parseFloat(t.h[1]), low24h:parseFloat(t.l[1]), volume24h:parseFloat(t.v[1])*parseFloat(t.c[0]) };
      }).filter(Boolean);
      if (markets.length > 0) return res.json({ markets, ts: Date.now(), live: true, source: 'kraken' });
    }
  } catch {}

  res.json({ markets: [], error: 'All price sources failed', live: false });
}
