// One in-flight request per mounted screen; no polling while it is hidden.
export function startLiveRefresh(load, {
  onSuccess = () => {}, onError = () => {}, intervalMs = 20000,
  windowTarget = window, documentTarget = document,
  setTimer = setTimeout, clearTimer = clearTimeout,
} = {}) {
  let stopped = false;
  let pending = null;
  let controller = null;
  let timer;
  const schedule = () => {
    clearTimer(timer);
    if (!stopped) timer = setTimer(refresh, intervalMs);
  };
  function refresh({ fresh = false } = {}) {
    if (stopped) return Promise.resolve(false);
    // Mutations need a read that starts AFTER the write, not the older poll.
    if (pending) return fresh ? pending.then(() => refresh()) : pending;
    clearTimer(timer);
    if (documentTarget.visibilityState === 'hidden') {
      schedule();
      return Promise.resolve(false);
    }
    controller = new AbortController();
    const signal = controller.signal;
    pending = Promise.resolve().then(() => load(signal)).then(() => {
      if (!signal.aborted) { onSuccess(new Date()); return true; }
      return false;
    }).catch((error) => {
      if (!signal.aborted) onError(error);
      return false;
    }).finally(() => { pending = null; schedule(); });
    return pending;
  }
  const visible = () => {
    if (documentTarget.visibilityState !== 'hidden') void refresh();
  };
  windowTarget.addEventListener('focus', visible);
  windowTarget.addEventListener('online', visible);
  documentTarget.addEventListener('visibilitychange', visible);
  void refresh();
  return {
    refresh,
    stop() {
      stopped = true; clearTimer(timer); controller?.abort();
      windowTarget.removeEventListener('focus', visible);
      windowTarget.removeEventListener('online', visible);
      documentTarget.removeEventListener('visibilitychange', visible);
    },
  };
}
