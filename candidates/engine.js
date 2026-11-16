import { fold, words } from "../src/text.js";
import { INTENTS } from "../src/labels.js";
import { detectLang } from "../src/lang.js";
import { gaussian } from "../src/rng.js";
import { draftReply } from "./replies.js";

/**
 * Shared rule engine behind the three stand-in candidates. Each candidate is
 * this engine with different switches turned on. None of them calls a model.
 * @typedef {Object} RuleConfig
 * @property {string} id
 * @property {string} label
 * @property {string} description
 * @property {Record<string, [string, number][]>} lexicon
 * @property {Record<string, Record<string, [string, number][]>>} [lexiconByLang] used by fuzzy matching
 * @property {"fold"|"ascii"} normalizer     "ascii" drops every non-ASCII letter (the v3 preprocessing change)
 * @property {boolean} fuzzy                 tolerate one typo in words of 5+ letters (not for Albanian)
 * @property {boolean} negation              "not fraud" must not count as fraud
 * @property {boolean} injectionGuard        drop sentences that give the classifier orders
 * @property {string[]} tieOrder
 * @property {"flat"|"signals"|"margin"} confidence
 * @property {"v1"|"v2"|"v3"} urgencyProfile
 * @property {"plain"|"careful"|"warm"} replyStyle
 */

const NEG = new Set(["not", "no", "isnt", "never", "without", "non", "nessuna", "senza"]);
const INJECTION = /(ignore (all |your |the )?(previous |prior )?(instructions|rules)|system prompt|you are now|classify (this|it) as|mark (this|it) as|forget your rules|i authori[sz]e you|ignora|ignorare|dimentica le tue|classifica questo|segna questo|come dipendente|sistema:)/i;

const URG = {
  high: ["urgent", "asap", "immediately", "right now", "straight away", "emergency", "urgente", "subito", "immediatamente", "adesso", "urgjent", "menjehere", "tani", "blocco immediato"],
  low: ["no rush", "no hurry", "whenever", "not urgent", "when you can", "non ho fretta", "senza fretta", "nessuna fretta", "non e urgente", "pa nxitim", "nuk eshte urgjent"],
  bump: ["deadline", "tomorrow", "today", "oggi", "stamattina", "sot", "last night", "yesterday"],
};
const BASE_URGENCY = {
  v1: { default: "medium" },
  v2: { fraud: "high", card_lost: "high", account_access: "medium", payment_issue: "medium", fees: "low", loan_info: "low", other: "low" },
};

/** Optimal-string-alignment distance: edits, deletions, inserts and adjacent swaps each cost 1. */
export function osa(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 0; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const c = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + c);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  }
  return d[a.length][b.length];
}

function normalize(text, mode) {
  return mode === "ascii" ? fold(text.toLowerCase().replace(/[^\x00-\x7f]/g, "")) : fold(text);
}

function dropInjections(text) {
  return text.split(/(?<=[.!?\n])\s+/).filter((s) => !INJECTION.test(s)).join(" ");
}

function negated(hay, idx, kw) {
  if (words(kw).some((w) => NEG.has(w))) return false;
  const before = hay.slice(0, idx).trim().split(" ").slice(-3);
  return before.some((w) => NEG.has(w));
}

function cueHit(hay, cues) {
  return cues.some((c) => hay.includes(" " + c));
}

/** @param {RuleConfig} cfg */
export function makeRuleCandidate(cfg) {
  const intents = INTENTS.filter((i) => i !== "other");
  return {
    id: cfg.id,
    label: cfg.label,
    description: cfg.description,
    /**
     * @param {string} input customer message (never the gold labels)
     * @param {{temperature?:number, rng?:() => number}} [ctx] temperature > 0 adds seeded score noise
     */
    run(input, ctx = {}) {
      const text = cfg.injectionGuard ? dropInjections(input) : input;
      const norm = normalize(text, cfg.normalizer);
      const hay = ` ${norm} `;
      const lang = detectLang(input);
      const scores = { other: 0.5 };
      const hits = {};
      for (const intent of intents) {
        scores[intent] = 0;
        hits[intent] = 0;
        const fuzzyList = cfg.fuzzy && lang !== "al" ? cfg.lexiconByLang?.[lang]?.[intent] ?? [] : [];
        const all = [...cfg.lexicon[intent] ?? []];
        for (const [kw, w] of all) {
          const idx = hay.indexOf(" " + kw);
          if (idx >= 0 && !(cfg.negation && negated(hay, idx, kw))) {
            scores[intent] += w;
            hits[intent]++;
          }
        }
        for (const [kw, w] of fuzzyList) {
          if (kw.includes(" ") || kw.length < 5 || hay.includes(" " + kw)) continue;
          if (words(norm).some((t) => t.length >= 5 && osa(t.slice(0, kw.length), kw) <= 1)) {
            scores[intent] += w;
            hits[intent]++;
          }
        }
      }
      const noisy = { ...scores };
      if (ctx.temperature) {
        if (!ctx.rng) throw new Error("temperature needs an rng");
        for (const k of Object.keys(noisy)) noisy[k] += ctx.temperature * gaussian(ctx.rng);
      }
      const order = [...cfg.tieOrder, "other"];
      const ranked = order.slice().sort((a, b) => noisy[b] - noisy[a] || order.indexOf(a) - order.indexOf(b));
      const intent = ranked[0];
      const margin = noisy[ranked[0]] - noisy[ranked[1]];

      const hayUrg = ` ${norm} `;
      const lowCue = cueHit(hayUrg, URG.low);
      const highRaw = URG.high.find((c) => hayUrg.includes(" " + c));
      const highCue = highRaw && !(cfg.negation && negated(hayUrg, hayUrg.indexOf(" " + highRaw), highRaw));
      let urgency;
      if (cfg.urgencyProfile === "v1") urgency = highCue || /\bnow\b/.test(norm) ? "high" : "medium";
      else {
        urgency = BASE_URGENCY.v2[intent];
        if (highCue && !(cfg.urgencyProfile === "v3" && lowCue)) urgency = "high";
        else if (lowCue) urgency = "low";
        else if (cfg.urgencyProfile === "v3" && cueHit(hayUrg, URG.bump) && ["payment_issue", "account_access", "fees"].includes(intent)) urgency = urgency === "low" ? "medium" : "high";
      }
      const signals = (highCue || lowCue ? 1 : 0) + (hits[intent] >= 2 ? 1 : 0);
      const confidence =
        cfg.confidence === "flat" ? 0.9 : cfg.confidence === "signals" ? Math.min(0.9, 0.5 + 0.12 * signals + (margin >= 2 ? 0.1 : 0)) : Math.min(0.85, 0.45 + 0.1 * Math.max(0, margin) + 0.08 * signals);
      return { intent, urgency, confidence, reply: draftReply(cfg.replyStyle, intent, lang), scores };
    },
  };
}
