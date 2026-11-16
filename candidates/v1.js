import { makeRuleCandidate } from "./engine.js";
import { V1_EN } from "./lexicon.js";

/** v1: a short English keyword list. Stand-in for the first prompt, not a model. */
export default makeRuleCandidate({
  id: "v1",
  label: "v1 keyword rules",
  description: "English keywords only, no weights, always 90% sure, replies in English whatever the customer wrote. A stand-in for the first prompt version.",
  lexicon: V1_EN,
  normalizer: "fold",
  fuzzy: false,
  negation: false,
  injectionGuard: false,
  tieOrder: ["card_lost", "fraud", "account_access", "payment_issue", "fees", "loan_info"],
  confidence: "flat",
  urgencyProfile: "v1",
  replyStyle: "plain",
});
