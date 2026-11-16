import { makeRuleCandidate } from "./engine.js";
import { EN, IT, AL, union } from "./lexicon.js";

/** v2: weighted phrases in three languages. Stand-in for the prompt that is in production. */
export default makeRuleCandidate({
  id: "v2",
  label: "v2 improved rules",
  description: "Weighted phrases in English, Italian and Albanian, replies in the customer's language, confidence from the number of signals. A stand-in for the version in production.",
  lexicon: union(EN, IT, AL),
  normalizer: "fold",
  fuzzy: false,
  negation: false,
  injectionGuard: false,
  tieOrder: ["fraud", "card_lost", "account_access", "payment_issue", "fees", "loan_info"],
  confidence: "signals",
  urgencyProfile: "v2",
  replyStyle: "careful",
});
