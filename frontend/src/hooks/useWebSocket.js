import { useEffect, useRef, useState, useCallback } from 'react';

// In production (Vercel serverless), WebSocket isn't available — use polling instead
const IS_PROD = import.meta.env.PROD;
const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3001';

export function useWebSocket() {
  const ws = useRef(null);
  const pollRef = useRef(null);
  const lastTs = useRef(Date.now());
  const [connected, setConnected] = useState(false);
  const [feed, setFeed] = useState([]);
  const listeners = useRef({});

  const handleMessage = useCallback((msg) => {
    const tradeTypes = ['trade_opened','trade_closed','stop_loss_triggered','trade_error'];
    if (tradeTypes.includes(msg.type)) {
      setFeed(prev => [{ ...msg, id: msg.ts }, ...prev].slice(0, 100));
    }
    if (listeners.current[msg.type]) listeners.current[msg.type](msg.data);
  }, []);

  useEffect(() => {
    if (IS_PROD) {
      // Polling fallback for serverless
      const poll = async () => {
        try {
          const res = await fetch(`/api/events?since=${lastTs.current}`);
          const { events, ts } = await res.json();
          if (ts) lastTs.current = ts;
          events?.forEach(handleMessage);
          setConnected(true);
        } catch { setConnected(false); }
      };
      poll();
      pollRef.current = setInterval(poll, 3000);
      return () => clearInterval(pollRef.current);
    } else {
      // Local dev: real WebSocket
      const connect = () => {
        ws.current = new WebSocket(WS_URL);
        ws.current.onopen = () => setConnected(true);
        ws.current.onclose = () => { setConnected(false); setTimeout(connect, 3000); };
        ws.current.onerror = () => ws.current.close();
        ws.current.onmessage = (e) => {
          try { handleMessage(JSON.parse(e.data)); } catch {}
        };
      };
      connect();
      return () => ws.current?.close();
    }
  }, [handleMessage]);

  const on = useCallback((type, handler) => {
    listeners.current[type] = handler;
    return () => delete listeners.current[type];
  }, []);

  return { connected, feed, on };
}
