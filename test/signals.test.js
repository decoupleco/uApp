// Port of the session's engine tests (8 cases) to bun:test. Coverage note (paper §9): this is not a production suite.
import { test, expect } from 'bun:test';
import { state, derived, effect, settled } from '../src/p0/signals.js';

test('derived computes and recomputes', () => {
  const a = state(1); const d = derived(() => a.value * 2);
  expect(d.value).toBe(2); a.value = 5; expect(d.value).toBe(10);
});

test('effect runs once, reruns on change, not on same value', async () => {
  const a = state(1); let runs = 0, seen;
  effect(() => { runs++; seen = a.value }); await settled();
  expect(runs).toBe(1);
  a.value = 2; await settled(); expect(runs).toBe(2); expect(seen).toBe(2);
  a.value = 2; await settled(); expect(runs).toBe(2);
});

test('derived caches until a dependency changes', () => {
  const a = state(1); let computes = 0; const d = derived(() => { computes++; return a.value });
  d.value; d.value; expect(computes).toBe(1);
});

test('multiple writes coalesce into one effect run', async () => {
  const a = state(1), b = state(1); let runs = 0;
  effect(() => { runs++; a.value; b.value }); await settled(); runs = 0;
  a.value = 2; b.value = 2; await settled(); expect(runs).toBe(1);
});

test('diamond dependency: one run, no glitch value', async () => {
  const a = state(1); const b = derived(() => a.value + 1), c = derived(() => a.value + 1);
  let runs = 0; const seen = [];
  effect(() => { runs++; seen.push(b.value + c.value) }); await settled();
  runs = 0; seen.length = 0; a.value = 2; await settled();
  expect(runs).toBe(1); expect(seen).toEqual([6]);
});

test('deep: nested property set triggers', async () => {
  const o = state({ a: 1, b: [1, 2] }); let runs = 0, seen;
  effect(() => { runs++; seen = o.value.a }); await settled(); runs = 0;
  o.value.a = 9; await settled(); expect(runs).toBe(1); expect(seen).toBe(9);
});

test('deep: array push is observed through length', async () => {
  const o = state({ b: [1, 2] }); let runs = 0, len;
  effect(() => { runs++; len = o.value.b.length }); await settled(); runs = 0;
  o.value.b.push(3); await settled(); expect(runs).toBe(1); expect(len).toBe(3);
});

test('deep: new key + ownKeys; dispose stops the effect', async () => {
  const o = state({ x: 1 }); let runs = 0;
  effect(() => { runs++; Object.keys(o.value) }); await settled(); runs = 0;
  o.value.y = 2; await settled(); expect(runs).toBe(1);
  const a = state(1); let r2 = 0; const off = effect(() => { r2++; a.value }); await settled();
  off(); a.value = 9; await settled(); expect(r2).toBe(1);
});
