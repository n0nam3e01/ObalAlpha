import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { startLiveRefresh } from './liveRefresh';

export function useLiveRefresh(load, enabled) {
  const latest = useRef(load);
  const runner = useRef(null);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(enabled);
  useLayoutEffect(() => { latest.current = load; });
  useEffect(() => {
    setUpdatedAt(null); setError(null); setLoading(enabled);
    if (!enabled) return;
    const instance = startLiveRefresh((signal) => latest.current(signal), {
      onSuccess: (date) => { setUpdatedAt(date); setError(null); setLoading(false); },
      onError: (err) => { setError(err); setLoading(false); },
    });
    runner.current = instance;
    return () => { instance.stop(); runner.current = null; };
  }, [enabled]);
  const refresh = useCallback((options) => runner.current?.refresh(options) ?? Promise.resolve(false), []);
  return { refresh, updatedAt, error, loading };
}
