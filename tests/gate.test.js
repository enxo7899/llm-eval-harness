import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { reportPair } from "../src/pipeline.js";
import { decide } from "../src/gate.js";
import { parseConfig } from "../src/config.js";
import { data, pair, synthetic, ROOT } from "./helpers.js";

const cfg = data.config;
const synth = (b, c, config = cfg) => reportPair({ b: synthetic(b), c: synthetic(c) }, "b", "c", config);

test("a version that is worse on one slice is blocked even when overall accuracy rises", () => {
  const r = synth({ en: [60, 30], it: [40, 30], al: [20, 18] }, { en: [60, 50], it: [40, 35], al: [20, 14] });
  assert.ok(r.comparison.delta.estimate > 0.1, "overall accuracy went up a lot");
  assert.equal(r.gate.decision, "blocked");
  assert.match(r.gate.headline, /^Blocked: Albanian slice -20\.0 pts/);
});

test("on the shipped data, v3 beats v2 overall yet is blocked for the Albanian slice", async () => {
  const r = await pair("v2", "v3");
  assert.ok(r.comparison.delta.estimate > 0);
  assert.equal(r.gate.decision, "blocked");
  assert.match(r.gate.headline, /^Blocked: Albanian slice -\d+\.\d pts/);
});

test("the shipped candidate passes the gate against its predecessor", async () => {
  const r = await pair(cfg.previous, cfg.shipped);
  assert.equal(r.gate.decision, "ship");
});

test("the gate refuses to pass when the test set is below the minimum size", async () => {
  const r = await pair("v1", "v2", Array.from({ length: cfg.gate.minTestSize - 1 }, (_, i) => i));
  assert.equal(r.gate.decision, "undecided");
  assert.match(r.gate.headline, /^Cannot decide/);
  assert.ok(r.gate.rules.filter((x) => x.status === "skip").length >= 4);
});

test("a clean improvement on a big enough set ships", () => {
  const r = synth({ en: [60, 40], it: [40, 28], al: [30, 21] }, { en: [60, 50], it: [40, 33], al: [30, 24] });
  assert.equal(r.gate.decision, "ship");
  assert.equal(r.gate.headline, "Ship");
});

test("a slice with fewer cases than the slice minimum is not gated", () => {
  const r = synth({ en: [100, 70], al: [5, 5] }, { en: [100, 80], al: [5, 1] });
  assert.equal(r.gate.decision, "ship");
});

test("an adversarial accuracy floor blocks a candidate that is weak on attacks", async () => {
  const r = await pair("v1", "v2");
  const strict = { ...cfg.gate, minAdversarialAccuracy: 0.9 };
  const d = decide(r, strict);
  assert.equal(d.decision, "blocked");
  assert.match(d.headline, /adversarial/);
});

test("when slice significance is required, a small unproven slice drop no longer blocks", async () => {
  const r = await pair("v2", "v3");
  const d = decide(r, { ...cfg.gate, requireSliceSignificance: true });
  assert.equal(d.rules.some((x) => x.id.startsWith("slice:")), false);
});

test("a significant overall drop is blocked", () => {
  const r = synth({ en: [120, 100] }, { en: [120, 80] });
  assert.equal(r.gate.decision, "blocked");
  assert.ok(r.gate.rules.some((x) => x.id === "overall" && x.status === "fail"));
});

test("config with a missing threshold is rejected with the key name", () => {
  const bad = JSON.parse(JSON.stringify(cfg));
  delete bad.gate.minTestSize;
  assert.throws(() => parseConfig(bad), /minTestSize/);
});

const cli = (...args) => spawnSync("node", ["scripts/gate.mjs", ...args], { cwd: ROOT, encoding: "utf8" });

test("the command line exits 0 on ship, 1 on blocked, 2 when undecided and prints why", () => {
  const ship = cli("--base", "v1", "--candidate", "v2");
  assert.equal(ship.status, 0);
  const blocked = cli("--base", "v2", "--candidate", "v3");
  assert.equal(blocked.status, 1);
  assert.match(blocked.stdout, /GATE: Blocked: Albanian slice/);
  const small = cli("--base", "v2", "--candidate", "v3", "--keep", "30");
  assert.equal(small.status, 2);
  assert.match(small.stdout, /too small/);
  assert.equal(cli("--base", "v9", "--candidate", "v3").status, 64);
});
