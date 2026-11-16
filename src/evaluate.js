import { INTENTS } from "./labels.js";
import { sliceLabel } from "./labels.js";
import { sliceKeys } from "./testset.js";
import { accuracy, confusionMatrix, perClass, macroF1, sliceBreakdown, calibration } from "./metrics.js";
import { bootstrapCI, meanOf, mcnemarExact, minDetectableDifference } from "./stats.js";
import { judgeReply } from "./judge.js";

/**
 * @typedef {Object} Scored
 * @property {import("./testset.js").TestCase[]} cases
 * @property {import("./run.js").Output[]} outputs
 * @property {boolean[]} intentOk
 * @property {boolean[]} urgencyOk
 * @property {import("./judge.js").JudgeResult[]} judge
 */

/**
 * Compare outputs with gold labels and judge every reply.
 * @param {import("./testset.js").TestCase[]} cases
 * @param {import("./run.js").Output[]} outputs
 * @param {{lenient?:boolean}} [opts]
 * @returns {Scored}
 */
export function scoreRun(cases, outputs, { lenient = false } = {}) {
  return {
    cases,
    outputs,
    intentOk: cases.map((c, i) => outputs[i].intent === c.intent),
    urgencyOk: cases.map((c, i) => outputs[i].urgency === c.urgency),
    judge: cases.map((c, i) => judgeReply(outputs[i].reply, c, { lenient })),
  };
}

/** Keep only the cases at the given indices (used by the "remove test cases" control). */
export function select(scored, indices) {
  const pick = (a) => indices.map((i) => a[i]);
  return { cases: pick(scored.cases), outputs: pick(scored.outputs), intentOk: pick(scored.intentOk), urgencyOk: pick(scored.urgencyOk), judge: pick(scored.judge) };
}

const ci = (n, values, o) => bootstrapCI(n, meanOf(values.map(Number)), o);

/**
 * Headline numbers for one version, with seeded bootstrap intervals.
 * @param {Scored} s
 * @param {{seed?:number, iterations?:number}} [o]
 */
export function summarize(s, o = {}) {
  const n = s.cases.length;
  const gold = s.cases.map((c) => c.intent);
  const pred = s.outputs.map((x) => x.intent);
  const matrix = confusionMatrix(INTENTS, gold, pred);
  const slices = sliceBreakdown(s.cases.map(sliceKeys), s.intentOk);
  return {
    n,
    intentAccuracy: ci(n, s.intentOk, o),
    macroF1: bootstrapCI(n, (idx) => macroF1(INTENTS, idx.map((i) => gold[i]), idx.map((i) => pred[i])), o),
    urgencyAccuracy: ci(n, s.urgencyOk, o),
    judgePassRate: ci(n, s.judge.map((j) => j.pass), o),
    calibration: calibration(s.outputs.map((x) => x.confidence), s.urgencyOk),
    confusion: matrix,
    perClass: perClass(INTENTS, matrix),
    slices: Object.fromEntries(Object.entries(slices).map(([k, v]) => [k, { ...v, label: sliceLabel(k) }])),
  };
}

/**
 * Paired comparison of two versions on the same cases.
 * @param {Scored} base
 * @param {Scored} cand
 * @param {{seed?:number, iterations?:number}} [o]
 */
export function compare(base, cand, o = {}) {
  const n = base.cases.length;
  const diff = base.intentOk.map((b, i) => Number(cand.intentOk[i]) - Number(b));
  const mc = mcnemarExact(base.intentOk, cand.intentOk);
  const bs = sliceBreakdown(base.cases.map(sliceKeys), base.intentOk);
  const cs = sliceBreakdown(cand.cases.map(sliceKeys), cand.intentOk);
  const keys = Object.keys(bs);
  const sliceDeltas = keys.map((k) => {
    const idx = base.cases.map((c, i) => (sliceKeys(c).includes(k) ? i : -1)).filter((i) => i >= 0);
    const m = mcnemarExact(idx.map((i) => base.intentOk[i]), idx.map((i) => cand.intentOk[i]));
    return { key: k, label: sliceLabel(k), n: bs[k].n, base: bs[k].accuracy, candidate: cs[k].accuracy, delta: cs[k].accuracy - bs[k].accuracy, p: m.p, onlyBase: m.onlyBase, onlyCandidate: m.onlyCandidate };
  });
  const rate = n ? mc.discordant / n : 0;
  return {
    n,
    delta: bootstrapCI(n, meanOf(diff), o),
    mcnemar: mc,
    minDetectableDifference: minDetectableDifference(n, Math.max(rate, 0.05)),
    sliceDeltas,
    judgePassDelta: cand.judge.filter((j) => j.pass).length / n - base.judge.filter((j) => j.pass).length / n,
  };
}
