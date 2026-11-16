import { mulberry32 } from "./rng.js";

/**
 * Percentile bootstrap confidence interval for any statistic of the case set.
 * `stat` receives an array of resampled case indices. Seeded, so the same
 * seed always gives the same interval.
 * @param {number} n number of cases
 * @param {(indices:number[]) => number} stat
 * @param {{seed?:number, iterations?:number, level?:number}} [opts]
 * @returns {{estimate:number, lo:number, hi:number, level:number}}
 */
export function bootstrapCI(n, stat, { seed = 1, iterations = 2000, level = 0.95 } = {}) {
  const identity = Array.from({ length: n }, (_, i) => i);
  const estimate = stat(identity);
  if (n < 2) return { estimate, lo: estimate, hi: estimate, level };
  const rng = mulberry32(seed);
  const draws = new Array(iterations);
  const idx = new Array(n);
  for (let it = 0; it < iterations; it++) {
    for (let i = 0; i < n; i++) idx[i] = Math.floor(rng() * n);
    draws[it] = stat(idx);
  }
  draws.sort((a, b) => a - b);
  const a = (1 - level) / 2;
  return { estimate, lo: draws[Math.floor(a * iterations)], hi: draws[Math.min(iterations - 1, Math.ceil((1 - a) * iterations) - 1)], level };
}

/** Mean of a 0/1 (or numeric) array restricted to resampled indices. */
export const meanOf = (values) => (indices) => {
  let s = 0;
  for (const i of indices) s += values[i];
  return s / indices.length;
};

function logFactorials(n) {
  const f = [0];
  for (let i = 1; i <= n; i++) f[i] = f[i - 1] + Math.log(i);
  return f;
}

/**
 * P(X <= k) for X ~ Binomial(n, 0.5), computed in log space so it is exact
 * enough for any realistic n.
 */
export function binomialCdfHalf(k, n) {
  if (k < 0) return 0;
  if (k >= n) return 1;
  const lf = logFactorials(n);
  let p = 0;
  for (let i = 0; i <= k; i++) p += Math.exp(lf[n] - lf[i] - lf[n - i] - n * Math.LN2);
  return Math.min(1, p);
}

/**
 * McNemar's exact test for two versions scored on the same cases.
 * Only the discordant cases matter: b = base right and candidate wrong,
 * c = base wrong and candidate right. Cases both got right (or both wrong)
 * carry no information about which version is better and are ignored.
 * Two-sided p-value from the exact binomial.
 * @param {boolean[]} baseCorrect
 * @param {boolean[]} candCorrect
 */
export function mcnemarExact(baseCorrect, candCorrect) {
  let bothRight = 0, bothWrong = 0, b = 0, c = 0;
  for (let i = 0; i < baseCorrect.length; i++) {
    if (baseCorrect[i] && candCorrect[i]) bothRight++;
    else if (!baseCorrect[i] && !candCorrect[i]) bothWrong++;
    else if (baseCorrect[i]) b++;
    else c++;
  }
  const discordant = b + c;
  const p = discordant === 0 ? 1 : Math.min(1, 2 * binomialCdfHalf(Math.min(b, c), discordant));
  return { bothRight, bothWrong, onlyBase: b, onlyCandidate: c, discordant, p };
}

/**
 * Minimum detectable difference in accuracy for a paired comparison on n
 * cases (about 80% power at alpha 0.05): 2.8 * sqrt(d / n), where d is the
 * share of cases on which the two versions disagree. Anything smaller than
 * this is indistinguishable from noise on a test set of this size.
 * @param {number} n
 * @param {number} [discordantRate] share of cases where versions disagree
 * @param {number} [zSum] z(alpha/2) + z(power); 2.8 for 5% / 80%
 */
export function minDetectableDifference(n, discordantRate = 0.2, zSum = 2.8) {
  if (n <= 0) return 1;
  return Math.min(1, zSum * Math.sqrt(discordantRate / n));
}
