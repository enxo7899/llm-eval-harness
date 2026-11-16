const pts = (x) => (x * 100).toFixed(1);
const signed = (x) => `${x >= 0 ? "+" : "-"}${Math.abs(x * 100).toFixed(1)}`;

/**
 * @typedef {Object} Rule
 * @property {string} id
 * @property {"pass"|"fail"|"skip"} status
 * @property {string} message  full sentence for the report
 * @property {string} [short]  headline fragment for a failure
 */

/**
 * Regression gate. Decides "ship", "blocked" or "undecided" for a candidate
 * against a base version. The gate refuses to pass on a test set that is too
 * small: no verdict is better than a verdict the data cannot support.
 * @param {{base: ReturnType<import("./evaluate.js").summarize>, candidate: ReturnType<import("./evaluate.js").summarize>, comparison: ReturnType<import("./evaluate.js").compare>}} r
 * @param {ReturnType<import("./config.js").parseConfig>["gate"]} g
 * @returns {{decision:"ship"|"blocked"|"undecided", headline:string, rules:Rule[]}}
 */
export function decide({ base, candidate, comparison }, g) {
  const n = comparison.n;
  /** @type {Rule[]} */
  const rules = [];
  if (n < g.minTestSize) {
    rules.push({
      id: "min-size",
      status: "fail",
      message: `Only ${n} cases; the minimum is ${g.minTestSize}. A set this size cannot detect a difference smaller than about ${pts(comparison.minDetectableDifference)} points, so no verdict is given.`,
      short: `only ${n} cases, minimum ${g.minTestSize}`,
    });
    for (const id of ["slices", "adversarial", "overall", "judge", "calibration"]) rules.push({ id, status: "skip", message: "Not evaluated: test set too small." });
    return { decision: "undecided", headline: `Cannot decide: only ${n} cases, minimum ${g.minTestSize}`, rules };
  }
  rules.push({ id: "min-size", status: "pass", message: `${n} cases (minimum ${g.minTestSize}). Smallest detectable difference about ${pts(comparison.minDetectableDifference)} points.` });

  const checked = comparison.sliceDeltas.filter((s) => s.n >= g.minSliceSize);
  const drops = checked
    .filter((s) => -s.delta * 100 > g.maxSliceDropPoints && (!g.requireSliceSignificance || s.p < g.alpha))
    .sort((a, b) => a.delta - b.delta);
  for (const s of drops) {
    rules.push({
      id: `slice:${s.key}`,
      status: "fail",
      message: `${s.label} slice ${signed(s.delta)} pts (limit ${g.maxSliceDropPoints.toFixed(1)}; ${pts(s.base)}% to ${pts(s.candidate)}%, n=${s.n}, ${s.onlyBase} cases lost, ${s.onlyCandidate} won, exact p=${s.p.toFixed(3)}).`,
      short: `${s.label} slice ${signed(s.delta)} pts`,
    });
  }
  if (!drops.length) rules.push({ id: "slices", status: "pass", message: `No slice with ${g.minSliceSize}+ cases dropped more than ${g.maxSliceDropPoints.toFixed(1)} points (${checked.length} slices checked).` });

  const adv = candidate.slices.adversarial;
  if (adv && adv.n >= 1) {
    const ok = adv.accuracy >= g.minAdversarialAccuracy;
    rules.push({ id: "adversarial", status: ok ? "pass" : "fail", message: `Adversarial accuracy ${pts(adv.accuracy)}% (floor ${pts(g.minAdversarialAccuracy)}%, n=${adv.n}).`, short: `adversarial ${pts(adv.accuracy)}% under floor` });
  } else rules.push({ id: "adversarial", status: "skip", message: "No adversarial cases in this set." });

  const d = comparison.delta.estimate;
  const mc = comparison.mcnemar;
  const worseSig = mc.p < g.alpha && mc.onlyBase > mc.onlyCandidate;
  const bigDrop = -d * 100 > g.maxOverallDropPoints;
  rules.push({
    id: "overall",
    status: worseSig || bigDrop ? "fail" : "pass",
    message: `Overall accuracy ${signed(d)} pts (95% CI ${signed(comparison.delta.lo)} to ${signed(comparison.delta.hi)}), McNemar exact p=${mc.p.toFixed(3)}.`,
    short: `overall ${signed(d)} pts`,
  });

  const jp = candidate.judgePassRate.estimate;
  rules.push({ id: "judge", status: jp >= g.minJudgePassRate ? "pass" : "fail", message: `Reply judge pass rate ${pts(jp)}% (floor ${pts(g.minJudgePassRate)}%).`, short: `judge pass ${pts(jp)}%` });
  const ece = candidate.calibration.ece;
  rules.push({ id: "calibration", status: ece <= g.maxUrgencyEce ? "pass" : "fail", message: `Urgency calibration error ${ece.toFixed(3)} (ceiling ${g.maxUrgencyEce.toFixed(2)}).`, short: `urgency ECE ${ece.toFixed(2)}` });

  const fails = rules.filter((r) => r.status === "fail");
  if (!fails.length) return { decision: "ship", headline: "Ship", rules };
  const more = fails.length > 1 ? ` (+${fails.length - 1} more)` : "";
  return { decision: "blocked", headline: `Blocked: ${fails[0].short}${more}`, rules };
}
