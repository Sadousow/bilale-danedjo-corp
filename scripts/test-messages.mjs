/**
 * Tests des gabarits de messages et de la validation des destinataires.
 *
 * Ce qui est vérifié ici est ce qu'on ne voit pas en relisant : un nom de
 * boutique qui contient un chevron, un client qui s'est inscrit avec un
 * guillemet dans son nom, un montant qui arrive en chaîne de caractères.
 * Ces cas-là ne se remarquent qu'une fois le message parti.
 *
 *   npm run test:messages
 */

import {
  escapeHtml,
  formatGNF,
  passwordReset,
  orderConfirmation,
  orderAlert,
  subscriptionReminder,
  emailVerification,
  accountRecovery,
  mailColors,
  PLATFORM_COLORS,
} from "../src/lib/messaging/templates.ts";
import { isEmail, safeHeaderName } from "../src/lib/messaging/channel.ts";

let passed = 0;
const failures = [];

function check(label, condition) {
  if (condition) passed += 1;
  else failures.push(label);
}

// --------------------------------------------------------------- échappement

check("chevrons échappés", escapeHtml("<script>") === "&lt;script&gt;");
check("guillemets échappés", escapeHtml('a"b') === "a&quot;b");
check("apostrophes échappées", escapeHtml("l'ami") === "l&#39;ami");
check("esperluette échappée en premier", escapeHtml("&lt;") === "&amp;lt;");
check("null devient vide", escapeHtml(null) === "");
check("undefined devient vide", escapeHtml(undefined) === "");

// ------------------------------------------------------------------ montants

check("montant entier", formatGNF(150000).startsWith("150"));
check("montant arrondi", formatGNF(1500.7) === formatGNF(1501));
check("montant nul", formatGNF(0) === "0 GNF");
check("montant absent", formatGNF(undefined) === "0 GNF");
check("montant textuel", formatGNF("abc") === "0 GNF");
check("unité toujours présente", formatGNF(42).endsWith("GNF"));

// ------------------------------------------ injection via les données métier

const hostile = '<img src=x onerror="alert(1)">';

const reset = passwordReset({
  shopName: hostile,
  name: hostile,
  url: "https://boutique.test/mot-de-passe?jeton=abc",
  minutes: 60,
});

check("nom de boutique hostile échappé", !reset.html.includes("<img src=x"));
check("nom hostile échappé dans le HTML", !reset.html.includes("onerror=\"alert"));
check("le lien reste intact", reset.html.includes("jeton=abc"));
check("objet du message renseigné", reset.subject.length > 0);
check("le texte brut contient le lien", reset.text.includes("https://boutique.test"));
check("le texte brut annonce l'expiration", reset.text.includes("60 minutes"));
check(
  "le texte brut rassure en cas de demande non sollicitée",
  reset.text.toLowerCase().includes("ignorez ce message")
);

const order = orderConfirmation({
  shopName: "Boutique <b>",
  customerName: "Mamadou \"le grand\"",
  reference: "CMD-2026-0001",
  lines: [
    { name: 'Riz <script>alert(1)</script>', quantity: 2, total: 570000 },
    { name: "Huile 5 L", quantity: 1, total: 85000 },
  ],
  total: 655000,
  url: "https://boutique.test/commande/abc",
});

check("nom de produit hostile échappé", !order.html.includes("<script>alert"));
check("guillemets du client échappés", !order.html.includes('"le grand"'));
check("les deux lignes sont présentes", order.text.includes("Riz") && order.text.includes("Huile"));
check("quantités dans le texte brut", order.text.includes("2 ×"));
check("total dans le texte brut", order.text.includes("655"));
check("référence dans l'objet", order.subject.includes("CMD-2026-0001"));

const alert = orderAlert({
  shopName: "Bilale",
  reference: "CMD-2026-0002",
  customerName: "Aïssatou",
  customerPhone: "+224 620 00 00 00",
  total: 90000,
  url: "https://boutique.test/admin/commandes/abc",
});

check("le téléphone du client est dans le texte", alert.text.includes("620 00 00 00"));
check("montant dans l'objet de l'alerte", alert.subject.includes("90"));
check("lien vers le back-office", alert.text.includes("/admin/commandes/"));

// ----------------------------------------------------------- abonnements

const echeance = subscriptionReminder({
  shopName: "Bilale",
  notice: "echeance",
  amount: 350000,
  dueDate: "1 septembre 2026",
  url: "https://bilale.test/admin/abonnement",
});
const impaye = subscriptionReminder({
  shopName: "Bilale",
  notice: "impaye",
  amount: 350000,
  dueDate: "1 septembre 2026",
  url: "https://bilale.test/admin/abonnement",
  graceDays: 7,
});
const suspension = subscriptionReminder({
  shopName: "Bilale",
  notice: "suspension",
  amount: 350000,
  dueDate: "1 septembre 2026",
  url: "https://bilale.test/admin/abonnement",
});

check("les trois avis ont des objets distincts",
  new Set([echeance.subject, impaye.subject, suspension.subject]).size === 3);
