import { useEffect, useRef, useState, useCallback } from 'react';

export function useWebSocket(token) {
  const [connected, setConnected] = useState(false);
  const [feed, setFeed] = useState([]);
  const lastTs = useRef(Date.now());

  const handleEvent = useCallback((msg) => {
    const types = ['trade_opened','trade_closed','trade_error','bot_created','bot_stopped'];
    if (types.includes(msg.type)) setFeed(p => [{ ...msg, id: msg.ts }, ...p].slice(0, 100));
  }, []);

  useEffect(() => {
    if (!token) return;
    const poll = async () => {
      try {
        const r = await fetch(`/api/bot?action=events&since=${lastTs.current}`, { headers: { Authorization:`Bearer ${token}` } });
        if (!r.ok) throw new Error();
        const { events, ts } = await r.json();
        if (ts) lastTs.current = ts;
        (events || []).forEach(handleEvent);
        setConnected(true);
      } catch { setConnected(false); }
    };
    poll();
    const t = setInterval(poll, 5000);
    return () => clearInterval(t);
  }, [token, handleEvent]);

  return { connected, feed };
}
