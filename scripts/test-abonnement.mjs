/**
 * Tests du parcours d'abonnement — règles pures, sans base.
 *
 *   npx tsx scripts/test-abonnement.mjs
 */

import {
  effectiveStatus,
  isAdminPathOpenWhenUnpaid,
  isBackOfficeOpen,
  isShopClosed,
  pendingPlanEffectiveOn,
  renewedPeriodEnd,
  subscriptionNotice,
  addDays,
  GRACE_DAYS,
  PERIOD_DAYS,
} from "../src/lib/plans.ts";

let passed = 0;
let failed = 0;

function check(name, actual, expected) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) {
    passed += 1;
  } else {
    failed += 1;
    console.error(`  ✗ ${name}\n      attendu : ${e}\n      obtenu  : ${a}`);
  }
}

const now = new Date("2026-08-14T10:00:00Z");
const future = addDays(now, 10);
const past = addDays(now, -2);
const longPast = addDays(now, -30);

// ------------------------------------------------- cycle de vie

console.log("\nCycle de vie");

check(
  "essai en cours",
  effectiveStatus({ status: "ESSAI", currentPeriodEnd: future, graceEndsAt: null }, now),
  "ESSAI"
);
check(
  "abonnement en cours",
  effectiveStatus({ status: "ACTIF", currentPeriodEnd: future, graceEndsAt: null }, now),
  "ACTIF"
);
check(
  "échéance dépassée : grâce",
  effectiveStatus({ status: "ACTIF", currentPeriodEnd: past, graceEndsAt: null }, now),
  "IMPAYE"
);
check(
  "grâce épuisée : fermeture",
  effectiveStatus({ status: "ACTIF", currentPeriodEnd: longPast, graceEndsAt: null }, now),
  "SUSPENDU"
);
// Le calcul fait autorité même si la passe quotidienne n'a pas tourné : c'est
// tout l'intérêt de recalculer à la lecture.
check(
  "statut périmé en base, recalculé juste",
  effectiveStatus({ status: "ACTIF", currentPeriodEnd: longPast, graceEndsAt: null }, now),
  "SUSPENDU"
);
check(
  "grâce explicite respectée",
  effectiveStatus(
    { status: "IMPAYE", currentPeriodEnd: longPast, graceEndsAt: addDays(now, 2) },
    now
  ),
  "IMPAYE"
);
check(
  "résilié reste résilié",
  effectiveStatus({ status: "RESILIE", currentPeriodEnd: future, graceEndsAt: null }, now),
  "RESILIE"
);
check("GRACE_DAYS inchangé", GRACE_DAYS, 7);

// ------------------------------------------------- ce qui ferme, ce qui reste

console.log("Ce qui ferme");

check("vitrine ouverte en essai", isShopClosed("ESSAI"), false);
check("vitrine ouverte pendant la grâce", isShopClosed("IMPAYE"), false);
check("vitrine fermée après la grâce", isShopClosed("SUSPENDU"), true);
check("vitrine fermée si résilié", isShopClosed("RESILIE"), true);

check("back-office ouvert en impayé", isBackOfficeOpen("IMPAYE"), true);
check("back-office ouvert en suspendu", isBackOfficeOpen("SUSPENDU"), true);
check("back-office fermé si résilié", isBackOfficeOpen("RESILIE"), false);

// Le cœur du correctif : le marchand fermé pour impayé doit garder l'écran
// où il paie. Sans ça, il n'a aucun moyen de se réabonner seul.
check("page abonnement accessible", isAdminPathOpenWhenUnpaid("/admin/abonnement"), true);
check("rapports accessibles", isAdminPathOpenWhenUnpaid("/admin/rapports"), true);
check(
  "sous-page de rapports accessible",
  isAdminPathOpenWhenUnpaid("/admin/rapports/ventes"),
  true
);
check("tableau de bord fermé", isAdminPathOpenWhenUnpaid("/admin"), false);
check("produits fermés", isAdminPathOpenWhenUnpaid("/admin/produits"), false);
check("apparence fermée", isAdminPathOpenWhenUnpaid("/admin/apparence"), false);
check("paramètres fermés", isAdminPathOpenWhenUnpaid("/admin/parametres"), false);
// Un chemin qui commence par le même texte ne doit pas passer.
check(
  "faux positif de préfixe refusé",
  isAdminPathOpenWhenUnpaid("/admin/abonnements-truc"),
  false
);

// ------------------------------------------------- ce qu'achète un règlement

console.log("Règlement");

// Payé à temps : la période facturée court encore, c'est elle qui fait foi.
// Sans ça, payer trois jours en avance en ferait perdre trois.
check(
  "facture payée d'avance : période inchangée",
  renewedPeriodEnd(addDays(now, 5), now),
  addDays(now, 5)
);
// Le cœur du correctif : régler un mois de retard doit acheter un mois de
// service, pas zéro jour.
check(
  "facture réglée en retard : trente jours à partir du règlement",
  renewedPeriodEnd(longPast, now),
  addDays(now, PERIOD_DAYS)
);
check(
  "facture réglée à l'échéance même : trente jours pleins",
  renewedPeriodEnd(now, now),
  addDays(now, PERIOD_DAYS)
);
check("PERIOD_DAYS inchangé", PERIOD_DAYS, 30);

// ------------------------------------------------- baisse d'offre programmée

console.log("Baisse programmée");

check(
  "échéance à venir : date annoncée",
  pendingPlanEffectiveOn(future, now),
  future
);
// Une date au passé — « prend effet le 15/07 » un 14 août — ne veut rien dire.
check("échéance passée : aucune date", pendingPlanEffectiveOn(past, now), null);

// ------------------------------------------------- messages au marchand

console.log("Messages");

const suspended = subscriptionNotice(
  { status: "SUSPENDU", currentPeriodEnd: longPast, graceEndsAt: longPast },
  now
);
check("fermeture annoncée en rouge", suspended?.tone, "danger");
check(
  "fermeture : le message dit comment rouvrir",
  suspended?.message.includes("Réglez"),
  true
);

const unpaid = subscriptionNotice(
  { status: "ACTIF", currentPeriodEnd: past, graceEndsAt: addDays(now, 3) },
  now
);
check("impayé annoncé en rouge", unpaid?.tone, "danger");
check("impayé : le délai est chiffré", unpaid?.message.includes("3 jours"), true);

const trial = subscriptionNotice(
  { status: "ESSAI", currentPeriodEnd: addDays(now, 9), graceEndsAt: null },
  now
);
check("essai tranquille : ton neutre", trial?.tone, "info");

const trialSoon = subscriptionNotice(
  { status: "ESSAI", currentPeriodEnd: addDays(now, 2), graceEndsAt: null },
  now
);
check("fin d'essai proche : ton d'alerte", trialSoon?.tone, "warning");

const calm = subscriptionNotice(
  { status: "ACTIF", currentPeriodEnd: addDays(now, 20), graceEndsAt: null },
  now
);
check("rien à signaler : aucun bandeau", calm, null);

console.log(`\n${passed} test(s) réussi(s), ${failed} échec(s).\n`);
process.exit(failed > 0 ? 1 : 0);
