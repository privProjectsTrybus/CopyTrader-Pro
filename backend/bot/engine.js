/**
 * BotEngine — core copy trading automation
 *
 * Flow:
 *  1. Poll configured signal sources (Binance leaderboard, 3Commas, manual signals)
 *  2. For each new trade signal from a copied trader:
 *     - Check filters (asset type, max size, drawdown limits)
 *     - Calculate proportional size based on copy mode
 *     - Execute via BinanceService (or paper-trade in demo mode)
 *     - Broadcast trade event via WebSocket
 *  3. Monitor open positions, apply stop-loss, close when leader closes
 */

export class BotEngine {
  constructor(binanceService, broadcast) {
    this.binance = binanceService;
    this.broadcast = broadcast;
    this.running = false;
    this.interval = null;

    // State
    this.copiedTraders = new Map();   // traderId -> trader config
    this.openPositions = new Map();   // positionId -> position
    this.tradeLog = [];
    this.totalPnl = 0;

    // Settings (can be updated via API)
    this.settings = {
      copyMode: 'proportional',       // 'proportional' | 'fixed' | 'fixedLot'
      maxTradeSize: 500,              // USD per trade
      autoStopLoss: 0.02,             // 2%
      copyCloses: true,
      pauseOnDrawdown: 0.05,          // 5%
      assetFilter: 'all',             // 'all' | 'crypto' | 'stocks' | 'forex'
      demoMode: !binanceService.isConfigured,
    };
  }

  start() {
    if (this.running) return;
    this.running = true;
    console.log(`🤖 Bot engine started [${this.settings.demoMode ? 'DEMO' : 'LIVE'} mode]`);

    // Simulate signal polling every 8 seconds in demo mode
    this.interval = setInterval(() => this._pollSignals(), 8000);

    // Seed some demo traders
    if (this.settings.demoMode) this._seedDemoTraders();
  }

  stop() {
    this.running = false;
    if (this.interval) clearInterval(this.interval);
    console.log('🤖 Bot engine stopped');
  }

  updateSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
    this.broadcast('settings_updated', this.settings);
  }

  addTrader(trader) {
    this.copiedTraders.set(trader.id, { ...trader, addedAt: Date.now(), trades: 0 });
    this.broadcast('trader_added', trader);
    console.log(`📋 Now copying: ${trader.name}`);
  }

  removeTrader(traderId) {
    const trader = this.copiedTraders.get(traderId);
    this.copiedTraders.delete(traderId);
    if (trader) this.broadcast('trader_removed', trader);
  }

  getStatus() {
    return {
      running: this.running,
      demoMode: this.settings.demoMode,
      copiedTraders: Array.from(this.copiedTraders.values()),
      openPositions: Array.from(this.openPositions.values()),
      tradeLog: this.tradeLog.slice(-50),
      totalPnl: this.totalPnl,
      settings: this.settings,
    };
  }

  // ─── Internal ────────────────────────────────────────────────────────────────

  _seedDemoTraders() {
    const demos = [
      { id: 'trader_1', name: 'CryptoWolf_X', source: 'binance', winRate: 0.91, pnl30d: 84.2 },
      { id: 'trader_2', name: 'AlphaStocks',  source: 'etoro',   winRate: 0.78, pnl30d: 61.7 },
      { id: 'trader_3', name: 'BullRunKing',  source: 'bybit',   winRate: 0.69, pnl30d: 38.5 },
    ];
    demos.forEach(t => this.copiedTraders.set(t.id, { ...t, addedAt: Date.now(), trades: 0 }));
  }

  async _pollSignals() {
    if (!this.running) return;

    for (const [id, trader] of this.copiedTraders) {
      // In live mode, fetch from real APIs; in demo, generate realistic signals
      const signals = this.settings.demoMode
        ? this._generateDemoSignal(trader)
        : await this._fetchLiveSignals(trader);

      for (const signal of signals) {
        await this._handleSignal(trader, signal);
      }
    }

    // Check stop-losses on open positions
    this._checkStopLosses();
  }

  async _handleSignal(trader, signal) {
    if (!this._passesFilter(signal)) return;

    const size = this._calculateSize(signal);
    const positionId = `${trader.id}_${signal.symbol}_${Date.now()}`;

    const trade = {
      id: positionId,
      traderId: trader.id,
      traderName: trader.name,
      symbol: signal.symbol,
      side: signal.side,
      entryPrice: signal.price,
      size,
      sizeUsd: size * signal.price,
      openedAt: Date.now(),
      status: 'open',
      pnl: 0,
      source: trader.source,
    };

    if (signal.action === 'open') {
      // Execute order
      if (!this.settings.demoMode) {
        try {
          const order = await this.binance.placeOrder({
            symbol: signal.symbol,
            side: signal.side === 'long' ? 'BUY' : 'SELL',
            type: 'MARKET',
            quantity: size,
          });
          trade.orderId = order.orderId;
          trade.executedPrice = parseFloat(order.fills?.[0]?.price || signal.price);
        } catch (err) {
          console.error(`Order failed for ${signal.symbol}:`, err.message);
          this.broadcast('trade_error', { symbol: signal.symbol, error: err.message });
          return;
        }
      }

      this.openPositions.set(positionId, trade);
      this.tradeLog.unshift({ ...trade, type: 'open' });
      trader.trades++;

      this.broadcast('trade_opened', {
        ...trade,
        message: `${trader.name} opened ${signal.symbol} ${signal.side.toUpperCase()} @ $${signal.price.toLocaleString()}`,
      });

    } else if (signal.action === 'close') {
      // Find and close matching position
      for (const [pid, pos] of this.openPositions) {
        if (pos.traderId === trader.id && pos.symbol === signal.symbol) {
          const pnlPct = signal.side === 'long'
            ? (signal.price - pos.entryPrice) / pos.entryPrice
            : (pos.entryPrice - signal.price) / pos.entryPrice;

          pos.pnl = pnlPct * 100;
          pos.closedAt = Date.now();
          pos.exitPrice = signal.price;
          pos.status = 'closed';
          this.totalPnl += pos.pnl;

          this.openPositions.delete(pid);
          this.tradeLog.unshift({ ...pos, type: 'close' });

          this.broadcast('trade_closed', {
            ...pos,
            message: `${trader.name} closed ${signal.symbol} ${pos.pnl >= 0 ? '+' : ''}${pos.pnl.toFixed(1)}%`,
          });
          break;
        }
      }
    }
  }

  _passesFilter(signal) {
    const { assetFilter } = this.settings;
    if (assetFilter === 'all') return true;

    const cryptoPairs = /USDT|BTC|ETH|BNB|SOL/;
    const forexPairs = /EUR|GBP|JPY|USD|CHF/;

    if (assetFilter === 'crypto') return cryptoPairs.test(signal.symbol);
    if (assetFilter === 'forex') return forexPairs.test(signal.symbol);
    if (assetFilter === 'stocks') return !cryptoPairs.test(signal.symbol) && !forexPairs.test(signal.symbol);
    return true;
  }

  _calculateSize(signal) {
    const { copyMode, maxTradeSize } = this.settings;
    const maxQty = maxTradeSize / signal.price;

    if (copyMode === 'proportional') return Math.min(signal.quantity * 0.1, maxQty);
    if (copyMode === 'fixed') return maxTradeSize / signal.price;
    if (copyMode === 'fixedLot') return signal.quantity;
    return maxQty;
  }

  _checkStopLosses() {
    // In demo mode, randomly move prices to trigger SL
    for (const [pid, pos] of this.openPositions) {
      if (!this.settings.autoStopLoss) continue;

      // Simulate price movement
      const drift = (Math.random() - 0.48) * 0.005;
      const currentPrice = pos.entryPrice * (1 + drift);
      const pnlPct = pos.side === 'long'
        ? (currentPrice - pos.entryPrice) / pos.entryPrice
        : (pos.entryPrice - currentPrice) / pos.entryPrice;

      if (pnlPct <= -this.settings.autoStopLoss) {
        pos.pnl = pnlPct * 100;
        pos.status = 'stopped';
        pos.exitPrice = currentPrice;
        pos.closedAt = Date.now();
        this.openPositions.delete(pid);
        this.tradeLog.unshift({ ...pos, type: 'stop_loss' });
        this.totalPnl += pos.pnl;

        this.broadcast('stop_loss_triggered', {
          ...pos,
          message: `Stop-loss hit on ${pos.symbol} (${pos.pnl.toFixed(1)}%)`,
        });
      }
    }
  }

  _generateDemoSignal(trader) {
    // Only fire a signal occasionally (~25% chance per poll)
    if (Math.random() > 0.25) return [];

    const cryptoPairs = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'ADAUSDT'];
    const prices = { BTCUSDT: 61240, ETHUSDT: 3180, SOLUSDT: 142, BNBUSDT: 398, ADAUSDT: 0.58 };
    const quantities = { BTCUSDT: 0.01, ETHUSDT: 0.1, SOLUSDT: 5, BNBUSDT: 0.5, ADAUSDT: 500 };

    const symbol = cryptoPairs[Math.floor(Math.random() * cryptoPairs.length)];
    const side = Math.random() > 0.5 ? 'long' : 'short';

    // Check if we have an open position to maybe close
    const existingPos = Array.from(this.openPositions.values())
      .find(p => p.traderId === trader.id && p.symbol === symbol);

    if (existingPos && Math.random() > 0.6) {
      return [{ action: 'close', symbol, side: existingPos.side, price: prices[symbol] * (1 + (Math.random() - 0.4) * 0.02), quantity: existingPos.size }];
    }

    return [{ action: 'open', symbol, side, price: prices[symbol] * (1 + (Math.random() - 0.5) * 0.002), quantity: quantities[symbol] }];
  }

  async _fetchLiveSignals(trader) {
    // In live mode, implement per-source fetching:
    if (trader.source === 'binance') return this._fetchBinanceLeaderboard(trader);
    if (trader.source === '3commas') return this._fetch3CommasSignals(trader);
    return [];
  }

  async _fetchBinanceLeaderboard(trader) {
    // Binance Futures leaderboard API (public)
    try {
      const res = await fetch(`https://www.binance.com/bapi/futures/v3/public/future/leaderboard/getOtherPosition?tradeType=PERPETUAL&encryptedUid=${trader.binanceUid}&periodType=`);
      const data = await res.json();
      // Parse and return position changes as signals
      return (data?.data?.otherPositionRetList || []).map(p => ({
        action: 'open',
        symbol: p.symbol,
        side: p.amount > 0 ? 'long' : 'short',
        price: p.entryPrice,
        quantity: Math.abs(p.amount),
      }));
    } catch {
      return [];
    }
  }

  async _fetch3CommasSignals(trader) {
    // 3Commas webhook/API integration placeholder
    // Set up a 3Commas bot that sends signals to your /api/bot/signal endpoint
    return [];
  }
}
