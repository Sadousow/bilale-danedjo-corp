/**
 * Tests de la console plateforme — filtres, recherche, comptages.
 *
 * Aucune base : `console-filters.ts` est pur, ce qui est précisément la
 * raison pour laquelle il a été séparé de `platform-shops.ts`. On teste ici
 * la logique de tri que voit l'équipe, pas le SQL.
 *
 *   npx tsx scripts/test-console.mjs
 */

import {
  countByFilter,
  filterLabels,
  filterShops,
  parseFilter,
  alertLabels,
} from "../src/lib/console-filters.ts";

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

function shop(over = {}) {
  return {
    id: over.id ?? "t1",
    slug: over.slug ?? "boutique",
    name: over.name ?? "Boutique",
    tenantStatus: over.tenantStatus ?? "ACTIF",
    createdAt: over.createdAt ?? new Date("2026-01-01"),
    host: over.host ?? null,
    published: over.published ?? true,
    contact: over.contact ?? { phone: "", email: "" },
    subscription:
      over.subscription === undefined
        ? {
            status: "ACTIF",
            planName: "Boutique",
            priceMonthly: 150000,
            currentPeriodEnd: new Date("2026-09-01"),
            daysLeft: 20,
          }
        : over.subscription,
    counts: over.counts ?? { users: 1, products: 4, orders: 0, sales: 3 },
    lastActivity: over.lastActivity ?? new Date("2026-08-10"),
    unpaid: over.unpaid ?? 0,
    alerts: over.alerts ?? [],
  };
}

const names = (rows) => rows.map((r) => r.name);

// ------------------------------------------------------------- vocabulaire

console.log("\nVocabulaire");
check("parseFilter accepte un filtre connu", parseFilter("essai"), "essai");
check("parseFilter refuse l'inconnu", parseFilter("nimportequoi"), "tout");
check("parseFilter tolère l'absence", parseFilter(undefined), "tout");
// Un filtre sans libellé s'afficherait vide dans la barre.
check(
  "tout filtre a un libellé",
  Object.values(filterLabels).every((l) => l.length > 0),
  true
);
check(
  "toute alerte a un libellé",
  Object.values(alertLabels).every((l) => l.length > 0),
  true
);

// ------------------------------------------------------------------ filtres

console.log("Filtres");

const catalogue = [
  shop({ id: "a", name: "Vroomer", slug: "vroomer" }),
  shop({
    id: "b",
    name: "Essai Kankan",
    slug: "kankan",
    subscription: {
      status: "ESSAI",
      planName: "Démarrage",
      priceMonthly: 0,
      currentPeriodEnd: new Date("2026-08-15"),
      daysLeft: 4,
    },
    alerts: ["essai-bientot-fini"],
  }),
  shop({
    id: "c",
    name: "Impayée Labé",
    slug: "labe",
    subscription: {
      status: "IMPAYE",
      planName: "Boutique",
      priceMonthly: 150000,
      currentPeriodEnd: new Date("2026-08-01"),
      daysLeft: -10,
    },
    unpaid: 1,
    alerts: ["impaye"],
  }),
  shop({
    id: "d",
    name: "Fermée par la plateforme",
    slug: "ferme",
    tenantStatus: "SUSPENDU",
    alerts: [],
  }),
  shop({
    id: "e",
    name: "Jamais ouverte",
    slug: "brouillon",
    published: false,
    alerts: ["jamais-publiee", "sans-vente"],
  }),
];

