import { candidates } from "./candidates/index.js";
import { parseTestSet } from "./src/testset.js";
import { parseRatings, judgeVersusHuman } from "./src/ratings.js";
import { parseConfig } from "./src/config.js";
import { scoreAll, reportPair, subsetIndices } from "./src/pipeline.js";
import { scoreRun } from "./src/evaluate.js";
import { measureFlakiness } from "./src/flakiness.js";
import { INTENTS, sliceLabel } from "./src/labels.js";
import { sliceKeys } from "./src/testset.js";

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const pct = (x, d = 1) => (x * 100).toFixed(d) + "%";
const pts = (x) => (x >= 0 ? "+" : "−") + Math.abs(x * 100).toFixed(1);
const SHORT = { card_lost: "lost", fraud: "fraud", payment_issue: "pay", account_access: "access", fees: "fees", loan_info: "loan", other: "other" };
const SLICE_ORDER = ["lang:en", "lang:it", "lang:al", "channel:app", "channel:chat", "channel:email", "channel:phone", "typo", "adversarial"];

const params = new URLSearchParams(location.search);
const SCENARIOS = {
  block: { base: "v2", cand: "v3" },
  ship: { base: "v1", cand: "v2" },
  small: { base: "v2", cand: "v3", keep: 40 },
  lenient: { base: "v2", cand: "v3", lenient: true, jump: "s6" },
  flaky: { base: "v2", cand: "v3", jump: "s7" },
};
const scenario = SCENARIOS[params.get("run")] ?? {};
const state = {
  base: params.get("base") ?? scenario.base ?? "v2",
  cand: params.get("cand") ?? scenario.cand ?? "v3",
  keep: Number(params.get("keep") ?? scenario.keep ?? 0),
  lenient: params.has("lenient") || Boolean(scenario.lenient),
  temp: Number(params.get("temp") ?? 0.3),
  caseId: params.get("case"),
  filter: "regressed",
};

let cases, ratings, config, strict, lenientScored, outputs;
let view; // last computed pair report

async function load() {
  const get = (p) => fetch(p).then((r) => (r.ok ? r.text() : Promise.reject(new Error(`${p}: ${r.status}`))));
  const [t, r, c] = await Promise.all([get("data/testset.jsonl"), get("data/human-ratings.jsonl"), get("eval.config.json")]);
  cases = parseTestSet(t);
  ratings = parseRatings(r);
  config = parseConfig(JSON.parse(c));
  const all = await scoreAll(candidates, cases);
  strict = all.scored;
  outputs = all.outputs;
  lenientScored = Object.fromEntries(Object.keys(candidates).map((id) => [id, scoreRun(cases, outputs[id], { lenient: true })]));
}

const scoredNow = () => (state.lenient ? lenientScored : strict);
const keepNow = () => (state.keep > 0 && state.keep < cases.length ? state.keep : cases.length);
const indicesNow = () => (keepNow() < cases.length ? subsetIndices(cases.length, keepNow(), config.seed) : null);

function setupControls() {
  for (const sel of [$("base"), $("cand")]) sel.innerHTML = Object.values(candidates).map((c) => `<option value="${c.id}">${esc(c.id)}</option>`).join("");
  $("base").value = state.base;
  $("cand").value = state.cand;
  $("keep").max = cases.length;
  $("keep").value = keepNow();
  $("lenient").checked = state.lenient;
  $("temp").value = state.temp;
  $("meta").textContent = `${cases.length} labelled cases · English, Italian, Albanian · seed ${config.seed} · gate needs at least ${config.gate.minTestSize} cases`;
  $("base").onchange = () => ((state.base = $("base").value), render());
  $("cand").onchange = () => ((state.cand = $("cand").value), render());
  $("keep").oninput = () => ((state.keep = Number($("keep").value)), render());
  $("lenient").onchange = () => ((state.lenient = $("lenient").checked), render());
  $("reset").onclick = () => {
    state.keep = 0;
    state.lenient = false;
    $("keep").value = cases.length;
    $("lenient").checked = false;
    render();
  };
  $("temp").oninput = () => ((state.temp = Number($("temp").value)), renderFlaky());
}

