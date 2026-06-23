export default function ApiKeys() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: 600 }}>
      <div style={card}>
        <div style={{ fontWeight: 500, fontSize: 14, marginBottom: 4 }}>Binance API</div>
        <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginBottom: 16 }}>Add your Binance API key and secret to enable live trading. Create a key at binance.com → Account → API Management.</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <input placeholder="API Key" style={{ ...input }} />
          <input placeholder="API Secret" type="password" style={{ ...input }} />
          <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>⚠️ Enable Spot & Futures trading. Disable withdrawals for safety.</div>
          <button style={saveBtn}>Save Binance keys</button>
        </div>
      </div>

      <div style={card}>
        <div style={{ fontWeight: 500, fontSize: 14, marginBottom: 4 }}>Bybit API</div>
        <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginBottom: 16 }}>For copying Bybit traders. Create a key at bybit.com → API Management.</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <input placeholder="API Key" style={{ ...input }} />
          <input placeholder="API Secret" type="password" style={{ ...input }} />
          <button style={saveBtn}>Save Bybit keys</button>
        </div>
      </div>

      <div style={card}>
        <div style={{ fontWeight: 500, fontSize: 14, marginBottom: 4 }}>3Commas webhook</div>
        <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginBottom: 16 }}>To receive signals from 3Commas bots or TradingView alerts, point your webhook to:</div>
        <code style={{ display: 'block', background: 'var(--color-background-primary)', padding: '10px 12px', borderRadius: 6, fontSize: 12, marginBottom: 10, wordBreak: 'break-all' }}>
          POST http://localhost:3001/api/bot/signal
        </code>
        <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>Body: {`{ "symbol": "BTCUSDT", "side": "long", "action": "open", "price": 61240, "quantity": 0.01 }`}</div>
      </div>

      <div style={{ ...card, background: '#1c0a00', borderColor: '#92400e' }}>
        <div style={{ fontWeight: 500, fontSize: 13, color: '#fb923c', marginBottom: 6 }}>⚠️ Security notice</div>
        <div style={{ fontSize: 12, color: '#fcd34d', lineHeight: 1.6 }}>
          API keys are stored in your local .env file and never sent to any third party.<br />
          Always create API keys with trading permissions only — never enable withdrawals.<br />
          Use IP whitelisting on your exchange to restrict key usage to your server IP.
        </div>
      </div>
    </div>
  );
}

const card = { background: 'var(--color-background-secondary)', borderRadius: 'var(--border-radius-lg)', border: '0.5px solid var(--color-border-tertiary)', padding: '1.25rem' };
const input = { background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-secondary)', color: 'var(--color-text-primary)', padding: '8px 12px', borderRadius: 'var(--border-radius-md)', fontSize: 13, width: '100%' };
const saveBtn = { background: '#14532d', color: '#4ade80', border: '0.5px solid #166534', padding: '8px 20px', borderRadius: 'var(--border-radius-md)', fontSize: 13, cursor: 'pointer', fontWeight: 500, alignSelf: 'flex-start' };
