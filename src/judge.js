import { fold, words } from "./text.js";
import { detectLang } from "./lang.js";
import { REQUIRED_FACTS, FORBIDDEN_PROMISES, FORBIDDEN_REQUESTS, BLAME, COURTESY, LENGTH } from "./rubric.js";

/** True when the pattern matches and is not negated ("please do not share your PIN" is advice, not a request). */
function asksFor(pattern, text) {
  for (const m of text.matchAll(new RegExp(pattern.source, "g"))) {
    if (!/\b(not|never|dont|non|mai|mos|nuk|kurre)\b/.test(text.slice(Math.max(0, m.index - 20), m.index))) return true;
  }
  return false;
}

/**
 * @typedef {Object} JudgeResult
 * @property {boolean} pass
 * @property {number} score        checks passed out of the checks that count (5 strict, 1 lenient)
 * @property {Record<string, boolean>} checks
 * @property {string[]} reasons    one line per failed check, or a single pass line
 */

/**
 * Rule-based rubric judge for a drafted reply. Deterministic and offline.
 * Strict mode runs five checks: required facts, forbidden promises, tone,
 * length and language match. Lenient mode is the "judge that went easy":
 * it only asks that the reply is a plausible length, like a judge prompt that
 * drifted to "does this sound reasonable?". It exists to show what an
 * unmeasured, drifting judge does to agreement with people.
 * @param {string} reply
 * @param {{intent:string, lang:string}} gold  gold intent and customer language
 * @param {{lenient?:boolean}} [opts]
 * @returns {JudgeResult}
 */
export function judgeReply(reply, gold, { lenient = false } = {}) {
  const text = fold(reply);
  const n = words(reply).length;
  const reasons = [];
  const checks = {};

  const facts = REQUIRED_FACTS[gold.intent] ?? [];
  const hit = facts.map((f) => ({ id: f.id, ok: f[gold.lang].test(text) }));
  const missing = hit.filter((h) => !h.ok).map((h) => h.id);
  checks.facts = missing.length === 0;
  if (!checks.facts && !lenient) reasons.push(`missing: ${missing.join("; ")}`);

  const promise = FORBIDDEN_PROMISES.find((p) => p.test(text));
  checks.promises = !promise;
  if (promise && !lenient) reasons.push(`forbidden promise ("${text.match(promise)[0]}")`);

  const toneProblems = [];
  if (/\b[A-Z]{4,}\b/.test(reply)) toneProblems.push("shouting in capitals");
  if ((reply.match(/!/g) ?? []).length > 1) toneProblems.push("more than one exclamation mark");
  if (BLAME.some((b) => b.test(text))) toneProblems.push("blames the customer");
  if (FORBIDDEN_REQUESTS.some((r) => asksFor(r, text))) toneProblems.push("asks for a secret");
  if (!COURTESY[gold.lang].test(text)) toneProblems.push("no courtesy marker");
  checks.tone = toneProblems.length === 0;
  if (toneProblems.length && !lenient) reasons.push(`tone: ${toneProblems.join(", ")}`);

  const min = lenient ? 5 : LENGTH.min;
  const max = lenient ? 200 : LENGTH.max;
  checks.length = n >= min && n <= max;
  if (!checks.length) reasons.push(`length ${n} words, want ${min} to ${max}`);

  const replyLang = detectLang(reply);
  checks.language = replyLang === gold.lang;
  if (!checks.language && !lenient) reasons.push(`language: replied in ${replyLang}, customer wrote ${gold.lang}`);

  const active = lenient ? ["length"] : Object.keys(checks);
  const passed = active.filter((k) => checks[k]).length;
  const pass = passed === active.length;
  if (pass) reasons.push(lenient ? "lenient: passed" : "all five checks passed");
  return { pass, score: passed, checks, reasons };
}