function renderVerdict(r) {
  const g = r.gate;
  const cls = g.decision;
  $("verdict").innerHTML = `<div class="tag">Gate verdict</div><p class="v ${cls}">${esc(g.headline.replace(/-(\d)/g, "−$1"))}</p>`;
  $("rules").innerHTML = `<tbody>${g.rules.map((x) => `<tr class="${x.status}"><td class="k">${x.status.toUpperCase()}</td><td>${esc(x.message.replace(/ -(\d)/g, " −$1"))}</td></tr>`).join("")}</tbody>`;
}

function renderReadout(r) {
  const n = r.comparison.n;
  const w = r.candidate.intentAccuracy.hi - r.candidate.intentAccuracy.lo;
  $("keepOut").textContent = `${keepNow()} / ${cases.length}`;
  $("readout").innerHTML =
    `With ${n} cases the candidate's accuracy interval is ${pct(w)} wide and the smallest detectable difference is about ${pct(r.comparison.minDetectableDifference)}. ` +
    (n < config.gate.minTestSize ? `Below ${config.gate.minTestSize} cases the gate refuses to decide.` : `The gate decides from ${config.gate.minTestSize} cases up.`) +
    (state.lenient ? ` The judge is lenient, so reply quality now looks perfect (${pct(r.candidate.judgePassRate.estimate)} pass).` : "");
}

function intervalSvg(a, b) {
  const x = (v) => 4 + v * 192;
  const row = (m, y, strong) =>
    `<line x1="${x(m.lo)}" x2="${x(m.hi)}" y1="${y}" y2="${y}" stroke="${strong ? "#1c1a17" : "#8d8577"}" stroke-width="${strong ? 2.5 : 2}"/><circle cx="${x(m.estimate)}" cy="${y}" r="${strong ? 4 : 3.2}" fill="${strong ? "#1c1a17" : "#f5f0e6"}" stroke="${strong ? "#1c1a17" : "#8d8577"}" stroke-width="1.5"/>`;
  return `<svg width="200" height="26" viewBox="0 0 200 26" role="img" aria-label="Base ${pct(a.estimate)} from ${pct(a.lo)} to ${pct(a.hi)}; candidate ${pct(b.estimate)} from ${pct(b.lo)} to ${pct(b.hi)}">${row(a, 8, false)}${row(b, 18, true)}</svg>`;
}

function renderMetrics(r) {
  const rows = [["Intent accuracy", "intentAccuracy"], ["Intent macro-F1", "macroF1"], ["Urgency accuracy", "urgencyAccuracy"], ["Reply judge pass rate", "judgePassRate"]];
  const body = rows
    .map(([name, k]) => {
      const a = r.base[k], b = r.candidate[k], d = b.estimate - a.estimate;
      return `<tr><td>${name}</td><td class="n">${pct(a.estimate)} <span class="ci">[${(a.lo * 100).toFixed(1)}, ${(a.hi * 100).toFixed(1)}]</span></td><td class="n">${pct(b.estimate)} <span class="ci">[${(b.lo * 100).toFixed(1)}, ${(b.hi * 100).toFixed(1)}]</span></td><td class="n delta ${d < -0.0005 ? "neg" : ""}">${pts(d)} pts</td><td>${intervalSvg(a, b)}</td></tr>`;
    })
    .join("");
  $("metrics").innerHTML = `<thead><tr><th>Metric</th><th class="n">${esc(state.base)} (base)</th><th class="n">${esc(state.cand)} (candidate)</th><th class="n">Change</th><th>Intervals <span style="text-transform:none;letter-spacing:0">(light = base)</span></th></tr></thead><tbody>${body}</tbody>`;
}

