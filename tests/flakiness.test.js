import { test } from "node:test";
import assert from "node:assert/strict";
import { measureFlakiness } from "../src/flakiness.js";
import { candidates } from "../candidates/index.js";
import { createChatCandidate, parseCompletion } from "../adapters/chat-completions.js";
import { AdapterError } from "../src/errors.js";
import { buildResults } from "../scripts/evaluate.mjs";
import { data, read } from "./helpers.js";

test("with no sampling noise no case is unstable", async () => {
  const f = await measureFlakiness(candidates.v2, data.cases, { runs: 5, temperature: 0 });
  assert.equal(f.unstableCount, 0);
  assert.equal(f.accuracySd, 0);
});

test("with seeded noise some cases flip, and the same seed flips the same ones", async () => {
  const a = await measureFlakiness(candidates.v2, data.cases, { runs: 6, temperature: 0.3, seed: 4 });
  const b = await measureFlakiness(candidates.v2, data.cases, { runs: 6, temperature: 0.3, seed: 4 });
  assert.ok(a.unstableCount > 5 && a.unstableCount < data.cases.length / 2);
  assert.deepEqual(a, b);
});

test("cases that flip are the low-margin ones, not random cases", async () => {
  const f = await measureFlakiness(candidates.v2, data.cases, { runs: 8, temperature: 0.3, seed: 2 });
  const margin = (c) => {
    const s = Object.values(candidates.v2.run(c.text).scores).sort((x, y) => y - x);
    return s[0] - s[1];
  };
  const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
  const unstable = data.cases.filter((_, i) => f.perCase[i].unstable).map(margin);
  const stable = data.cases.filter((_, i) => !f.perCase[i].unstable).map(margin);
  assert.ok(mean(unstable) < mean(stable) / 2);
});

const okBody = { choices: [{ message: { content: 'Sure: {"intent":"fees","urgency":"low","confidence":0.8,"reply":"Hello, see the fee schedule."}' } }] };

test("the HTTP adapter sends the key from the environment config and parses the model's JSON", async () => {
  let seen;
  const fetchImpl = async (url, init) => ((seen = { url, init }), { ok: true, json: async () => okBody });
  const c = createChatCandidate({ endpoint: "https://llm.example/v1/chat", apiKey: "k-test", model: "m", fetchImpl });
  const out = await c.run("hello", { temperature: 0 });
  assert.equal(out.intent, "fees");
  assert.equal(seen.init.headers.authorization, "Bearer k-test");
  assert.equal(JSON.parse(seen.init.body).messages[1].content, "hello");
});

test("the HTTP adapter refuses to start without credentials and surfaces API errors", async () => {
  assert.throws(() => createChatCandidate({ endpoint: "", apiKey: "", model: "" }), AdapterError);
  const c = createChatCandidate({ endpoint: "u", apiKey: "k", model: "m", fetchImpl: async () => ({ ok: false, status: 503 }) });
  await assert.rejects(c.run("x"), /503/);
  assert.throws(() => parseCompletion({ choices: [{ message: { content: "not json" } }] }), AdapterError);
});

test("docs/results.json is exactly what the code produces today", async () => {
  const live = JSON.parse(JSON.stringify(await buildResults(), (_, v) => (typeof v === "number" ? Math.round(v * 1e4) / 1e4 : v)));
  assert.deepEqual(live, JSON.parse(read("docs/results.json")));
});
