import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { candidates } from "../candidates/index.js";
import { scoreAll, reportPair } from "../src/pipeline.js";
import { draftReply } from "../candidates/replies.js";
import { scoreRun } from "../src/evaluate.js";
import { loadAll } from "../scripts/load.mjs";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const data = loadAll();
let cache;
/** Score the three candidates once per test process. */
export async function shared() {
  cache ??= await scoreAll(candidates, data.cases);
  return cache;
}
export const pair = async (b, c, indices) => reportPair((await shared()).scored, b, c, data.config, indices);
export const read = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");

/**
 * Build a scored run from per-language correct counts, all gold intent "fees"
 * (a wrong answer is "other"). Replies are fine, so only accuracy varies.
 * @param {Record<string, [number, number]>} spec lang -> [cases, correct]
 */
export function synthetic(spec) {
  const cases = [];
  const outputs = [];
  for (const [lang, [n, ok]] of Object.entries(spec)) {
    for (let i = 0; i < n; i++) {
      cases.push({ id: `${lang}-${i}`, text: "x", intent: "fees", urgency: "low", lang, channel: "app", tags: [] });
      outputs.push({ intent: i < ok ? "fees" : "other", urgency: "low", confidence: 1, reply: draftReply("careful", "fees", lang) });
    }
  }
  return scoreRun(cases, outputs);
}
