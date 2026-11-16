/**
 * Agreement between the judge and human raters on a binary "acceptable" call.
 * @param {boolean[]} human
 * @param {boolean[]} judge
 * @returns {{n:number, agreement:number, kappa:number, table:{humanYesJudgeYes:number, humanYesJudgeNo:number, humanNoJudgeYes:number, humanNoJudgeNo:number}}}
 */
export function agreement(human, judge) {
  const t = { humanYesJudgeYes: 0, humanYesJudgeNo: 0, humanNoJudgeYes: 0, humanNoJudgeNo: 0 };
  human.forEach((h, i) => {
    if (h && judge[i]) t.humanYesJudgeYes++;
    else if (h) t.humanYesJudgeNo++;
    else if (judge[i]) t.humanNoJudgeYes++;
    else t.humanNoJudgeNo++;
  });
  return { n: human.length, agreement: human.length ? (t.humanYesJudgeYes + t.humanNoJudgeNo) / human.length : 0, kappa: cohensKappa(human, judge), table: t };
}

/**
 * Cohen's kappa for two raters on categorical labels: agreement beyond what
 * chance alone would produce. 1 is perfect, 0 is chance level, below 0 is
 * worse than chance. Returns 0 when chance agreement is already 1 (one rater
 * never varies and the other matches it), because kappa is undefined there.
 * @param {unknown[]} a
 * @param {unknown[]} b
 */
export function cohensKappa(a, b) {
  const n = a.length;
  if (!n) return 0;
  const labels = [...new Set([...a, ...b])];
  let po = 0;
  for (let i = 0; i < n; i++) if (a[i] === b[i]) po++;
  po /= n;
  let pe = 0;
  for (const l of labels) pe += (a.filter((x) => x === l).length / n) * (b.filter((x) => x === l).length / n);
  return pe === 1 ? 0 : (po - pe) / (1 - pe);
}
