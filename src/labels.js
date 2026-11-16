/** Label sets shared by the harness, the candidates and the page. */
export const INTENTS = ["card_lost", "fraud", "payment_issue", "account_access", "fees", "loan_info", "other"];
export const URGENCIES = ["low", "medium", "high"];
export const LANGS = ["en", "it", "al"];
export const CHANNELS = ["app", "chat", "email", "phone"];

export const LANG_NAMES = { en: "English", it: "Italian", al: "Albanian" };
export const CHANNEL_NAMES = { app: "In-app", chat: "Web chat", email: "Email", phone: "Phone transcript" };

/**
 * Human label for a slice key such as "lang:al" or "adversarial".
 * @param {string} key
 * @returns {string}
 */
export function sliceLabel(key) {
  if (key.startsWith("lang:")) return LANG_NAMES[key.slice(5)] ?? key;
  if (key.startsWith("channel:")) return CHANNEL_NAMES[key.slice(8)] ?? key;
  if (key === "typo") return "Typos";
  if (key === "adversarial") return "Adversarial";
  return key;
}
