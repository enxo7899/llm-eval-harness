import { test } from "node:test";
import assert from "node:assert/strict";
import { parseTestSet, sliceKeys } from "../src/testset.js";
import { detectLang } from "../src/lang.js";
import { INTENTS } from "../src/labels.js";
import { runCandidate } from "../src/run.js";
import { subsetIndices } from "../src/pipeline.js";
import { candidates } from "../candidates/index.js";
import { data } from "./helpers.js";

test("the test set has at least 150 cases, 30 per language, and every intent", () => {
  assert.ok(data.cases.length >= 150);
  for (const lang of ["en", "it", "al"]) assert.ok(data.cases.filter((c) => c.lang === lang).length >= 30, lang);
  for (const i of INTENTS) assert.ok(data.cases.some((c) => c.intent === i), i);
  assert.ok(data.cases.filter((c) => c.tags.includes("adversarial")).length >= 20);
  assert.ok(data.cases.filter((c) => c.tags.includes("typo")).length >= 20);
});

test("a duplicate id or an unknown label stops the run with a clear error", () => {
  const row = (o) => JSON.stringify({ id: "a", text: "hi", intent: "fees", urgency: "low", lang: "en", channel: "app", tags: [], ...o });
  assert.throws(() => parseTestSet(`${row({})}\n${row({})}`), /duplicate id a/);
  assert.throws(() => parseTestSet(row({ intent: "refund" })), /unknown intent/);
  assert.throws(() => parseTestSet("{nope"), /not valid JSON/);
});

test("slice keys combine language, channel and tags", () => {
  assert.deepEqual(sliceKeys({ lang: "al", channel: "chat", tags: ["typo"] }), ["lang:al", "channel:chat", "typo"]);
});

test("candidates only ever see the message text, never the gold labels", async () => {
  const seen = [];
  const spy = { id: "spy", run: (input) => (seen.push(input), candidates.v2.run(input)) };
  await runCandidate(spy, data.cases.slice(0, 5));
  assert.ok(seen.every((s) => typeof s === "string"));
});

test("a candidate that returns an invalid label is rejected", async () => {
  const bad = { id: "bad", run: () => ({ intent: "refund", urgency: "low", confidence: 0.5, reply: "x" }) };
  await assert.rejects(runCandidate(bad, data.cases.slice(0, 1)), /invalid intent/);
});

test("language detection agrees with the labelled language on at least 90% of cases", () => {
  const ok = data.cases.filter((c) => detectLang(c.text) === c.lang).length;
  assert.ok(ok / data.cases.length >= 0.9, `${ok}/${data.cases.length}`);
});

test("removing cases happens in a fixed seeded order", () => {
  const a = subsetIndices(100, 30, 7);
  assert.deepEqual(a, subsetIndices(100, 30, 7));
  assert.equal(new Set(a).size, 30);
  assert.notDeepEqual(a, subsetIndices(100, 30, 8));
});

test("the stand-in candidates are deterministic and v3 trades one slice for overall accuracy", async () => {
  const { shared } = await import("./helpers.js");
  const { scored } = await shared();
  const again = await runCandidate(candidates.v3, data.cases);
  assert.deepEqual(again, (await shared()).outputs.v3);
  const acc = (id, f) => {
    const idx = data.cases.map((c, i) => (f(c) ? i : -1)).filter((i) => i >= 0);
    return idx.filter((i) => scored[id].intentOk[i]).length / idx.length;
  };
  assert.ok(acc("v3", () => true) > acc("v2", () => true));
  assert.ok(acc("v3", (c) => c.lang === "al") < acc("v2", (c) => c.lang === "al"));
  assert.ok(acc("v2", () => true) > acc("v1", () => true));
});
