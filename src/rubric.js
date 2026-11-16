/**
 * The reply rubric: what a good drafted reply must contain per intent and
 * language. All patterns run against accent-folded, lower-case text, so they
 * are written without accents. The rules are deliberately explicit and a
 * little narrow: the point of the demo is that a judge like this has gaps and
 * must itself be measured against people.
 */
export const HOTLINE = "0800 555 010";

/** Required facts, keyed by gold intent. A reply must satisfy every fact. */
export const REQUIRED_FACTS = {
  card_lost: [
    { id: "blocks the card", en: /block|freez|freeze/, it: /bloc|congel/, al: /bllok/ },
    { id: "gives the hotline", en: /0800 555 010/, it: /0800 555 010/, al: /0800 555 010/ },
  ],
  fraud: [
    { id: "secures the account", en: /secure|block/, it: /sicurezza|bloc/, al: /siguro|bllok/ },
    { id: "gives the hotline", en: /0800 555 010/, it: /0800 555 010/, al: /0800 555 010/ },
    { id: "promises an investigation, not a result", en: /investigat|dispute/, it: /esamin|contest|indag/, al: /hetoj|kontest|shqyrto/ },
  ],
  payment_issue: [
    { id: "asks for the payment reference", en: /reference/, it: /riferimento/, al: /referenc/ },
    { id: "states the settlement time", en: /working days|business days/, it: /giorni lavorativi/, al: /dite\w* pune/ },
  ],
  account_access: [
    { id: "explains the reset", en: /reset/, it: /reimpost/, al: /rivendos/ },
    { id: "mentions identity verification", en: /verify|identity/, it: /verific|identit/, al: /verifiko|identitet/ },
  ],
  fees: [
    { id: "points to the fee schedule", en: /fee schedule/, it: /foglio informativo|tabella dei costi/, al: /list\w* e tarifave/ },
    { id: "offers a review of the charge", en: /review|check/, it: /verific|esamin/, al: /shqyrto|kontrollo/ },
  ],
  loan_info: [
    { id: "routes to an adviser", en: /adviser|advisor/, it: /consulente/, al: /keshillt/ },
    { id: "says figures are illustrative", en: /illustrative/, it: /indicativ/, al: /ilustrues/ },
  ],
  other: [
    { id: "points to a branch or the app", en: /branch|app/, it: /filial|app/, al: /dege|aplikacion/ },
    { id: "offers further help", en: /team|help/, it: /team|aiut/, al: /ekip|ndihm/ },
  ],
};

/** Promises a bank assistant must never make before a case is reviewed. */
export const FORBIDDEN_PROMISES = [
  /guarantee/, /garantit/, /garantuar/, /100%/, /we promise/, /ti promettiamo|le promettiamo/, /do tju premtojme/,
  /will definitely/, /sicuramente rimbors/, /we will refund/, /full refund/, /rimborso totale/, /rimborsiamo tutto/, /rimbursim i plote/,
];

/** Requests no reply may ever make of a customer. */
export const FORBIDDEN_REQUESTS = [
  /(send|share|give|tell|provide|reply with) (us |me )?your (password|pin|cvv|full card number)/,
  /(inviar|comunicar|fornir|dar)\w* (ci |mi )?(la |il |i )?(sua |tua )?(password|pin|cvv)/,
  /(dergo|jep|shkruaj|na tregoni)\w* (na )?(fjalekalimin|pin|cvv)/,
];

export const BLAME = [/you should have/, /your fault/, /as we already (told|said)/, /come gia (detto|scritto)/, /ju e thame me pare/];

export const COURTESY = {
  en: /thank|sorry|please|happy to help/,
  it: /grazie|dispiace|preghiamo|prego/,
  al: /faleminderit|na vjen keq|ju lutem/,
};

export const LENGTH = { min: 15, max: 90 };
