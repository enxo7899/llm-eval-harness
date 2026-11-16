import { INTENTS, URGENCIES, LANGS, CHANNELS } from "./labels.js";
import { TestSetError } from "./errors.js";

/**
 * @typedef {Object} TestCase
 * @property {string} id
 * @property {string} text      customer message
 * @property {string} intent    gold intent
 * @property {string} urgency   gold urgency
 * @property {string} lang      en | it | al
 * @property {string} channel   app | chat | email | phone
 * @property {string[]} tags    "typo" and/or "adversarial"
 */

/** Parse JSONL text into rows, skipping blank lines. */
export function parseJsonl(text) {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line, i) => {
      try {
        return JSON.parse(line);
      } catch {
        throw new TestSetError(`line ${i + 1} is not valid JSON`);
      }
    });
}

/**
 * Parse and validate the test set. Throws TestSetError on the first problem.
 * @param {string} text
 * @returns {TestCase[]}
 */
export function parseTestSet(text) {
  const rows = parseJsonl(text);
  const seen = new Set();
  for (const r of rows) {
    if (!r.id || typeof r.text !== "string" || !r.text.trim()) throw new TestSetError(`case ${r.id ?? "?"}: id and text are required`);
    if (seen.has(r.id)) throw new TestSetError(`duplicate id ${r.id}`);
    seen.add(r.id);
    if (!INTENTS.includes(r.intent)) throw new TestSetError(`${r.id}: unknown intent "${r.intent}"`);
    if (!URGENCIES.includes(r.urgency)) throw new TestSetError(`${r.id}: unknown urgency "${r.urgency}"`);
    if (!LANGS.includes(r.lang)) throw new TestSetError(`${r.id}: unknown language "${r.lang}"`);
    if (!CHANNELS.includes(r.channel)) throw new TestSetError(`${r.id}: unknown channel "${r.channel}"`);
    if (!Array.isArray(r.tags)) throw new TestSetError(`${r.id}: tags must be an array`);
  }
  return rows;
}

/**
 * Slice keys a case belongs to, e.g. ["lang:al", "channel:chat", "typo"].
 * @param {TestCase} c
 * @returns {string[]}
 */
export function sliceKeys(c) {
  return [`lang:${c.lang}`, `channel:${c.channel}`, ...c.tags];
}
