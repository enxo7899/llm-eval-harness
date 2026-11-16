import { makeRuleCandidate } from "./engine.js";
import { EN, IT, AL, union } from "./lexicon.js";

/**
 * v3: v2 plus typo tolerance, negation, an injection guard and a new input
 * normaliser. The normaliser keeps only ASCII letters, which is fine for
 * Italian (accents sit at the end of words) but deletes the Albanian letter
 * e-diaeresis in the middle of words. That is the regression on purpose: a
 * change that helps overall and quietly breaks one slice.
 */
export default makeRuleCandidate({
  id: "v3",
  label: "v3 candidate",
  description: "v2 plus typo tolerance, negation and an instruction-injection guard (all tuned on English and Italian) and a faster ASCII normaliser. Better overall, worse on one slice. A stand-in for the version someone wants to ship.",
  lexicon: union(EN, IT, AL),
  lexiconByLang: { en: EN, it: IT },
  normalizer: "ascii",
  fuzzy: true,
  negation: true,
  injectionGuard: true,
  tieOrder: ["fraud", "card_lost", "account_access", "payment_issue", "fees", "loan_info"],
  confidence: "margin",
  urgencyProfile: "v3",
  replyStyle: "warm",
});
