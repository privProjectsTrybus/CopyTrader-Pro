import crypto from 'crypto';
import axios from 'axios';

const BASE_URL = 'https://api.binance.com';
const BASE_URL_TEST = 'https://testnet.binance.vision';

export class BinanceService {
  constructor(apiKey, apiSecret, testnet = false) {
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
    this.baseUrl = testnet ? BASE_URL_TEST : BASE_URL;
    this.isConfigured = !!(apiKey && apiSecret);
  }

  sign(queryString) {
    return crypto
      .createHmac('sha256', this.apiSecret)
      .update(queryString)
      .digest('hex');
  }

  async request(method, path, params = {}, signed = false) {
    if (!this.isConfigured && signed) {
      throw new Error('Binance API key/secret not configured. Add them to .env');
    }

    let queryString = new URLSearchParams(params).toString();

    if (signed) {
      const timestamp = Date.now();
      queryString += `&timestamp=${timestamp}`;
      const signature = this.sign(queryString);
      queryString += `&signature=${signature}`;
    }

    const url = `${this.baseUrl}${path}${queryString ? '?' + queryString : ''}`;
    const headers = this.apiKey ? { 'X-MBX-APIKEY': this.apiKey } : {};

    try {
      const res = await axios({ method, url, headers });
      return res.data;
    } catch (err) {
      const msg = err.response?.data?.msg || err.message;
      throw new Error(`Binance API error: ${msg}`);
    }
  }

  // --- Market Data (no auth needed) ---

  async getPrice(symbol) {
    return this.request('GET', '/api/v3/ticker/price', { symbol });
  }

  async getPrices(symbols) {
    // Batch fetch multiple symbols
    const results = await Promise.all(symbols.map(s => this.getPrice(s)));
    return Object.fromEntries(results.map(r => [r.symbol, parseFloat(r.price)]));
  }

  async get24hrStats(symbol) {
    return this.request('GET', '/api/v3/ticker/24hr', { symbol });
  }

  async getKlines(symbol, interval = '1h', limit = 48) {
    const raw = await this.request('GET', '/api/v3/klines', { symbol, interval, limit });
    return raw.map(k => ({
      time: k[0],
      open: parseFloat(k[1]),
      high: parseFloat(k[2]),
      low: parseFloat(k[3]),
      close: parseFloat(k[4]),
      volume: parseFloat(k[5]),
    }));
  }

  // --- Account (auth required) ---

  async getAccount() {
    return this.request('GET', '/api/v3/account', {}, true);
  }

  async getOpenOrders(symbol) {
    const params = symbol ? { symbol } : {};
    return this.request('GET', '/api/v3/openOrders', params, true);
  }

  async getTradeHistory(symbol, limit = 50) {
    return this.request('GET', '/api/v3/myTrades', { symbol, limit }, true);
  }

  // --- Trading (auth required) ---

  async placeOrder({ symbol, side, type = 'MARKET', quantity, price, timeInForce = 'GTC' }) {
    const params = { symbol, side, type, quantity: quantity.toFixed(6) };
    if (type === 'LIMIT') {
      params.price = price.toFixed(2);
      params.timeInForce = timeInForce;
    }
    return this.request('POST', '/api/v3/order', params, true);
  }

  async cancelOrder(symbol, orderId) {
    return this.request('DELETE', '/api/v3/order', { symbol, orderId }, true);
  }

  // --- Demo mode fallback ---

  getDemoAccount() {
    return {
      balances: [
        { asset: 'USDT', free: '10000.00', locked: '0.00' },
        { asset: 'BTC', free: '0.15', locked: '0.00' },
        { asset: 'ETH', free: '2.50', locked: '0.00' },
        { asset: 'SOL', free: '25.00', locked: '0.00' },
      ],
      canTrade: true,
      demo: true,
    };
  }
}
