/**
 * Détecte les requêtes que la garde multi-tenant ne peut pas protéger.
 *
 *   npm run verif:requetes
 *
 * Analyse statique : lit les fichiers, n'exécute rien, ne touche pas la base.
 * Utilisable en pré-commit et en intégration continue.
 *
 * ── Pourquoi ce script existe ───────────────────────────────────────────────
 *
 * `next.config.ts` porte `typescript: { ignoreBuildErrors: true }`. C'est ce
 * qui permet de déployer malgré les erreurs de typage de la couture
 * multi-tenant — et c'est aussi ce qui a laissé partir en production un
 * `prisma.product.findUnique({ where: { sku } })` que `tsc` avait pourtant
 * signalé. Il n'a explosé qu'au moment où un marchand a créé un article.
 *
 * Tant que cette ligne est là, le typage ne protège de rien. Ce script remet
 * un filet sur les deux angles morts connus, décrits dans ARCHITECTURE-SAAS.md
 * §3 « Ce que la garde ne couvre pas ».
 *
 * ── Ce qu'il cherche ────────────────────────────────────────────────────────
 *
 * 1. **`findUnique` sur un champ devenu composite.** `sku`, `phone`, `email`,
 *    `reference`… ne sont plus uniques seuls : la contrainte est
 *    `@@unique([tenantId, …])`. La garde injecte `tenantId`, mais `findUnique`
 *    n'accepte que la clé primaire ou le couple nommé — deux champs séparés ne
 *    forment pas une clé composite, et Prisma lève à l'exécution.
 *    Correctif : `findFirst`, qui accepte des filtres non uniques.
 *
 * 2. **`$queryRaw` sans `tenantId`.** La garde ne voit pas le SQL brut. Une
 *    requête qui l'oublie lit les données de toutes les boutiques, sans lever
 *    la moindre erreur — c'est la fuite silencieuse.
 *
 * La liste des champs composites est **dérivée du schéma**, jamais recopiée :
 * ajouter une contrainte étend la détection sans toucher à ce fichier.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const RACINE = process.cwd();
const SCHEMA = join(RACINE, "prisma", "schema.prisma");
const SOURCES = join(RACINE, "src");

/** Champs placés sous une contrainte `@@unique([tenantId, …])`. */
function champsComposites() {
  const schema = readFileSync(SCHEMA, "utf8");
  const champs = new Set();
  for (const m of schema.matchAll(/@@unique\(\[tenantId,\s*([^\]]+)\]\)/g)) {
    for (const champ of m[1].split(",")) champs.add(champ.trim());
  }
  return champs;
}

function fichiers(dossier) {
  const sortie = [];
  for (const entree of readdirSync(dossier)) {
    const chemin = join(dossier, entree);
    if (statSync(chemin).isDirectory()) sortie.push(...fichiers(chemin));
    else if (/\.tsx?$/.test(entree)) sortie.push(chemin);
  }
  return sortie;
}

const composites = champsComposites();
const problemes = [];

for (const chemin of fichiers(SOURCES)) {
  const contenu = readFileSync(chemin, "utf8");
  const lignes = contenu.split("\n");
  const court = relative(RACINE, chemin).replace(/\\/g, "/");

  lignes.forEach((ligne, index) => {
    // ---------------------------------------- 1. findUnique sur composite
    const appel = ligne.match(/\b(prisma|tx)\.(\w+)\.findUnique/);
    if (appel) {
      /*
       * Le `where` peut s'étaler sur plusieurs lignes. Quatre suffisent en
       * pratique, et regarder plus loin ferait remonter le `where` de l'appel
       * suivant — un faux positif est plus coûteux qu'un oubli ici, puisqu'il
       * pousse à désactiver le script.
       */
      const bloc = lignes.slice(index, index + 4).join(" ");
      const where = bloc.match(/where:\s*\{([^}]*)\}/);
      if (where) {
        for (const champ of where[1].matchAll(/(\w+)\s*:/g)) {
          if (composites.has(champ[1])) {
            problemes.push({
              type: "findUnique",
              fichier: court,
              ligne: index + 1,
              detail:
                `${appel[2]}.findUnique filtre sur « ${champ[1]} », ` +
                `qui est sous @@unique([tenantId, ${champ[1]}]).`,
              correctif: "Remplacer findUnique par findFirst.",
            });
          }
        }
        // `where: { sku }` en écriture abrégée, sans deux-points.
        for (const champ of where[1].split(",")) {
          const nu = champ.trim();
          if (composites.has(nu)) {
            problemes.push({
              type: "findUnique",
              fichier: court,
              ligne: index + 1,
              detail:
                `${appel[2]}.findUnique filtre sur « ${nu} », ` +
                `qui est sous @@unique([tenantId, ${nu}]).`,
              correctif: "Remplacer findUnique par findFirst.",
            });
          }
        }
      }
    }

    // ------------------------------------------- 2. SQL brut sans tenantId
    if (/\$queryRaw/.test(ligne)) {
      // La requête suit sur plusieurs lignes ; on cherche le tenantId dedans.
      const bloc = lignes.slice(index, index + 25).join("\n");
      const finRequete = bloc.indexOf("`;");
      const requete = finRequete > -1 ? bloc.slice(0, finRequete) : bloc;
      if (!/tenantId/.test(requete)) {
        problemes.push({
          type: "queryRaw",
          fichier: court,
          ligne: index + 1,
          detail: "$queryRaw sans « tenantId » dans la requête.",
          correctif: 'Ajouter AND "tenantId" = ${tenantId} à la clause WHERE.',
        });
      }
    }
  });
}

console.log(
  `\nChamps sous contrainte composite : ${[...composites].sort().join(", ")}`
);
console.log(`${fichiers(SOURCES).length} fichier(s) analysé(s).\n`);

if (problemes.length === 0) {
  console.log("✅ Aucune requête à risque.\n");
  process.exit(0);
}

const parType = {
  findUnique: "findUnique sur un champ devenu composite — lève à l'exécution",
  queryRaw: "SQL brut sans filtre de tenant — fuite silencieuse entre boutiques",
};

for (const type of ["findUnique", "queryRaw"]) {
  const liste = problemes.filter((p) => p.type === type);
  if (liste.length === 0) continue;
  console.log(`\n${parType[type]}\n${"─".repeat(70)}`);
  for (const p of liste) {
    console.log(`  ${p.fichier}:${p.ligne}`);
    console.log(`     ${p.detail}`);
    console.log(`     → ${p.correctif}`);
  }
}

console.log(`\n❌ ${problemes.length} problème(s).\n`);
process.exit(1);
