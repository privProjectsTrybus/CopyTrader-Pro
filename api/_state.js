// Shared singleton state for serverless (warm instances reuse this)
import { BinanceService } from '../backend/services/binance.js';
import { BotEngine } from '../backend/bot/engine.js';

const broadcast = (type, data) => {
  // WebSocket not available in serverless - store events in memory for polling
  if (!global._eventQueue) global._eventQueue = [];
  global._eventQueue.unshift({ type, data, ts: Date.now() });
  if (global._eventQueue.length > 200) global._eventQueue = global._eventQueue.slice(0, 200);
};

let _engine;
export function getEngine() {
  if (!_engine) {
    const binance = new BinanceService(
      process.env.BINANCE_API_KEY || '',
      process.env.BINANCE_API_SECRET || ''
    );
    _engine = new BotEngine(binance, broadcast);
    _engine.start();
  }
  return _engine;
}

export function getEvents(since = 0) {
  return (global._eventQueue || []).filter(e => e.ts > since);
}