function renderPaired(r) {
  const m = r.comparison.mcnemar;
  const c = r.comparison;
  const verdict =
    m.discordant === 0 ? "The versions never disagree, so there is nothing to test." : m.p < config.gate.alpha ? `That is unlikely to be chance (exact p = ${m.p.toFixed(3)}).` : `That is not distinguishable from chance (exact p = ${m.p.toFixed(3)}).`;
  $("pairedText").innerHTML = `Of ${c.n} cases, ${m.onlyBase} were right only on ${esc(state.base)} and ${m.onlyCandidate} only on ${esc(state.cand)}. The ${m.bothRight + m.bothWrong} cases both got right or both got wrong say nothing about which is better, so McNemar's exact test ignores them. ${verdict} Accuracy changed by ${pts(c.delta.estimate)} points (95% interval ${pts(c.delta.lo)} to ${pts(c.delta.hi)}). With ${c.n} cases, a difference smaller than about ${pct(c.minDetectableDifference)} cannot be told from noise.`;
  $("mc").innerHTML = `<thead><tr><th></th><th class="n">${esc(state.cand)} right</th><th class="n">${esc(state.cand)} wrong</th></tr></thead><tbody><tr><td>${esc(state.base)} right</td><td class="n">${m.bothRight}</td><td class="n delta ${m.onlyBase ? "neg" : ""}">${m.onlyBase}</td></tr><tr><td>${esc(state.base)} wrong</td><td class="n">${m.onlyCandidate}</td><td class="n">${m.bothWrong}</td></tr></tbody>`;
  $("mcSide").innerHTML = `<div class="stat"><div><span>Exact p</span><b class="mono" style="font-size:22px">${m.p < 0.001 ? "&lt; 0.001" : m.p.toFixed(3)}</b></div><div><span>Discordant cases</span><b class="mono" style="font-size:22px">${m.discordant}</b></div></div>`;
}

function renderSlices(r) {
  const g = config.gate;
  const byKey = Object.fromEntries(r.comparison.sliceDeltas.map((s) => [s.key, s]));
  const failing = new Set(r.gate.rules.filter((x) => x.id.startsWith("slice:")).map((x) => x.id.slice(6)));
  const body = SLICE_ORDER.filter((k) => byKey[k])
    .map((k) => {
      const s = byKey[k];
      const gated = s.n >= g.minSliceSize;
      const bad = failing.has(k);
      const w = Math.abs(s.delta) * 100 * 3;
      const bar = `<svg width="90" height="12" viewBox="-45 0 90 12" aria-hidden="true"><line x1="0" x2="0" y1="0" y2="12" stroke="#8d8577"/><rect x="${s.delta < 0 ? -Math.min(w, 44) : 0}" y="2" width="${Math.min(w, 44)}" height="8" fill="${bad ? "#b23a1b" : "#1c1a17"}" opacity="${bad ? 1 : 0.55}"/></svg>`;
      return `<tr class="${bad ? "fail" : ""}"><td class="k">${esc(s.label)}${bad ? " &nbsp;regression" : ""}${gated ? "" : " <span class=ci>(not gated, too few)</span>"}</td><td class="n">${s.n}</td><td class="n">${pct(s.base)}</td><td class="n">${pct(s.candidate)}</td><td class="n">${pts(s.delta)}</td><td class="n">${s.p < 0.001 ? "&lt;0.001" : s.p.toFixed(3)}</td><td>${bar}</td></tr>`;
    })
    .join("");
  $("slices").innerHTML = `<thead><tr><th>Slice</th><th class="n">n</th><th class="n">${esc(state.base)}</th><th class="n">${esc(state.cand)}</th><th class="n">Change (pts)</th><th class="n">Exact p</th><th></th></tr></thead><tbody>${body}</tbody>`;
}

function confusionTable(sum, title) {
  const m = sum.confusion;
  const max = Math.max(1, ...INTENTS.flatMap((g) => INTENTS.filter((p) => p !== g).map((p) => m[g][p])));
  const head = `<tr><th></th>${INTENTS.map((p) => `<th title="${p}">${SHORT[p]}</th>`).join("")}<th>F1</th></tr>`;
  const rows = INTENTS.map((g, i) => {
    const f1 = sum.perClass[i].f1;
    return `<tr><th class="rowh" title="${g}">${SHORT[g]}</th>${INTENTS.map((p) => {
      const v = m[g][p];
      const cls = g === p ? "diag" : v ? "err" : "";
      const style = g !== p && v ? ` style="background:rgba(178,58,27,${0.12 + 0.4 * (v / max)})"` : "";
      return `<td class="${cls}"${style}>${v || "·"}</td>`;
    }).join("")}<td class="m" style="text-align:left">${f1.toFixed(2)}</td></tr>`;
  }).join("");
  return `<div><h3 style="font:600 17px var(--serif);margin:0 0 6px">${title}</h3><div class="wrap"><table class="cm">${head}${rows}</table></div></div>`;
}

