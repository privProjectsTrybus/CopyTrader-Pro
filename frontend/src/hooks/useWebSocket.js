import { useEffect, useRef, useState, useCallback } from 'react';

export function useWebSocket() {
  const [connected, setConnected] = useState(false);
  const [feed, setFeed] = useState([]);
  const lastTs = useRef(Date.now());
  const listeners = useRef({});

  const handleEvent = useCallback((msg) => {
    const tradeTypes = ['trade_opened','trade_closed','stop_loss_triggered','trade_error','trader_added'];
    if (tradeTypes.includes(msg.type)) {
      setFeed(prev => [{ ...msg, id: msg.ts }, ...prev].slice(0, 100));
    }
    if (listeners.current[msg.type]) listeners.current[msg.type](msg.data);
  }, []);

  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch(`/api/bot?action=events&since=${lastTs.current}`);
        if (!res.ok) throw new Error('poll failed');
        const { events, ts } = await res.json();
        if (ts) lastTs.current = ts;
        (events || []).forEach(handleEvent);
        setConnected(true);
      } catch { setConnected(false); }
    };
    poll();
    const t = setInterval(poll, 4000);
    return () => clearInterval(t);
  }, [handleEvent]);

  const on = useCallback((type, handler) => {
    listeners.current[type] = handler;
    return () => delete listeners.current[type];
  }, []);

  return { connected, feed, on };
}
