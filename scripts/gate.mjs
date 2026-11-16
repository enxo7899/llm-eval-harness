// Regression gate on the command line.
//   npm run eval -- --base v1 --candidate v3
// Exit code 0 = ship, 1 = blocked, 2 = cannot decide (test set too small), 64 = bad usage.
import { parseArgs } from "node:util";
import { candidates } from "../candidates/index.js";
import { createChatCandidate } from "../adapters/chat-completions.js";
import { scoreAll, reportPair, subsetIndices } from "../src/pipeline.js";
import { HarnessError } from "../src/errors.js";
import { loadAll } from "./load.mjs";

const pct = (x) => `${(x * 100).toFixed(1)}%`;
const ci = (m) => `${pct(m.estimate)} [${(m.lo * 100).toFixed(1)}, ${(m.hi * 100).toFixed(1)}]`;
const d = (x) => `${x >= 0 ? "+" : "-"}${Math.abs(x * 100).toFixed(1)}`;

export async function main(argv) {
  const { values } = parseArgs({ args: argv, options: { base: { type: "string" }, candidate: { type: "string" }, keep: { type: "string" }, config: { type: "string" }, testset: { type: "string" } } });
  const resolve = (id) => (id === "http" ? createChatCandidate() : candidates[id]);
  const ids = [values.base, values.candidate];
  if (!ids[0] || !ids[1]) throw new HarnessError("usage: npm run eval -- --base v1 --candidate v3 [--keep N]");
  for (const id of ids) if (!resolve(id)) throw new HarnessError(`unknown version "${id}"; choose from ${Object.keys(candidates).join(", ")}, http`);

  const { cases, config } = loadAll({ ...(values.config && { config: values.config }), ...(values.testset && { testset: values.testset }) });
  const { scored } = await scoreAll(Object.fromEntries(ids.map((id) => [id, resolve(id)])), cases);
  const keep = values.keep ? Number(values.keep) : undefined;
  const r = reportPair(scored, ids[0], ids[1], config, keep ? subsetIndices(cases.length, keep, config.seed) : undefined);

  const out = [];
  out.push(`Arka Bank triage eval (fictional bank, stand-in candidates)  base ${ids[0]} -> candidate ${ids[1]}  |  ${r.comparison.n} cases, seed ${config.seed}`, "");
  out.push(`${"metric".padEnd(22)}${"base".padEnd(24)}${"candidate".padEnd(24)}delta`);
  for (const [name, k] of [["intent accuracy", "intentAccuracy"], ["intent macro-F1", "macroF1"], ["urgency accuracy", "urgencyAccuracy"], ["reply judge pass", "judgePassRate"]]) {
    out.push(`${name.padEnd(22)}${ci(r.base[k]).padEnd(24)}${ci(r.candidate[k]).padEnd(24)}${d(r.candidate[k].estimate - r.base[k].estimate)} pts`);
  }
  const mc = r.comparison.mcnemar;
  out.push("", `Paired test (McNemar exact): ${mc.onlyBase} cases only base got right, ${mc.onlyCandidate} only candidate, p=${mc.p.toFixed(4)}; ${mc.bothRight + mc.bothWrong} agreeing cases ignored.`);
  out.push(`Accuracy change ${d(r.comparison.delta.estimate)} pts, 95% CI ${d(r.comparison.delta.lo)} to ${d(r.comparison.delta.hi)}; smallest difference this set can detect: ~${(r.comparison.minDetectableDifference * 100).toFixed(1)} pts.`, "");
  out.push("Slices (intent accuracy)");
  for (const s of r.comparison.sliceDeltas.slice().sort((a, b) => a.delta - b.delta)) out.push(`  ${s.label.padEnd(18)} n=${String(s.n).padEnd(4)} ${pct(s.base).padStart(6)} -> ${pct(s.candidate).padStart(6)}  ${d(s.delta).padStart(6)} pts`);
  out.push("", `GATE: ${r.gate.headline}`);
  for (const x of r.gate.rules) out.push(`  ${x.status.toUpperCase().padEnd(5)} ${x.message}`);
  console.log(out.join("\n"));
  return r.gate.decision === "ship" ? 0 : r.gate.decision === "blocked" ? 1 : 2;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    process.exitCode = await main(process.argv.slice(2));
  } catch (e) {
    if (!(e instanceof HarnessError) && e.code !== "ERR_PARSE_ARGS_UNKNOWN_OPTION") throw e;
    console.error(e.message);
    process.exitCode = 64;
  }
}
