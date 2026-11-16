import { parseJsonl } from "./testset.js";
import { TestSetError } from "./errors.js";
import { judgeReply } from "./judge.js";
import { agreement } from "./agreement.js";

/**
 * @typedef {Object} Rating
 * @property {string} caseId
 * @property {string} version  which candidate wrote the reply
 * @property {string} reply    the exact text the person rated
 * @property {number} rating   1 to 5
 * @property {string} note
 */

/** Ratings of 4 or 5 count as "acceptable to send". */
export const ACCEPTABLE_FROM = 4;

/** @param {string} text @returns {Rating[]} */
export function parseRatings(text) {
  const rows = parseJsonl(text);
  for (const r of rows) {
    if (!r.caseId || !r.version || typeof r.reply !== "string") throw new TestSetError("each rating needs caseId, version and reply");
    if (!Number.isInteger(r.rating) || r.rating < 1 || r.rating > 5) throw new TestSetError(`${r.caseId}/${r.version}: rating must be 1 to 5`);
  }
  return rows;
}

/**
 * Compare the judge with the human ratings. Ratings whose reply text no
 * longer matches what the candidate now writes are "stale" and are left out,
 * because a person rated different words.
 * @param {Rating[]} ratings
 * @param {import("./testset.js").TestCase[]} cases
 * @param {(version:string, caseId:string) => string|undefined} currentReply
 * @param {{lenient?:boolean}} [opts]
 */
export function judgeVersusHuman(ratings, cases, currentReply, { lenient = false } = {}) {
  const byId = new Map(cases.map((c) => [c.id, c]));
  const rows = [];
  const stale = [];
  for (const r of ratings) {
    const c = byId.get(r.caseId);
    if (!c) continue;
    if (currentReply(r.version, r.caseId) !== r.reply) {
      stale.push(`${r.version}/${r.caseId}`);
      continue;
    }
    const j = judgeReply(r.reply, c, { lenient });
    rows.push({ ...r, human: r.rating >= ACCEPTABLE_FROM, judge: j.pass, reasons: j.reasons });
  }
  return { ...agreement(rows.map((x) => x.human), rows.map((x) => x.judge)), rows, stale };
}
