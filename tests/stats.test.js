import { test } from "node:test";
import assert from "node:assert/strict";
import { bootstrapCI, meanOf, mcnemarExact, minDetectableDifference, binomialCdfHalf } from "../src/stats.js";
import { mulberry32 } from "../src/rng.js";

const bits = (n, p, seed) => {
  const r = mulberry32(seed);
  return Array.from({ length: n }, () => (r() < p ? 1 : 0));
};

test("bootstrap intervals are reproducible with the same seed", () => {
  const v = bits(80, 0.7, 5);
  const a = bootstrapCI(80, meanOf(v), { seed: 42, iterations: 500 });
  const b = bootstrapCI(80, meanOf(v), { seed: 42, iterations: 500 });
  assert.deepEqual(a, b);
});

test("a different seed gives a slightly different interval", () => {
  const v = bits(80, 0.7, 5);
  const a = bootstrapCI(80, meanOf(v), { seed: 1, iterations: 500 });
  const b = bootstrapCI(80, meanOf(v), { seed: 2, iterations: 500 });
  assert.notDeepEqual([a.lo, a.hi], [b.lo, b.hi]);
});

test("the interval always brackets the point estimate (30 random data sets)", () => {
  for (let s = 1; s <= 30; s++) {
    const n = 20 + s * 3;
    const ci = bootstrapCI(n, meanOf(bits(n, 0.3 + (s % 5) / 10, s)), { seed: s, iterations: 300 });
    assert.ok(ci.lo <= ci.estimate && ci.estimate <= ci.hi, `seed ${s}: ${ci.lo} ${ci.estimate} ${ci.hi}`);
  }
});

test("the interval narrows as the test set grows", () => {
  const width = (n) => {
    const ci = bootstrapCI(n, meanOf(bits(n, 0.8, 9)), { seed: 3, iterations: 800 });
    return ci.hi - ci.lo;
  };
  assert.ok(width(400) < width(100) && width(100) < width(25));
});

test("McNemar ignores cases both versions got right or both got wrong", () => {
  const base = [true, false, true, false, true, true];
  const cand = [true, false, false, true, true, true];
  const m = mcnemarExact(base, cand);
  assert.equal(m.discordant, 2);
  const padded = mcnemarExact([...base, ...Array(500).fill(true), ...Array(500).fill(false)], [...cand, ...Array(500).fill(true), ...Array(500).fill(false)]);
  assert.equal(padded.p, m.p);
});

test("McNemar exact p-value matches the hand calculation", () => {
  assert.ok(Math.abs(mcnemarExact(Array(5).fill(false), Array(5).fill(true)).p - 0.0625) < 1e-12);
  assert.equal(mcnemarExact([true, false], [false, true]).p, 1);
  assert.equal(mcnemarExact([true, true], [true, true]).p, 1);
  assert.ok(Math.abs(binomialCdfHalf(2, 10) - 56 / 1024) < 1e-12);
});

test("McNemar p-values stay inside [0, 1] and are symmetric (200 random pairs)", () => {
  const r = mulberry32(11);
  for (let i = 0; i < 200; i++) {
    const n = 5 + Math.floor(r() * 150);
    const a = Array.from({ length: n }, () => r() < 0.6);
    const b = Array.from({ length: n }, () => r() < 0.6);
    const p = mcnemarExact(a, b).p;
    assert.ok(p >= 0 && p <= 1);
    assert.ok(Math.abs(p - mcnemarExact(b, a).p) < 1e-12);
  }
});

test("the minimum detectable difference shrinks as the set grows", () => {
  assert.ok(minDetectableDifference(400) < minDetectableDifference(100));
  assert.ok(minDetectableDifference(100) < minDetectableDifference(25));
  assert.ok(Math.abs(minDetectableDifference(100, 0.16) - 0.112) < 1e-9);
});
