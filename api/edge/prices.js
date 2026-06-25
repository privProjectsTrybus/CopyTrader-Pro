export const config = { runtime: 'edge' };

export default async function handler(req) {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json', 'Cache-Control': 's-maxage=10' };

  const symbols = ['BTCUSDT','ETHUSDT','SOLUSDT','BNBUSDT','ADAUSDT','DOGEUSDT','XRPUSDT','DOTUSDT'];

  // Try Binance endpoints
  for (const base of ['https://api.binance.com','https://api1.binance.com','https://api2.binance.com','https://data-api.binance.vision']) {
    try {
      const [t, s] = await Promise.all([
        fetch(`${base}/api/v3/ticker/price`, { signal: AbortSignal.timeout(5000) }),
        fetch(`${base}/api/v3/ticker/24hr`,  { signal: AbortSignal.timeout(5000) }),
      ]);
      if (!t.ok || !s.ok) continue;
      const allPrices = await t.json();
      const allStats  = await s.json();
      const pm = Object.fromEntries(allPrices.map(p => [p.symbol, parseFloat(p.price)]));
      const sm = Object.fromEntries(allStats.map(s => [s.symbol, s]));
      const markets = symbols.map(sym => ({
        symbol: sym, price: pm[sym]||0,
        change24h: parseFloat(sm[sym]?.priceChangePercent||0),
        high24h: parseFloat(sm[sym]?.highPrice||0),
        low24h: parseFloat(sm[sym]?.lowPrice||0),
        volume24h: parseFloat(sm[sym]?.quoteVolume||0),
      })).filter(m => m.price > 0);
      return new Response(JSON.stringify({ markets, ts: Date.now(), live: true, source: base }), { headers });
    } catch {}
  }

  // CoinGecko fallback
  try {
    const cgIds = 'bitcoin,ethereum,solana,binancecoin,cardano,dogecoin,ripple,polkadot';
    const r = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${cgIds}&vs_currencies=usd&include_24hr_change=true&include_24hr_high=true&include_24hr_low=true&include_24hr_vol=true`, { signal: AbortSignal.timeout(8000) });
    const data = await r.json();
    const idMap = { bitcoin:'BTCUSDT', ethereum:'ETHUSDT', solana:'SOLUSDT', binancecoin:'BNBUSDT', cardano:'ADAUSDT', dogecoin:'DOGEUSDT', ripple:'XRPUSDT', polkadot:'DOTUSDT' };
    const markets = Object.entries(idMap).map(([id, sym]) => {
      const v = data[id]||{};
      return { symbol:sym, price:v.usd||0, change24h:v.usd_24h_change||0, high24h:v.usd_24h_high||0, low24h:v.usd_24h_low||0, volume24h:v.usd_24h_vol||0 };
    }).filter(m => m.price > 0);
    return new Response(JSON.stringify({ markets, ts: Date.now(), live: true, source: 'coingecko' }), { headers });
  } catch (e) {
    return new Response(JSON.stringify({ markets: [], error: e.message, live: false }), { headers });
  }
}
