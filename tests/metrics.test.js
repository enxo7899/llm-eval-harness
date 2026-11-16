import { test } from "node:test";
import assert from "node:assert/strict";
import { accuracy, confusionMatrix, macroF1, sliceBreakdown, calibration } from "../src/metrics.js";
import { INTENTS } from "../src/labels.js";

test("accuracy is the share of exact matches", () => {
  assert.equal(accuracy(["a", "b", "a", "b"], ["a", "b", "b", "b"]), 0.75);
});

test("macro-F1 matches a hand calculation and punishes ignoring a rare class", () => {
  const labels = ["x", "y"];
  const gold = ["x", "x", "x", "x", "y"];
  const pred = ["x", "x", "x", "x", "x"];
  // x: precision 4/5, recall 1 -> F1 0.8889; y: 0 -> macro 0.4444, while accuracy is 0.8
  assert.ok(Math.abs(macroF1(labels, gold, pred) - 0.4444444) < 1e-6);
  assert.equal(accuracy(gold, pred), 0.8);
});

test("the confusion matrix puts gold on rows and predictions on columns", () => {
  const m = confusionMatrix(INTENTS, ["fraud", "fraud", "fees"], ["fraud", "other", "fees"]);
  assert.equal(m.fraud.fraud, 1);
  assert.equal(m.fraud.other, 1);
  assert.equal(m.fees.fees, 1);
  assert.equal(Object.values(m).flatMap((r) => Object.values(r)).reduce((a, b) => a + b, 0), 3);
});

test("a case counts toward every slice it belongs to", () => {
  const s = sliceBreakdown([["lang:al", "typo"], ["lang:al"], ["lang:en", "typo"]], [true, false, true]);
  assert.deepEqual(s["lang:al"], { n: 2, correct: 1, accuracy: 0.5 });
  assert.equal(s.typo.n, 2);
  assert.equal(s.typo.accuracy, 1);
});

test("calibration error is zero when confidence equals accuracy and large when overconfident", () => {
  const calibrated = calibration([0.5, 0.5, 0.5, 0.5], [true, false, true, false]);
  assert.ok(calibrated.ece < 1e-9);
  const over = calibration([0.95, 0.95, 0.95, 0.95], [true, false, false, false]);
  assert.ok(over.ece > 0.6);
});
