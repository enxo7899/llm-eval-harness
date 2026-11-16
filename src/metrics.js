/** Pure metric functions over parallel arrays. */

/** @param {string[]} gold @param {string[]} pred */
export function accuracy(gold, pred) {
  if (!gold.length) return 0;
  let ok = 0;
  for (let i = 0; i < gold.length; i++) if (gold[i] === pred[i]) ok++;
  return ok / gold.length;
}

/**
 * Confusion matrix as nested counts: matrix[gold][predicted].
 * @param {string[]} labels
 * @param {string[]} gold
 * @param {string[]} pred
 */
export function confusionMatrix(labels, gold, pred) {
  const m = Object.fromEntries(labels.map((g) => [g, Object.fromEntries(labels.map((p) => [p, 0]))]));
  for (let i = 0; i < gold.length; i++) m[gold[i]][pred[i]]++;
  return m;
}

/**
 * Precision, recall, F1 and support per class, from a confusion matrix.
 * Classes with no support and no predictions score 0 and are still averaged,
 * which is the usual "macro" convention.
 */
export function perClass(labels, matrix) {
  return labels.map((l) => {
    const tp = matrix[l][l];
    const fn = labels.reduce((s, p) => s + (p === l ? 0 : matrix[l][p]), 0);
    const fp = labels.reduce((s, g) => s + (g === l ? 0 : matrix[g][l]), 0);
    const precision = tp + fp ? tp / (tp + fp) : 0;
    const recall = tp + fn ? tp / (tp + fn) : 0;
    const f1 = precision + recall ? (2 * precision * recall) / (precision + recall) : 0;
    return { label: l, precision, recall, f1, support: tp + fn };
  });
}

/** Macro-averaged F1 over the labels that appear in the gold set. */
export function macroF1(labels, gold, pred) {
  const present = labels.filter((l) => gold.includes(l));
  if (!present.length) return 0;
  const rows = perClass(labels, confusionMatrix(labels, gold, pred));
  return rows.filter((r) => present.includes(r.label)).reduce((s, r) => s + r.f1, 0) / present.length;
}

/**
 * Per-slice accuracy. `sliceKeysPerCase[i]` lists the slices case i belongs to.
 * @param {string[][]} sliceKeysPerCase
 * @param {boolean[]} correct
 * @returns {Record<string, {n:number, correct:number, accuracy:number}>}
 */
export function sliceBreakdown(sliceKeysPerCase, correct) {
  const out = {};
  sliceKeysPerCase.forEach((keys, i) => {
    for (const k of keys) {
      const s = (out[k] ??= { n: 0, correct: 0, accuracy: 0 });
      s.n++;
      if (correct[i]) s.correct++;
    }
  });
  for (const s of Object.values(out)) s.accuracy = s.correct / s.n;
  return out;
}

/**
 * Calibration of a confidence score: equal-width bins, expected calibration
 * error (ECE) and Brier score.
 * @param {number[]} confidence values in [0, 1]
 * @param {boolean[]} correct
 * @param {number} [bins]
 */
export function calibration(confidence, correct, bins = 5) {
  const rows = Array.from({ length: bins }, (_, b) => ({ lo: b / bins, hi: (b + 1) / bins, n: 0, meanConfidence: 0, accuracy: 0 }));
  let brier = 0;
  confidence.forEach((c, i) => {
    const b = Math.min(bins - 1, Math.floor(c * bins));
    rows[b].n++;
    rows[b].meanConfidence += c;
    rows[b].accuracy += correct[i] ? 1 : 0;
    brier += (c - (correct[i] ? 1 : 0)) ** 2;
  });
  const n = confidence.length || 1;
  let ece = 0;
  for (const r of rows) {
    if (r.n) {
      r.meanConfidence /= r.n;
      r.accuracy /= r.n;
      ece += (r.n / n) * Math.abs(r.meanConfidence - r.accuracy);
    }
  }
  return { bins: rows, ece, brier: brier / n };
}
