/**
 * Tests des règles d'offre : quotas et fonctions verrouillées.
 *
 * Ces règles décident de ce qu'un marchand obtient pour son argent. Une
 * limite qui ne s'applique pas est un manque à gagner ; une limite trop
 * stricte bloque un client qui paie. Les deux se voient mal en relisant.
 *
 *   npm run test:quotas
 */

import {
  checkQuota,
  hasFeature,
  effectiveStatus,
  isShopClosed,
  isBackOfficeOpen,
} from "../src/lib/plans.ts";

let passed = 0;
const failures = [];

function check(label, condition) {
  if (condition) passed += 1;
  else failures.push(label);
}

const labels = { singular: "produit", plural: "produits" };

// ------------------------------------------------------------------ quotas

check("sous la limite : autorisé", checkQuota(5, 100, labels).allowed);
check("juste sous la limite : autorisé", checkQuota(99, 100, labels).allowed);
/*
 * Le cas qui décide : à 100 produits sur une offre à 100, on ne doit pas
 * pouvoir en créer un 101e. Une comparaison `>` au lieu de `>=` laisserait
 * passer un produit de trop sur chaque offre.
 */
check("à la limite : refusé", !checkQuota(100, 100, labels).allowed);
check("au-dessus : refusé", !checkQuota(150, 100, labels).allowed);

check("limite 0 = illimité", checkQuota(99999, 0, labels).allowed);
check("limite négative = illimité", checkQuota(99999, -1, labels).allowed);

const refus = checkQuota(100, 100, labels);
check("le refus explique la limite", refus.message.includes("100"));
check("le refus nomme la ressource", refus.message.includes("produits"));
check(
  "le refus indique la sortie",
  refus.message.toLowerCase().includes("offre")
);
check("le refus renvoie l'usage", refus.used === 100 && refus.limit === 100);

// ------------------------------------------------------ fonctions de l'offre

const demarrage = {
  maxProducts: 100,
  maxUsers: 2,
  featureShop: false,
  featureInvoicing: false,
  featureDomain: false,
};
const boutique = {
  maxProducts: 500,
  maxUsers: 5,
  featureShop: true,
  featureInvoicing: true,
  featureDomain: false,
};
const pro = {
  maxProducts: 0,
  maxUsers: 0,
  featureShop: true,
  featureInvoicing: true,
  featureDomain: true,
};

check("démarrage : pas de boutique en ligne", !hasFeature(demarrage, "shop"));
check("démarrage : pas de facturation", !hasFeature(demarrage, "invoicing"));
check("démarrage : pas de domaine", !hasFeature(demarrage, "domain"));

check("boutique : vente en ligne", hasFeature(boutique, "shop"));
check("boutique : facturation", hasFeature(boutique, "invoicing"));
/*
 * Le domaine personnalisé est la seule fonction réservée à l'offre la plus
 * chère. Le contrôle manquait dans l'action d'ajout : n'importe quel
 * marchand pouvait brancher le sien depuis l'offre la moins chère.
 */
check("boutique : pas de domaine personnalisé", !hasFeature(boutique, "domain"));

check("pro : tout ouvert", ["shop", "invoicing", "domain"].every((f) => hasFeature(pro, f)));
check("pro : produits illimités", checkQuota(10000, pro.maxProducts, labels).allowed);
check("pro : utilisateurs illimités", checkQuota(500, pro.maxUsers, labels).allowed);

// ------------------------------------------------------- cycle de vie

const jour = 86400_000;
const hier = new Date(Date.now() - jour);
const demain = new Date(Date.now() + jour);
const ilYaDixJours = new Date(Date.now() - 10 * jour);

check(
  "essai en cours reste en essai",
  effectiveStatus({ status: "ESSAI", currentPeriodEnd: demain, graceEndsAt: null }) === "ESSAI"
);
check(
  "abonnement à jour reste actif",
  effectiveStatus({ status: "ACTIF", currentPeriodEnd: demain, graceEndsAt: null }) === "ACTIF"
);
check(
  "échéance dépassée : impayé",
  effectiveStatus({ status: "ACTIF", currentPeriodEnd: hier, graceEndsAt: null }) === "IMPAYE"
);
check(
  "grâce épuisée : suspendu",
  effectiveStatus({ status: "ACTIF", currentPeriodEnd: ilYaDixJours, graceEndsAt: hier }) ===
    "SUSPENDU"
);
check(
  "résilié le reste",
  effectiveStatus({ status: "RESILIE", currentPeriodEnd: demain, graceEndsAt: null }) === "RESILIE"
);

/*
 * Un impayé ferme la vitrine mais laisse la caisse ouverte : couper l'outil
 * de travail d'un commerçant pour un retard de paiement l'empêcherait de
 * gagner de quoi payer.
 */
check("impayé : la vitrine reste ouverte", !isShopClosed("IMPAYE"));
check("impayé : la caisse reste ouverte", isBackOfficeOpen("IMPAYE"));
check("suspendu : la vitrine ferme", isShopClosed("SUSPENDU"));
check("suspendu : la caisse reste accessible", isBackOfficeOpen("SUSPENDU"));
check("résilié : la vitrine ferme", isShopClosed("RESILIE"));

// ------------------------------------------------------------------ verdict

console.log(`\n${passed} vérifications réussies`);
if (failures.length) {
  console.error(`\n${failures.length} échec(s) :`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log("Tout est au vert.\n");
