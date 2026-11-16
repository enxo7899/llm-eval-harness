import { HOTLINE as H } from "../src/rubric.js";

/**
 * Reply templates per intent and language. Three styles, one per candidate:
 *  "plain"   v1: English only, short, and over-promises on fraud
 *  "careful" v2: three languages, no promises
 *  "warm"    v3: like "careful" but says "lock" / "suspend" for lost cards and is breezy about loans
 */
const careful = {
  en: {
    card_lost: `Hello, I'm sorry to hear your card is missing. Please call our 24/7 line on ${H} so we can block it straight away, or freeze it now in the Arka app under Cards. We will then send a replacement card to your address within 5 working days. Thank you for letting us know quickly.`,
    fraud: `Hello, thank you for reporting this and I'm sorry for the worry. Please call our 24/7 fraud line on ${H} so we can secure your account and block the card. Our team will investigate every disputed transaction and tell you the outcome; please do not share your PIN or one-time codes with anyone.`,
    payment_issue: `Hello, thanks for getting in touch about your payment. Please send us the payment reference and the date, and we will check its status with the receiving bank. Transfers normally settle within 1 to 2 working days, and we will update you as soon as we know more.`,
    account_access: `Hello, I'm sorry you can't get in. You can reset your access from the login screen using 'Forgot password', which will ask you to verify your identity with a one-time code. For your security we will never ask you for your password or PIN. Please contact us if the code does not arrive.`,
    fees: `Hello, thanks for your question about charges. All our fees are listed in the current fee schedule on our website and in the app under Documents. If a charge looks wrong, please send us its date and amount and we will review it with you.`,
    loan_info: `Hello, thanks for your interest in borrowing with Arka Bank. Rates and limits depend on your situation, so a loan adviser will go through the options with you; any figures we show are illustrative and not an offer. You can book a call in the app or at any branch.`,
    other: `Hello, thanks for contacting Arka Bank. Our branches are open Monday to Friday, 9:00 to 17:00, and you can find your nearest one and many answers in the Arka app. If you tell us a little more about what you need, we will point you to the right team.`,
  },
  it: {
    card_lost: `Buongiorno, ci dispiace per la carta smarrita. La preghiamo di chiamare la nostra linea attiva 24 ore su 24 allo ${H} per bloccarla subito, oppure di bloccarla dall'app Arka nella sezione Carte. Le invieremo poi una carta sostitutiva entro 5 giorni lavorativi. Grazie per averci avvisato subito.`,
    fraud: `Buongiorno, grazie per la segnalazione e ci dispiace per la preoccupazione. La preghiamo di chiamare la nostra linea antifrode attiva 24 ore su 24 allo ${H} per mettere in sicurezza il conto e bloccare la carta. Il nostro team esaminerà ogni operazione contestata e le comunicherà l'esito; non condivida con nessuno il PIN o i codici monouso.`,
    payment_issue: `Buongiorno, grazie per averci scritto riguardo al suo pagamento. La preghiamo di inviarci il riferimento del pagamento e la data, e verificheremo lo stato con la banca ricevente. I bonifici si completano di norma entro 1 o 2 giorni lavorativi e le daremo notizie appena avremo più informazioni.`,
    account_access: `Buongiorno, ci dispiace che non riesca ad accedere. Può reimpostare l'accesso dalla schermata di login con 'Password dimenticata', dove le verrà chiesto di verificare la sua identità con un codice monouso. Per la sua sicurezza non le chiederemo mai la password o il PIN. Ci contatti se il codice non arriva.`,
    fees: `Buongiorno, grazie per la sua domanda sui costi. Tutte le nostre commissioni sono indicate nel foglio informativo dei costi sul nostro sito e nell'app alla voce Documenti. Se un addebito le sembra errato, ci invii data e importo e lo verificheremo insieme a lei.`,
    loan_info: `Buongiorno, grazie per l'interesse verso un finanziamento con Arka Bank. Tassi e importi dipendono dalla sua situazione, quindi un consulente le illustrerà le opzioni; le cifre mostrate sono indicative e non costituiscono un'offerta. Può prenotare una chiamata nell'app o in qualsiasi filiale.`,
    other: `Buongiorno, grazie per aver contattato Arka Bank. Le nostre filiali sono aperte dal lunedì al venerdì, dalle 9:00 alle 17:00, e può trovare la più vicina e molte risposte nell'app Arka. Se ci spiega meglio di cosa ha bisogno, la indirizzeremo al team giusto.`,
  },
  al: {
    card_lost: `Përshëndetje, na vjen keq që karta juaj mungon. Ju lutem telefononi linjën tonë 24/7 në ${H} që ta bllokojmë menjëherë, ose bllokojeni kartën në aplikacionin Arka te Kartat. Më pas do t'ju dërgojmë një kartë të re brenda 5 ditëve pune. Faleminderit që na njoftuat shpejt.`,
    fraud: `Përshëndetje, faleminderit që e raportuat dhe na vjen keq për shqetësimin. Ju lutem telefononi linjën tonë 24/7 për mashtrime në ${H} që ta sigurojmë llogarinë dhe ta bllokojmë kartën. Ekipi ynë do të hetojë çdo transaksion të kontestuar dhe do t'ju njoftojë për rezultatin; mos ia jepni askujt PIN-in ose kodet njëpërdorimshme.`,
    payment_issue: `Përshëndetje, faleminderit që na shkruat për pagesën tuaj. Ju lutem na dërgoni referencën e pagesës dhe datën, dhe ne do ta kontrollojmë statusin me bankën pranuese. Transfertat zakonisht kryhen brenda 1 deri 2 ditëve pune dhe do t'ju njoftojmë sapo të kemi më shumë informacion.`,
    account_access: `Përshëndetje, na vjen keq që nuk mund të hyni. Mund ta rivendosni qasjen nga ekrani i hyrjes me 'Harrova fjalëkalimin', ku do t'ju kërkohet të verifikoni identitetin me një kod njëpërdorimshëm. Për sigurinë tuaj, nuk do t'ju kërkojmë kurrë fjalëkalimin ose PIN-in. Na kontaktoni nëse kodi nuk arrin.`,
    fees: `Përshëndetje, faleminderit për pyetjen tuaj rreth tarifave. Të gjitha tarifat tona janë të listuara në listën e tarifave në faqen tonë dhe në aplikacion te Dokumentet. Nëse një tarifë duket e gabuar, ju lutem na dërgoni datën dhe shumën dhe do ta shqyrtojmë me ju.`,
    loan_info: `Përshëndetje, faleminderit për interesin tuaj për huamarrje me Arka Bank. Normat dhe limitet varen nga situata juaj, kështu që një këshilltar krediti do t'i shqyrtojë opsionet me ju; shifrat që shfaqim janë ilustruese dhe jo ofertë. Mund të rezervoni një telefonatë në aplikacion ose në çdo degë.`,
    other: `Përshëndetje, faleminderit që kontaktuat Arka Bank. Degët tona janë të hapura nga e hëna në të premte, 9:00 deri 17:00, dhe degën më të afërt e gjeni në aplikacionin Arka. Nëse na tregoni pak më shumë, do t'ju drejtojmë te ekipi i duhur.`,
  },
};