function renderConfusion(r) {
  $("cmGrid").innerHTML = confusionTable(r.base, `${esc(state.base)} (base)`) + confusionTable(r.candidate, `${esc(state.cand)} (candidate)`);
}

function reliabilitySvg(cal) {
  const s = 190, p = 26;
  const X = (v) => p + v * (s - p - 6), Y = (v) => s - p - v * (s - p - 6);
  const pts_ = cal.bins.filter((b) => b.n).map((b) => `<circle cx="${X(b.meanConfidence)}" cy="${Y(b.accuracy)}" r="${3 + Math.min(7, Math.sqrt(b.n) / 1.6)}" fill="#1c1a17" opacity=".75"/>`).join("");
  return `<svg width="${s}" height="${s}" viewBox="0 0 ${s} ${s}" role="img" aria-label="Reliability diagram"><line x1="${X(0)}" y1="${Y(0)}" x2="${X(1)}" y2="${Y(1)}" stroke="#8d8577" stroke-dasharray="4 3"/><rect x="${X(0)}" y="${Y(1)}" width="${X(1) - X(0)}" height="${Y(0) - Y(1)}" fill="none" stroke="#cdc4b1"/>${pts_}<text x="${X(0.5)}" y="${s - 6}" font-size="10" text-anchor="middle" fill="#6a6459">stated confidence</text><text x="9" y="${Y(0.5)}" font-size="10" fill="#6a6459" transform="rotate(-90 9 ${Y(0.5)})" text-anchor="middle">actual accuracy</text></svg>`;
}

function renderCalibration(r) {
  const block = (sum, name) => `<div><h3 style="font:600 17px var(--serif);margin:0 0 4px">${name}: error ${sum.calibration.ece.toFixed(3)}, Brier ${sum.calibration.brier.toFixed(3)}</h3><div style="display:flex;gap:14px;align-items:flex-start;flex-wrap:wrap">${reliabilitySvg(sum.calibration)}<div class="wrap"><table><thead><tr><th>Said</th><th class="n">n</th><th class="n">Right</th></tr></thead><tbody>${sum.calibration.bins.filter((b) => b.n).map((b) => `<tr><td class="m">${pct(b.meanConfidence, 0)}</td><td class="n">${b.n}</td><td class="n">${pct(b.accuracy, 0)}</td></tr>`).join("")}</tbody></table></div></div></div>`;
  $("calGrid").innerHTML = block(r.base, `${esc(state.base)} (base)`) + block(r.candidate, `${esc(state.cand)} (candidate)`);
}

function renderJudge() {
  const replyOf = (v, id) => outputs[v][cases.findIndex((c) => c.id === id)]?.reply;
  const j = judgeVersusHuman(ratings, cases, replyOf, { lenient: state.lenient });
  const t = j.table;
  const dis = j.rows.filter((x) => x.human !== x.judge);
  $("judge").innerHTML = `<div class="stat"><div><span>Cohen's kappa</span><b class="kappa ${j.kappa < 0.4 ? "low" : ""}">${j.kappa.toFixed(2)}</b></div><div><span>Raw agreement</span><b class="mono" style="font-size:22px">${pct(j.agreement, 0)} of ${j.n}</b></div><div><span>Judge</span><b class="mono" style="font-size:22px">${state.lenient ? "lenient" : "strict"}</b></div></div>
  <div class="grid2"><div class="wrap"><table><thead><tr><th></th><th class="n">Judge: pass</th><th class="n">Judge: fail</th></tr></thead><tbody><tr><td>Person: acceptable</td><td class="n">${t.humanYesJudgeYes}</td><td class="n ${t.humanYesJudgeNo ? "delta neg" : ""}">${t.humanYesJudgeNo}</td></tr><tr><td>Person: not acceptable</td><td class="n ${t.humanNoJudgeYes ? "delta neg" : ""}">${t.humanNoJudgeYes}</td><td class="n">${t.humanNoJudgeNo}</td></tr></tbody></table></div>
  <p class="note" style="margin:0">${state.lenient ? "A lenient judge passes almost everything, so it agrees with people only where people also say yes. Kappa falls to chance level even though raw agreement still looks respectable. Check kappa, not the share of agreement." : "The strict judge gets most calls right but has gaps: it misses over-confident wording it has no rule for, and fails a reply that says “lock” where its pattern wants “block”. Those are the disagreements listed below."}</p></div>
  <div class="wrap dis" style="margin-top:12px"><table><thead><tr><th>Case</th><th>Person</th><th>Judge</th><th>Why</th></tr></thead><tbody>${dis.slice(0, 12).map((x) => `<tr><td class="m"><a href="#" data-case="${x.caseId}">${x.version}/${x.caseId}</a></td><td>${x.rating}/5, ${esc(x.note)}</td><td>${x.judge ? "pass" : "fail"}</td><td class="ci">${esc(x.reasons.join("; "))}</td></tr>`).join("") || `<tr><td colspan="4" class="ci">No disagreements.</td></tr>`}</tbody></table>${dis.length > 12 ? `<p class="ci">${dis.length - 12} more not shown.</p>` : ""}</div>`;
  $("judge").querySelectorAll("a[data-case]").forEach((a) => (a.onclick = (e) => (e.preventDefault(), openCase(a.dataset.case))));
}

