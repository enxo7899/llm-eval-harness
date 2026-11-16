import { runCandidate } from "./run.js";
import { scoreRun, summarize, compare, select } from "./evaluate.js";
import { decide } from "./gate.js";
import { shuffled } from "./rng.js";

/**
 * Run every candidate once over the cases and score it.
 * @param {Record<string, {run:Function, id?:string}>} candidates
 * @param {import("./testset.js").TestCase[]} cases
 * @param {{lenient?:boolean}} [opts]
 */
export async function scoreAll(candidates, cases, opts = {}) {
  const out = {};
  const outputs = {};
  for (const [id, cand] of Object.entries(candidates)) {
    outputs[id] = await runCandidate(cand, cases);
    out[id] = scoreRun(cases, outputs[id], opts);
  }
  return { scored: out, outputs };
}

/**
 * Full report for one base/candidate pair, optionally on a subset of cases.
 * @param {ReturnType<typeof scoreAll> extends Promise<infer T> ? T["scored"] : never} scored
 * @param {string} baseId
 * @param {string} candId
 * @param {ReturnType<import("./config.js").parseConfig>} config
 * @param {number[]} [indices] keep only these cases
 */
export function reportPair(scored, baseId, candId, config, indices) {
  const b = indices ? select(scored[baseId], indices) : scored[baseId];
  const c = indices ? select(scored[candId], indices) : scored[candId];
  const o = { seed: config.seed, iterations: config.bootstrapIterations };
  const base = summarize(b, o);
  const candidate = summarize(c, o);
  const comparison = compare(b, c, o);
  return { base, candidate, comparison, gate: decide({ base, candidate, comparison }, config.gate) };
}

/**
 * Indices of the first `keep` cases of a seeded shuffle. Used to remove test
 * cases in a fixed, reproducible order.
 * @param {number} total
 * @param {number} keep
 * @param {number} seed
 */
export function subsetIndices(total, keep, seed) {
  return shuffled(Array.from({ length: total }, (_, i) => i), seed).slice(0, Math.max(0, Math.min(total, keep))).sort((a, b) => a - b);
}