const plain = {
  card_lost: `Hello, please call ${H} as soon as possible and we will block your lost or stolen card for you. Thank you for contacting Arka Bank.`,
  fraud: `Hello, thank you for reporting this. Please call ${H} and we will secure your account and block your card. We guarantee a full refund of every unauthorised transaction.`,
  payment_issue: `Hello, thanks for your message. Please send us the payment reference and we will check it; payments normally arrive within 1 to 2 working days. Thank you.`,
  account_access: `Hello, please use the Forgot password link on the login screen to reset your access and verify your identity with a code. Thank you for your patience.`,
  fees: `Hello, thanks for asking. Our fee schedule is available on our website and in the app, and we can review any charge you do not understand. Thank you.`,
  loan_info: `Hello, thanks for your interest in a loan. A loan adviser will contact you with illustrative figures. Thank you for choosing Arka Bank.`,
  other: `Hello, thank you for contacting Arka Bank. Our branches are open Monday to Friday and the app has many answers. Our team is happy to help.`,
};

const warm = {
  en: {
    ...careful.en,
    card_lost: `Hello, I'm sorry to hear your card is missing. We can temporarily lock it right now: please call ${H} or use the Arka app under Cards. A replacement card will follow within 5 working days. Thank you for telling us so quickly.`,
    loan_info: `Hello, thanks for your interest in borrowing with Arka Bank. Based on what you tell us you are almost certainly eligible, so apply today and a loan adviser will confirm the figures, which are illustrative. You can apply in the app or at any branch.`,
  },
  it: {
    ...careful.it,
    card_lost: `Buongiorno, ci dispiace per la carta smarrita. Possiamo sospenderla temporaneamente subito: chiami lo ${H} oppure usi l'app Arka nella sezione Carte. Una carta sostitutiva arriverà entro 5 giorni lavorativi. Grazie per averci avvisato così in fretta.`,
    loan_info: `Buongiorno, grazie per l'interesse verso un finanziamento con Arka Bank. Da quanto ci scrive è quasi certamente idoneo, quindi faccia domanda oggi e un consulente confermerà le cifre, che sono indicative. Può richiederlo nell'app o in qualsiasi filiale.`,
  },
  al: {
    ...careful.al,
    card_lost: `Përshëndetje, na vjen keq që karta juaj mungon. Mund ta pezullojmë përkohësisht menjëherë: ju lutem telefononi ${H} ose përdorni aplikacionin Arka te Kartat. Një kartë e re do të vijë brenda 5 ditëve pune. Faleminderit që na njoftuat kaq shpejt.`,
    loan_info: `Përshëndetje, faleminderit për interesin tuaj për huamarrje me Arka Bank. Nga ajo që na shkruani jeni pothuajse sigurisht i përshtatshëm, prandaj aplikoni sot dhe një këshilltar krediti do t'i konfirmojë shifrat, që janë ilustruese. Mund të aplikoni në aplikacion ose në çdo degë.`,
  },
};

/**
 * Draft a reply.
 * @param {"plain"|"careful"|"warm"} style
 * @param {string} intent
 * @param {"en"|"it"|"al"} lang
 */
export function draftReply(style, intent, lang) {
  if (style === "plain") return plain[intent];
  const set = style === "warm" ? warm : careful;
  return set[lang][intent];
}