let flakyToken = 0;
async function renderFlaky() {
  const token = ++flakyToken;
  $("tempOut").textContent = state.temp.toFixed(2);
  const f = await measureFlakiness(candidates[state.cand], cases, { runs: config.flakiness.runs, temperature: state.temp, seed: config.seed });
  if (token !== flakyToken) return;
  const unstable = f.perCase.filter((c) => c.unstable).sort((a, b) => a.agreement - b.agreement);
  const lo = Math.min(...f.accuracyPerRun), hi = Math.max(...f.accuracyPerRun);
  $("flaky").innerHTML = `<div class="stat"><div><span>Unstable cases</span><b class="kappa ${f.unstableCount ? "low" : ""}">${f.unstableCount}</b></div><div><span>Accuracy over ${f.runs} runs</span><b class="mono" style="font-size:20px">${pct(lo)} to ${pct(hi)}</b></div><div><span>Right in every run</span><b class="mono" style="font-size:20px">${f.alwaysRight} of ${cases.length}</b></div></div>
  ${f.unstableCount ? `<div class="wrap"><table><thead><tr><th>Case</th><th>Message</th><th class="n">Agreement</th><th class="n">Right in</th></tr></thead><tbody>${unstable.slice(0, 6).map((c) => `<tr><td class="m"><a href="#" data-case="${c.id}">${c.id}</a></td><td>${esc(cases.find((x) => x.id === c.id).text.slice(0, 70))}</td><td class="n">${pct(c.agreement, 0)}</td><td class="n">${c.correctRuns}/${f.runs}</td></tr>`).join("")}</tbody></table></div><p class="ci">${f.unstableCount > 6 ? `${f.unstableCount - 6} more unstable cases. ` : ""}Same seed, same cases flip. A gate that compares single runs would block or ship these at random.</p>` : `<div class="empty">No noise, no flips. Move the slider to add sampling noise and see which cases become unstable.</div>`}`;
  $("flaky").querySelectorAll("a[data-case]").forEach((a) => (a.onclick = (e) => (e.preventDefault(), openCase(a.dataset.case))));
}

function caseRows() {
  const sc = scoredNow();
  const idx = indicesNow() ?? cases.map((_, i) => i);
  return idx.map((i) => ({ i, c: cases[i], b: sc[state.base].intentOk[i], k: sc[state.cand].intentOk[i] }));
}

function renderFilters() {
  const rows = caseRows();
  const defs = [["regressed", "Regressions", (r) => r.b && !r.k], ["gained", "Gains", (r) => !r.b && r.k], ["wrong", "Candidate wrong", (r) => !r.k], ["all", "All cases", () => true]];
  $("filters").innerHTML = defs.map(([id, label, f]) => `<button type="button" data-f="${id}" aria-pressed="${state.filter === id}">${label} (${rows.filter(f).length})</button>`).join("");
  $("filters").querySelectorAll("button").forEach((b) => (b.onclick = () => ((state.filter = b.dataset.f), renderCases())));
}

