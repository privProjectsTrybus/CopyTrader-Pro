import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import dotenv from 'dotenv';
import { botRouter } from './routes/bot.js';
import { traderRouter } from './routes/traders.js';
import { portfolioRouter } from './routes/portfolio.js';
import { BotEngine } from './bot/engine.js';
import { BinanceService } from './services/binance.js';

dotenv.config();

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

// Routes
app.use('/api/bot', botRouter);
app.use('/api/traders', traderRouter);
app.use('/api/portfolio', portfolioRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// WebSocket: broadcast live feed to all clients
const clients = new Set();
wss.on('connection', (ws) => {
  clients.add(ws);
  ws.on('close', () => clients.delete(ws));
});

export function broadcast(type, data) {
  const msg = JSON.stringify({ type, data, ts: Date.now() });
  for (const client of clients) {
    if (client.readyState === 1) client.send(msg);
  }
}

// Start bot engine
const binance = new BinanceService(
  process.env.BINANCE_API_KEY || '',
  process.env.BINANCE_API_SECRET || ''
);
export const botEngine = new BotEngine(binance, broadcast);
botEngine.start();

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`\n🚀 CopyTrader backend running on http://localhost:${PORT}`);
  console.log(`📡 WebSocket ready on ws://localhost:${PORT}`);
  console.log(`📊 Binance API: ${process.env.BINANCE_API_KEY ? '✅ configured' : '⚠️  demo mode (no key)'}\n`);
});
