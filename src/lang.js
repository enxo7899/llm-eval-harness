import { fold, words } from "./text.js";

const STOP = {
  en: "the a an and to of is are was my i me you your we our for with on in it that this have has not can please how what why when do does did been will would from by at be as but there",
  it: "il lo la le gli un una uno di che per con non mi ho ha sono sul sulla del della dei delle nel nella al alla da come cosa perche quando vorrei posso puo suo sua mia mio ci si ma anche pero",
  al: "dhe nuk kam jam qe une mund dua ju juaj ime tim ose nga me ne te po si pse kur sa jemi keni ka se te nje per ju lutem tani faleminderit",
};
const SETS = Object.fromEntries(Object.entries(STOP).map(([k, v]) => [k, new Set(v.split(" "))]));
// "per" and "ne" are shared by Italian and Albanian; they only count for the language that is not ambiguous.
const AMBIGUOUS = new Set(["per", "ne", "me", "e"]);

/**
 * Cheap stop-word language detector for en / it / al. Albanian letters
 * (e-diaeresis, c-cedilla) are a strong signal. Ties go to English.
 * @param {string} text
 * @returns {"en"|"it"|"al"}
 */
export function detectLang(text) {
  const score = { en: 0, it: 0, al: 0 };
  if (/[ëÇçË]/.test(text)) score.al += 2;
  for (const w of words(fold(text))) {
    for (const lang of Object.keys(score)) {
      if (SETS[lang].has(w) && !(AMBIGUOUS.has(w) && lang !== "en")) score[lang]++;
    }
  }
  if (/[àèìòù]/.test(text)) score.it += 1;
  return Object.entries(score).sort((a, b) => b[1] - a[1] || (a[0] === "en" ? -1 : 1))[0][0];
}
