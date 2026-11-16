/**
 * Keyword lexicons: [pattern, weight]. A pattern matches when it is the start
 * of a word (or word sequence) in the accent-folded text. Written without
 * accents on purpose.
 */
export const EN = {
  card_lost: [["lost my card", 3], ["lost card", 3], ["lost my debit", 3], ["lost my credit", 3], ["stolen", 2], ["stole", 2], ["missing card", 3], ["cant find my card", 3], ["card is gone", 3], ["card is missing", 3], ["card has been missing", 3], ["wallet", 1], ["block my card", 2], ["freeze my card", 2], ["misplaced", 2], ["lost my", 1], ["left my debit card", 3], ["left my card", 3], ["cant find my credit card", 3], ["cant find it", 1]],
  fraud: [["fraud", 2], ["unauthori", 2], ["didnt make", 2], ["never made", 2], ["scam", 2], ["hacked", 2], ["suspicious", 1], ["dont recogni", 2], ["did not make", 2], ["phishing", 2], ["unknown transaction", 2], ["never heard of", 1], ["withdrawal i didnt", 2]],
  payment_issue: [["payment", 1], ["transfer", 1], ["declined", 2], ["failed", 1], ["pending", 1], ["twice", 2], ["double charge", 2], ["duplicate", 2], ["didnt arrive", 2], ["not arrived", 2], ["bounced", 2], ["direct debit", 1], ["standing order", 1], ["wire", 1], ["sepa", 1], ["recipient", 1], ["two times", 2]],
  account_access: [["login", 2], ["log in", 2], ["password", 2], ["locked out", 3], ["locked", 1], ["reset", 1], ["otp", 2], ["sign in", 2], ["app wont", 2], ["cant access", 2], ["cannot access", 2], ["two factor", 2], ["face id", 2], ["username", 2], ["verification code", 2], ["register again", 1]],
  fees: [["fee", 2], ["charged", 1], ["commission", 2], ["overdraft", 2], ["maintenance", 2], ["atm fee", 3], ["cost", 1], ["penalty", 2], ["annual fee", 3], ["exchange rate", 1]],
  loan_info: [["loan", 2], ["mortgage", 2], ["borrow", 2], ["interest rate", 2], ["credit line", 2], ["refinanc", 2], ["repayment", 1], ["eligib", 1], ["personal loan", 3]],
};

export const IT = {
  card_lost: [["carta smarrita", 3], ["smarrit", 2], ["persa la carta", 3], ["ho perso", 2], ["rubata", 2], ["rubato", 2], ["furto", 2], ["bloccare la carta", 3], ["bloccarla", 2], ["portafoglio", 1], ["non trovo piu la mia carta", 3], ["non trovo la carta", 3], ["sospendete", 1]],
  fraud: [["frode", 2], ["truffa", 2], ["non autorizzat", 2], ["non riconosco", 2], ["non ho effettuato", 2], ["non ho fatto", 2], ["sospett", 1], ["phishing", 2], ["clonat", 2], ["sconosciut", 1]],
  payment_issue: [["pagamento", 2], ["bonifico", 2], ["rifiutat", 2], ["doppio addebito", 3], ["addebitato due", 3], ["in sospeso", 1], ["non e arrivat", 2], ["sepa", 1], ["domiciliazione", 1], ["beneficiario", 1], ["respint", 2]],
  account_access: [["accedere", 2], ["accesso", 2], ["password", 2], ["bloccato", 1], ["reimpost", 2], ["otp", 2], ["login", 2], ["non riesco ad entrare", 2], ["app non", 1], ["l app non", 2], ["autenticazione", 2], ["credenziali", 2], ["riconoscimento facciale", 2]],
  fees: [["commission", 2], ["costi", 2], ["canone", 2], ["spese", 2], ["scoperto", 2], ["tariff", 2], ["quanto costa", 2], ["penale", 2], ["bollo", 2], ["addebitato 2", 1]],
  loan_info: [["prestito", 2], ["mutuo", 2], ["finanziamento", 2], ["tasso", 1], ["rata", 1], ["fido", 2]],
};

export const AL = {
  card_lost: [["humb", 2], ["vodh", 2], ["vjedh", 2], ["bllokoni karten", 3], ["bllokoj karten", 3], ["blloko karten", 3], ["nuk e gjej karten", 3], ["portofol", 1], ["pezullo", 1], ["bllokojeni", 2], ["ta bllokoni", 2], ["ta ndaloj", 2]],
  fraud: [["mashtrim", 2], ["mashtro", 2], ["nuk e njoh", 2], ["nuk i njoh", 2], ["paautorizuar", 2], ["pa autorizim", 2], ["nuk e kam bere", 2], ["hakuar", 2], ["phishing", 2], ["dyshim", 1], ["panjohur", 2]],
  payment_issue: [["pages", 2], ["transfert", 2], ["deshto", 2], ["refuzuar", 2], ["dy here", 2], ["dyfisht", 2], ["ne pritje", 1], ["nuk ka arritur", 2], ["nuk arriti", 2], ["marresi", 1]],
  account_access: [["hyj", 2], ["hyrje", 2], ["fjalekalim", 2], ["bllokuar", 1], ["rivendos", 2], ["otp", 2], ["identifikim", 2], ["aplikacioni nuk hapet", 3], ["emri i perdoruesit", 2]],
  fees: [["tarif", 2], ["komision", 2], ["kosto", 1], ["mirembajtj", 2], ["overdraft", 2], ["penalitet", 2], ["sa kushton", 2], ["bankomat", 1]],
  loan_info: [["kredi", 2], ["hua", 2], ["hipotek", 2], ["kamat", 2], ["norma e interesit", 2], ["huamarrje", 2]],
};

/** Merge any number of per-language lexicons into one per intent. */
export function union(...lexicons) {
  const out = {};
  for (const lex of lexicons) for (const [intent, list] of Object.entries(lex)) (out[intent] ??= []).push(...list);
  return out;
}

/** v1 only knew a few dozen obvious English words (and some shared cognates such as "password"). */
export const V1_EN = {
  card_lost: [["lost", 1], ["stolen", 1], ["missing", 1], ["misplaced", 1], ["wallet", 1], ["block", 1], ["freeze", 1]],
  fraud: [["fraud", 1], ["unauthori", 1], ["scam", 1], ["hacked", 1], ["phishing", 1], ["suspicious", 1]],
  account_access: [["password", 1], ["login", 1], ["log in", 1], ["locked", 1], ["otp", 1], ["reset", 1], ["sign in", 1]],
  payment_issue: [["payment", 1], ["transfer", 1], ["declined", 1], ["pending", 1], ["failed", 1], ["twice", 1], ["sepa", 1]],
  fees: [["fee", 1], ["charge", 1], ["commission", 1], ["overdraft", 1], ["cost", 1]],
  loan_info: [["loan", 1], ["mortgage", 1], ["borrow", 1], ["interest", 1]],
};
