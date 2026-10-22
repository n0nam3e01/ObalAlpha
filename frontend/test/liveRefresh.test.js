import { test } from 'node:test';
import assert from 'node:assert/strict';
import { startLiveRefresh } from '../src/lib/liveRefresh.js';

function environment() {
  const win = new EventTarget();
  const doc = new EventTarget();
  doc.visibilityState = 'visible';
  const timers = new Map();
  let id = 0;
  return { win, doc, timers, options: {
    windowTarget: win, documentTarget: doc,
    setTimer: (fn, ms) => { timers.set(++id, { fn, ms }); return id; },
    clearTimer: (key) => timers.delete(key),
  } };
}
const tick = () => new Promise((resolve) => setImmediate(resolve));

test('live refresh serializes focus/online requests, pauses hidden tabs and aborts on stop', async () => {
  const env = environment();
  let finish;
  let signal;
  let calls = 0;
  let successes = 0;
  const controller = startLiveRefresh((s) => {
    signal = s; calls++;
    return new Promise((resolve) => { finish = resolve; });
  }, { ...env.options, onSuccess: () => successes++ });
  await tick();
  assert.equal(calls, 1);
  env.win.dispatchEvent(new Event('focus'));
  env.win.dispatchEvent(new Event('online'));
  assert.equal(calls, 1);
  finish(); await tick();
  assert.equal(successes, 1);
  const timer = [...env.timers.values()][0];
  assert.equal(timer.ms, 20000);
  env.doc.visibilityState = 'hidden';
  await timer.fn();
  assert.equal(calls, 1);
  env.doc.visibilityState = 'visible';
  env.doc.dispatchEvent(new Event('visibilitychange')); await tick();
  assert.equal(calls, 2);
  controller.stop();
  assert.equal(signal.aborted, true);
  assert.equal(env.timers.size, 0);
  finish(); await tick();
  assert.equal(successes, 1);
  env.win.dispatchEvent(new Event('focus'));
  assert.equal(calls, 2);
});

test('failed synchronization reports an error and retries successfully', async () => {
  const env = environment();
  let calls = 0;
  let errors = 0;
  let successes = 0;
  const controller = startLiveRefresh(async () => {
    if (++calls === 1) throw new Error('offline');
  }, { ...env.options, onError: () => errors++, onSuccess: () => successes++ });
  await tick();
  assert.equal(errors, 1);
  assert.equal(successes, 0);
  await controller.refresh();
  assert.equal(successes, 1);
  controller.stop();
});

test('refresh after a mutation waits for an older request, then fetches a fresh snapshot', async () => {
  const env = environment();
  const finishers = [];
  const controller = startLiveRefresh(() => new Promise((resolve) => finishers.push(resolve)), env.options);
  await tick();
  const fresh = controller.refresh({ fresh: true });
  finishers[0](); await tick();
  assert.equal(finishers.length, 2);
  finishers[1]();
  assert.equal(await fresh, true);
  controller.stop();
});
