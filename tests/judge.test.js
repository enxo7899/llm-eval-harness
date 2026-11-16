import { test } from "node:test";
import assert from "node:assert/strict";
import { judgeReply } from "../src/judge.js";
import { cohensKappa, agreement } from "../src/agreement.js";
import { parseRatings, judgeVersusHuman } from "../src/ratings.js";
import { candidates } from "../candidates/index.js";
import { data, read } from "./helpers.js";

const fraudCase = { intent: "fraud", lang: "en" };
const good = candidates.v2.run("someone hacked my account, there are transfers I dont recognise").reply;

test("a complete, careful reply passes all five checks", () => {
  const j = judgeReply(good, fraudCase);
  assert.equal(j.pass, true);
  assert.equal(j.score, 5);
});

test("a reply that promises a guaranteed refund is rejected", () => {
  const j = judgeReply(good + " We guarantee a full refund.", fraudCase);
  assert.equal(j.checks.promises, false);
  assert.match(j.reasons.join(" "), /forbidden promise/);
});

test("a reply in the wrong language is rejected", () => {
  const j = judgeReply(good, { intent: "fraud", lang: "it" });
  assert.equal(j.checks.language, false);
});

test("a reply missing a required fact is rejected and says which", () => {
  const j = judgeReply("Hello, thank you for reporting this. We are looking into it and will be in touch with you very soon about what we find.", fraudCase);
  assert.equal(j.checks.facts, false);
  assert.match(j.reasons.join(" "), /gives the hotline/);
});

test("replies that are too short or shouted are rejected", () => {
  assert.equal(judgeReply("Thanks, call us.", fraudCase).checks.length, false);
  assert.equal(judgeReply(good.replace("Hello", "HELLO"), fraudCase).checks.tone, false);
});

test("advice not to share a PIN is fine but asking for the password is not", () => {
  assert.equal(judgeReply(good, fraudCase).checks.tone, true);
  assert.equal(judgeReply(good + " Please send us your password so we can check.", fraudCase).checks.tone, false);
});

test("Cohen's kappa is 1 for identical raters, 0 at chance level and 0.4 on the textbook example", () => {
  assert.equal(cohensKappa([1, 0, 1, 1], [1, 0, 1, 1]), 1);
  assert.equal(cohensKappa([1, 1, 0, 0], [1, 0, 1, 0]), 0);
  const a = [...Array(20).fill(true), ...Array(5).fill(true), ...Array(10).fill(false), ...Array(15).fill(false)];
  const b = [...Array(20).fill(true), ...Array(5).fill(false), ...Array(10).fill(true), ...Array(15).fill(false)];
  const r = agreement(a, b);
  assert.ok(Math.abs(r.kappa - 0.4) < 1e-9);
  assert.equal(r.agreement, 0.7);
});

const replyOf = (v, id) => candidates[v].run(data.cases.find((c) => c.id === id).text).reply;

test("every human rating still matches the reply the candidate writes today", () => {
  const r = judgeVersusHuman(data.ratings, data.cases, replyOf);
  assert.deepEqual(r.stale, []);
  assert.ok(r.n >= 60);
});

test("the strict judge agrees with people well but not perfectly, and a lenient judge collapses to kappa 0", () => {
  const strict = judgeVersusHuman(data.ratings, data.cases, replyOf);
  const lenient = judgeVersusHuman(data.ratings, data.cases, replyOf, { lenient: true });
  assert.ok(strict.kappa > 0.5 && strict.kappa < 0.95, `kappa ${strict.kappa}`);
  assert.ok(strict.table.humanYesJudgeNo > 0 && strict.table.humanNoJudgeYes > 0, "judge has both kinds of miss");
  assert.ok(lenient.kappa < 0.2, `lenient kappa ${lenient.kappa}`);
});

test("a rating outside 1 to 5 is refused", () => {
  assert.throws(() => parseRatings('{"caseId":"a","version":"v1","reply":"x","rating":9}'), /rating must be 1 to 5/);
  assert.ok(read("data/human-ratings.jsonl").includes("written for the demo"));
});
