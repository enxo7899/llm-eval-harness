import { runCandidate } from "./run.js";

/**
 * Run a candidate N times with seeded sampling noise and find the cases whose
 * answer is not stable. A deterministic candidate shows no unstable cases;
 * a sampled model does, and those cases are the ones to fix or to widen the
 * gate around, because a single run of them is a coin flip.
 * @param {{run:Function, id?:string}} candidate
 * @param {import("./testset.js").TestCase[]} cases
 * @param {{runs?:number, temperature?:number, seed?:number}} [opts]
 */
export async function measureFlakiness(candidate, cases, { runs = 10, temperature = 0.8, seed = 1 } = {}) {
  const perRun = [];
  for (let r = 0; r < runs; r++) perRun.push(await runCandidate(candidate, cases, { temperature, seed: seed + r * 7919 }));
  const accuracyPerRun = perRun.map((out) => out.filter((o, i) => o.intent === cases[i].intent).length / cases.length);
  const perCase = cases.map((c, i) => {
    const counts = {};
    for (const out of perRun) counts[out[i].intent] = (counts[out[i].intent] ?? 0) + 1;
    const [modal, modalN] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    return { id: c.id, gold: c.intent, modal, agreement: modalN / runs, counts, unstable: Object.keys(counts).length > 1, correctRuns: counts[c.intent] ?? 0 };
  });
  const mean = accuracyPerRun.reduce((a, b) => a + b, 0) / runs;
  const sd = Math.sqrt(accuracyPerRun.reduce((s, x) => s + (x - mean) ** 2, 0) / (runs - 1));
  return {
    runs,
    temperature,
    accuracyPerRun,
    accuracyMean: mean,
    accuracySd: sd,
    unstableCount: perCase.filter((c) => c.unstable).length,
    meanAgreement: perCase.reduce((s, c) => s + c.agreement, 0) / cases.length,
    alwaysRight: perCase.filter((c) => c.correctRuns === runs).length,
    sometimesRight: perCase.filter((c) => c.correctRuns > 0 && c.correctRuns < runs).length,
    perCase,
  };
}
