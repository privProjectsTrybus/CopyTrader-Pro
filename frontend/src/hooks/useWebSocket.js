import { useEffect, useRef, useState, useCallback } from 'react';

const WS_URL = import.meta.env.VITE_WS_URL || 
  (import.meta.env.PROD 
    ? `wss://${window.location.host}/_/backend`
    : 'ws://localhost:3001');

export function useWebSocket(url = WS_URL) {
  const ws = useRef(null);
  const [connected, setConnected] = useState(false);
  const [feed, setFeed] = useState([]);
  const [lastEvent, setLastEvent] = useState(null);
  const listeners = useRef({});

  const connect = useCallback(() => {
    ws.current = new WebSocket(url);
    ws.current.onopen = () => setConnected(true);
    ws.current.onclose = () => {
      setConnected(false);
      setTimeout(connect, 3000);
    };
    ws.current.onerror = () => ws.current.close();
    ws.current.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        setLastEvent(msg);
        const tradeTypes = ['trade_opened', 'trade_closed', 'stop_loss_triggered', 'trade_error'];
        if (tradeTypes.includes(msg.type)) {
          setFeed(prev => [{ ...msg, id: msg.ts }, ...prev].slice(0, 100));
        }
        if (listeners.current[msg.type]) listeners.current[msg.type](msg.data);
      } catch {}
    };
  }, [url]);

  useEffect(() => {
    connect();
    return () => ws.current?.close();
  }, [connect]);

  const on = useCallback((type, handler) => {
    listeners.current[type] = handler;
    return () => delete listeners.current[type];
  }, []);

  return { connected, feed, lastEvent, on };
}
