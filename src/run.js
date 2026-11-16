import { INTENTS, URGENCIES } from "./labels.js";
import { CandidateError } from "./errors.js";
import { mulberry32 } from "./rng.js";

/**
 * @typedef {Object} Output
 * @property {string} intent
 * @property {string} urgency
 * @property {number} confidence  confidence in the urgency call, 0 to 1
 * @property {string} reply
 */

/** @param {unknown} o @param {string} id */
export function validateOutput(o, id) {
  if (!o || !INTENTS.includes(o.intent)) throw new CandidateError(`${id}: invalid intent "${o?.intent}"`);
  if (!URGENCIES.includes(o.urgency)) throw new CandidateError(`${id}: invalid urgency "${o.urgency}"`);
  if (typeof o.confidence !== "number" || o.confidence < 0 || o.confidence > 1) throw new CandidateError(`${id}: confidence must be in [0, 1]`);
  if (typeof o.reply !== "string" || !o.reply.trim()) throw new CandidateError(`${id}: empty reply`);
  return o;
}

/**
 * Run a candidate over test cases. The candidate only ever sees the message
 * text, never the gold labels. A candidate may be sync (the stand-ins) or
 * async (an HTTP adapter).
 * @param {{run:(input:string, ctx?:object) => Output|Promise<Output>}} candidate
 * @param {import("./testset.js").TestCase[]} cases
 * @param {{temperature?:number, seed?:number}} [opts]
 * @returns {Promise<Output[]>}
 */
export async function runCandidate(candidate, cases, { temperature = 0, seed = 1 } = {}) {
  const rng = mulberry32(seed);
  const out = [];
  for (const c of cases) out.push(validateOutput(await candidate.run(c.text, { temperature, rng }), candidate.id ?? "candidate"));
  return out;
}
