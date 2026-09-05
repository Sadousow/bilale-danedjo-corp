/**
 * Tests du rattachement des boutiques à l'hébergeur.
 *
 * Ce que ces règles protègent : l'accessibilité d'une boutique neuve. Une
 * erreur ici ne casse rien visiblement — le marchand s'inscrit, tout paraît
 * réussi, et son adresse renvoie une erreur de certificat que lui seul
 * découvrira.
 *
 *   npm run test:domaines
 *
 * Aucune base de données, aucun réseau : logique pure.
 */

import {
  rootDomain,
  shopHost,
  decideRattachement,
} from "../src/lib/shop-domain.ts";

let passed = 0;
const failures = [];

function check(label, condition) {
  if (condition) passed += 1;
  else failures.push(label);
}

// ───────────────────────────────────────────── domaine racine

const avecRacine = (valeur, fn) => {
  const avant = process.env.NEXT_PUBLIC_ROOT_DOMAIN;
  if (valeur === undefined) delete process.env.NEXT_PUBLIC_ROOT_DOMAIN;
  else process.env.NEXT_PUBLIC_ROOT_DOMAIN = valeur;
  try { return fn(); } finally {
    if (avant === undefined) delete process.env.NEXT_PUBLIC_ROOT_DOMAIN;
    else process.env.NEXT_PUBLIC_ROOT_DOMAIN = avant;
  }
};

check("racine lue depuis l'environnement", avecRacine("guygou.com", () => rootDomain() === "guygou.com"));
check("racine mise en minuscules", avecRacine("GuyGou.COM", () => rootDomain() === "guygou.com"));
check("espaces ignorés", avecRacine("  guygou.com  ", () => rootDomain() === "guygou.com"));

/*
 * Le port est la vraie raison d'être de cette fonction. En développement la
 * variable vaut `localhost:3000` ; déclarer un nom d'hôte avec un port chez un
 * hébergeur n'a aucun sens et serait refusé.
 */
check("le port est retiré", avecRacine("localhost:3000", () => rootDomain() === "localhost"));
check("racine absente : chaîne vide", avecRacine(undefined, () => rootDomain() === ""));

// ─────────────────────────────────────────────── adresse de boutique

check("adresse composée", shopHost("bilale", "guygou.com") === "bilale.guygou.com");
check("slug en minuscules", shopHost("BILALE", "guygou.com") === "bilale.guygou.com");
check("slug avec espaces", shopHost("  demo  ", "guygou.com") === "demo.guygou.com");
check("slug vide : rien", shopHost("", "guygou.com") === null);
check("racine vide : rien", shopHost("bilale", "") === null);

// ──────────────────────────────────────── décision de rattachement

const prod = decideRattachement("bilale", "guygou.com");
check("en production : on rattache", prod.rattacher === true);
check("l'adresse à déclarer est complète", prod.rattacher && prod.host === "bilale.guygou.com");

/*
 * Le cas qui justifie toute cette fonction : sans garde, chaque inscription de
 * test en local enverrait `bilale.localhost` à l'API Vercel. Erreur à chaque
 * fois, et la liste des domaines du projet se remplit de noms qui ne
 * résoudront jamais.
 */
for (const racine of ["localhost", "lvh.me", "bilale.localhost", "127.0.0.1", "192.168.1.10"]) {
  const d = decideRattachement("bilale", racine);
  check(`racine « ${racine} » : pas de rattachement`, !d.rattacher && d.raison === "developpement-local");
}

check(
  "racine sans point : traité comme local",
  decideRattachement("bilale", "monserveur").rattacher === false
);

const sansRacine = decideRattachement("bilale", "");
check("racine absente : refus explicite", !sansRacine.rattacher && sansRacine.raison === "domaine-racine-absent");

const sansSlug = decideRattachement("", "guygou.com");
check("slug vide : refus explicite", !sansSlug.rattacher && sansSlug.raison === "slug-invalide");

/*
 * Un vrai domaine qui contient « localhost » comme sous-chaîne ne doit pas être
 * pris pour du développement. Une correspondance trop large couperait le
 * rattachement en production sans que personne ne comprenne pourquoi.
 */
check(
  "un domaine contenant « localhost » reste de la production",
  decideRattachement("bilale", "localhostshop.com").rattacher === true
);
check(
  "un domaine contenant « lvh.me » reste de la production",
  decideRattachement("bilale", "lvh.medical.com").rattacher === true
);

/* Chaque refus porte un motif exploitable : on doit pouvoir l'écrire au journal. */
const motifs = ["domaine-racine-absent", "developpement-local", "slug-invalide"];
check(
  "tout refus porte un motif connu",
  [
    decideRattachement("bilale", ""),
    decideRattachement("bilale", "localhost"),
    decideRattachement("", "guygou.com"),
  ].every((d) => !d.rattacher && motifs.includes(d.raison))
);

// ─────────────────────────────────────────────────────── rapport

console.log(`\n${passed} vérification(s) réussie(s).`);
if (failures.length > 0) {
  console.error(`\n❌ ${failures.length} échec(s) :`);
  for (const f of failures) console.error(`   - ${f}`);
  process.exit(1);
}
console.log("✅ Rattachement des domaines vérifié.\n");