check("tout", names(filterShops(catalogue, { filter: "tout" })).length, 5);
check("essai", names(filterShops(catalogue, { filter: "essai" })), [
  "Essai Kankan",
]);
check("actif", names(filterShops(catalogue, { filter: "actif" })), [
  "Vroomer",
  "Fermée par la plateforme",
  "Jamais ouverte",
]);
check("impayé", names(filterShops(catalogue, { filter: "impaye" })), [
  "Impayée Labé",
]);
// Le point du filtre : la suspension administrative n'est pas visible dans le
// statut d'abonnement, et c'est exactement le cas qu'on cherche.
check("suspendu attrape la fermeture manuelle", names(filterShops(catalogue, { filter: "suspendu" })), [
  "Fermée par la plateforme",
]);
check(
  "jamais publiée",
  names(filterShops(catalogue, { filter: "jamais-publiee" })),
  ["Jamais ouverte"]
);
check("à relancer", names(filterShops(catalogue, { filter: "a-relancer" })), [
  "Essai Kankan",
  "Impayée Labé",
  "Jamais ouverte",
]);

// Une boutique fermée pour non-paiement doit sortir du filtre « suspendu »
// aussi, pas seulement celles fermées à la main.
const fermeeImpaye = [
  shop({
    name: "Coupée",
    subscription: {
      status: "SUSPENDU",
      planName: "Boutique",
      priceMonthly: 150000,
      currentPeriodEnd: new Date("2026-07-01"),
      daysLeft: -41,
    },
  }),
];
check(
  "suspendu attrape aussi la coupure pour impayé",
  names(filterShops(fermeeImpaye, { filter: "suspendu" })),
  ["Coupée"]
);

// ---------------------------------------------------------------- recherche

console.log("Recherche");

const cherchables = [
  shop({
    name: "Vroomer",
    slug: "vroomer",
    host: "vroomer-auto.gn",
    contact: { phone: "624390332", email: "contact@vroomer.gn" },
  }),
  shop({
    name: "Boulangerie Madina",
    slug: "madina",
    contact: { phone: "622110044", email: "madina@exemple.gn" },
  }),
];

check("par nom", names(filterShops(cherchables, { q: "vroom" })), ["Vroomer"]);
check("insensible à la casse", names(filterShops(cherchables, { q: "VROOM" })), [
  "Vroomer",
]);
check("par identifiant", names(filterShops(cherchables, { q: "madina" })), [
  "Boulangerie Madina",
]);
check("par domaine", names(filterShops(cherchables, { q: "auto.gn" })), [
  "Vroomer",
]);
check("par téléphone", names(filterShops(cherchables, { q: "622110" })), [
  "Boulangerie Madina",
]);
check("par email", names(filterShops(cherchables, { q: "@vroomer" })), [
  "Vroomer",
]);
check("espaces ignorés", names(filterShops(cherchables, { q: "  vroom  " })), [
  "Vroomer",
]);
check("recherche vide ne filtre rien", filterShops(cherchables, { q: "   " }).length, 2);
check("sans résultat", filterShops(cherchables, { q: "zzz" }).length, 0);

// Recherche et filtre se combinent : chercher dans « à relancer » ne doit pas
// ressortir une boutique saine.
check(
  "recherche + filtre",
  names(filterShops(catalogue, { filter: "a-relancer", q: "labe" })),
  ["Impayée Labé"]
);

// ---------------------------------------------------------------- comptages

console.log("Comptages");

const counts = countByFilter(catalogue);
check("tout", counts.tout, 5);
check("à relancer", counts["a-relancer"], 3);
check("essai", counts.essai, 1);
check("suspendu", counts.suspendu, 1);
check("jamais publiée", counts["jamais-publiee"], 1);
check(
  "chaque filtre est compté",
  Object.keys(filterLabels).every((f) => typeof counts[f] === "number"),
  true
);

// Le comptage doit correspondre au filtrage, sinon la pastille ment.
for (const filter of Object.keys(filterLabels)) {
  check(
    `pastille « ${filter} » cohérente avec la liste`,
    counts[filter],
    filterShops(catalogue, { filter }).length
  );
}

// -------------------------------------------------------------------- bilan

console.log(
  `\n${passed} test(s) réussi(s), ${failed} échec(s).\n`
);
process.exit(failed > 0 ? 1 : 0);