check("l'échéance annonce la date", echeance.text.includes("1 septembre 2026"));
check("l'impayé annonce le délai de grâce", impaye.text.includes("7 jours"));
check(
  "l'impayé rassure sur la caisse",
  impaye.text.toLowerCase().includes("caisse") &&
    impaye.text.toLowerCase().includes("accessible")
);
check(
  "la suspension rassure sur les données",
  suspension.text.toLowerCase().includes("données sont intactes")
);
check("chaque avis porte le lien de règlement",
  [echeance, impaye, suspension].every((m) => m.text.includes("/admin/abonnement")));

// -------------------------------------------- confirmation et récupération

const verif = emailVerification({
  shopName: hostile,
  name: hostile,
  url: "https://boutique.test/compte/verification?jeton=xyz",
  hours: 48,
});

check("confirmation : nom hostile échappé", !verif.html.includes("<img src=x"));
check("confirmation : lien présent dans le texte", verif.text.includes("jeton=xyz"));
check("confirmation : durée annoncée", verif.text.includes("48 heures"));

const recovery = accountRecovery({
  shopName: "Bilale",
  name: "Aïssatou",
  url: "https://boutique.test/compte/mot-de-passe?jeton=xyz",
});

check("récupération : lien présent", recovery.text.includes("jeton=xyz"));
check(
  "récupération : usage unique annoncé",
  recovery.text.toLowerCase().includes("une seule fois") ||
    recovery.text.toLowerCase().includes("qu'une fois")
);
check(
  "récupération : rassure celui qui n'a rien demandé",
  recovery.text.toLowerCase().includes("rien ne change")
);
/*
 * Le message ne doit rien révéler du compte visé — ni commandes, ni solde.
 * Tant que le lien n'est pas ouvert, on ignore qui a demandé : si c'est un
 * intrus, il ne doit rien apprendre de ce qu'il vient de déclencher.
 */
check(
  "récupération : ne divulgue ni solde ni historique",
  !/solde|crédit|commande n|historique de/i.test(recovery.text)
);

// ------------------------------------------------- couleurs du marchand

const rouge = mailColors("#B91C1C", "#F59E0B");

check("palette du marchand appliquée", rouge.primary === "#B91C1C");
check("couleur invalide ignorée", mailColors("rouge", null).primary === PLATFORM_COLORS.primary);
check("couleur vide ignorée", mailColors("", "").accent === PLATFORM_COLORS.accent);
/*
 * Ces couleurs viennent des réglages d'un marchand et entrent dans un
 * attribut `style`. Une valeur qui refermerait l'attribut permettrait d'en
 * ouvrir un autre — voire d'insérer du contenu dans le message.
 */
check(
  "injection dans l'attribut style refusée",
  mailColors('#fff;" onload="x', null).primary === PLATFORM_COLORS.primary
);
check(
  "fermeture de balise refusée",
  mailColors("</style><script>", null).primary === PLATFORM_COLORS.primary
);

const colore = passwordReset({
  colors: rouge,
  shopName: "Boutique",
  name: "Aïssatou",
  url: "https://x.test/a",
  minutes: 60,
});
check("le message porte la couleur du marchand", colore.html.includes("#B91C1C"));
check(
  "le message ne porte plus celle de la plateforme",
  !colore.html.includes(PLATFORM_COLORS.primary)
);

const parDefaut = passwordReset({
  shopName: "Boutique",
  name: "A",
  url: "https://x.test/a",
  minutes: 60,
});
check(
  "sans palette, celle de la plateforme s'applique",
  parDefaut.html.includes(PLATFORM_COLORS.primary)
);

// ------------------------------------------------------------- destinataires

check("adresse valide", isEmail("a@b.co"));
check("adresse avec sous-domaine", isEmail("jean.dupont@mail.example.com"));
check("adresse sans arobase refusée", !isEmail("ab.co"));
check("adresse sans domaine refusée", !isEmail("a@b"));
check("adresse avec espace refusée", !isEmail("a b@c.co"));
check("adresse vide refusée", !isEmail(""));
check("adresse nulle refusée", !isEmail(null));
check("adresse démesurée refusée", !isEmail(`${"a".repeat(250)}@b.co`));

// --------------------------------------- injection d'en-tête via le nom

check(
  "retour chariot retiré du nom d'expéditeur",
  !safeHeaderName("Bilale\r\nBcc: voleur@mal.com").includes("\r")
);
check(
  "saut de ligne retiré",
  !safeHeaderName("Bilale\nBcc: voleur@mal.com").includes("\n")
);
check(
  "chevrons retirés du nom d'expéditeur",
  safeHeaderName("Bilale <faux@mal.com>") === "Bilale faux@mal.com"
);
check("guillemets retirés", !safeHeaderName('Bou"tique').includes('"'));
check("nom tronqué", safeHeaderName("a".repeat(200)).length === 78);
check("nom vide toléré", safeHeaderName(null) === "");

// ------------------------------------------------------------------ verdict

console.log(`\n${passed} vérifications réussies`);
if (failures.length) {
  console.error(`\n${failures.length} échec(s) :`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log("Tout est au vert.\n");