function renderCases() {
  renderFilters();
  const rows = caseRows();
  const f = { regressed: (r) => r.b && !r.k, gained: (r) => !r.b && r.k, wrong: (r) => !r.k, all: () => true }[state.filter];
  const shown = rows.filter(f);
  $("list").innerHTML = shown.length
    ? shown.map((r) => `<button type="button" role="listitem" data-id="${r.c.id}" aria-current="${state.caseId === r.c.id}"><span class="id">${r.c.id}</span><span class="t ${r.b && !r.k ? "reg" : ""}">${esc(r.c.text)}</span></button>`).join("")
    : `<div class="empty">No cases in this filter for ${esc(state.base)} against ${esc(state.cand)}.</div>`;
  $("list").querySelectorAll("button").forEach((b) => (b.onclick = () => openCase(b.dataset.id)));
  renderDetail();
}

function outputBlock(version, i) {
  const sc = scoredNow()[version];
  const c = cases[i], o = sc.outputs[i], j = sc.judge[i];
  const ok = sc.intentOk[i];
  return `<div class="out ${ok ? "" : "bad"}"><h4>${esc(version)}</h4><div class="verd">intent ${esc(o.intent)} (${ok ? "right" : "wrong"}) · urgency ${esc(o.urgency)} (${o.urgency === c.urgency ? "right" : "wrong"}) · confidence ${o.confidence.toFixed(2)}</div><div class="reply">${esc(o.reply)}</div><div class="judge">Judge: ${j.pass ? "pass" : "fail"}. ${esc(j.reasons.join("; "))}</div></div>`;
}

function renderDetail() {
  const i = cases.findIndex((c) => c.id === state.caseId);
  if (i < 0) {
    $("detail").innerHTML = `<div class="empty">Pick a case on the left. Cases the candidate lost are marked in colour.</div>`;
    return;
  }
  const c = cases[i];
  $("detail").innerHTML = `<div class="detail"><div class="tagline">${c.id} · ${sliceKeys(c).map(sliceLabel).join(" · ")}</div><blockquote lang="${c.lang === "al" ? "sq" : c.lang}">${esc(c.text)}</blockquote><div class="tagline">Gold: intent <b>${c.intent}</b>, urgency <b>${c.urgency}</b></div>${outputBlock(state.base, i)}${state.base !== state.cand ? outputBlock(state.cand, i) : ""}</div>`;
}

function openCase(id) {
  state.caseId = id;
  renderCases();
  $("s8").scrollIntoView({ block: "start", behavior: "smooth" });
}

function render() {
  const same = state.base === state.cand;
  $("vdesc").textContent = candidates[state.cand].description.split(".")[0] + ".";
  $("keep").value = keepNow();
  $("keepOut").textContent = `${keepNow()} / ${cases.length}`;
  renderJudge();
  renderFlaky();
  if (same) {
    $("verdict").innerHTML = `<div class="tag">Gate verdict</div><div class="empty">Pick two different versions to compare. Try v2 against v3: the candidate looks better overall.</div>`;
    $("rules").innerHTML = "";
    for (const id of ["metrics", "mc", "slices"]) $(id).innerHTML = "";
    for (const id of ["cmGrid", "calGrid", "mcSide", "readout"]) $(id).innerHTML = "";
    $("pairedText").textContent = "Needs two different versions.";
    renderCases();
    return;
  }
  view = reportPair(scoredNow(), state.base, state.cand, config, indicesNow() ?? undefined);
  renderVerdict(view);
  renderReadout(view);
  renderMetrics(view);
  renderPaired(view);
  renderSlices(view);
  renderConfusion(view);
  renderCalibration(view);
  renderCases();
}

try {
  await load();
  setupControls();
  if (!state.caseId && params.get("run") === "block") state.caseId = "al-048";
  render();
  if (scenario.jump) $(scenario.jump).scrollIntoView();
} catch (e) {
  document.querySelector("main").insertAdjacentHTML("afterbegin", `<div class="empty">Could not load the test set: ${esc(e.message)}. Serve this folder over HTTP (npm run dev) instead of opening the file directly.</div>`);
  console.error(e);
}
