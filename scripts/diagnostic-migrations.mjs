/**
 * Diagnostic de l'historique des migrations. **Lecture seule.**
 *
 *   node scripts/diagnostic-migrations.mjs
 *
 * N'exécute que des SELECT. Aucun ALTER, aucun INSERT, aucune migration
 * appliquée. Sûr à lancer sur la base de production — c'est même sa raison
 * d'être : comprendre avant de toucher.
 *
 * Ce qu'il répond :
 *
 *   1. Dans quel ordre les migrations ont RÉELLEMENT été appliquées, et si cet
 *      ordre diffère de l'ordre alphabétique des noms. C'est cette inversion
 *      qui fait échouer `prisma migrate dev` sur la base fantôme, laquelle
 *      rejoue toujours par ordre de nom.
 *   2. Si un fichier de migration a été modifié après avoir été appliqué —
 *      Prisma stocke une somme de contrôle SHA-256 du script.
 *   3. Ce qui est en attente, et ce qui a échoué ou été annulé.
 *
 * La table `_prisma_migrations` appartient à la plateforme : elle n'a pas de
 * `tenantId`, donc le `$queryRaw` ci-dessous n'a pas à en filtrer un. C'est
 * l'exception, pas la règle — tout SQL brut sur une table métier doit porter
 * son `AND "tenantId" = …` à la main.
 */
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { PrismaClient } from "@prisma/client";

const DOSSIER = "prisma/migrations";
const prisma = new PrismaClient();

/**
 * Somme de contrôle d'un script de migration.
 *
 * Prisma accepte trois variantes de fins de ligne pour une même migration —
 * « git messes with line endings », dit le commentaire de leur code. On
 * calcule donc les trois et on considère la migration intacte si l'une
 * correspond. Sur un dépôt Windows, ne tester que `\n` produirait une alerte
 * sur chaque fichier.
 */
function sommes(contenu) {
  const unix = contenu.replace(/\r\n/g, "\n");
  const windows = unix.replace(/\n/g, "\r\n");
  return new Set(
    [contenu, unix, windows].map((v) =>
      createHash("sha256").update(v, "utf8").digest("hex")
    )
  );
}

function fichiersSurDisque() {
  const map = new Map();
  for (const nom of readdirSync(DOSSIER)) {
    const chemin = join(DOSSIER, nom);
    if (!statSync(chemin).isDirectory()) continue;
    const sql = join(chemin, "migration.sql");
    try {
      map.set(nom, {
        contenu: readFileSync(sql, "utf8"),
        creeLe: statSync(chemin).mtime,
      });
    } catch {
      map.set(nom, { contenu: null, creeLe: statSync(chemin).mtime });
    }
  }
  return map;
}

function horodatage(d) {
  return d ? new Date(d).toISOString().replace("T", " ").slice(0, 19) : "—";
}

async function main() {
  const disque = fichiersSurDisque();

  const lignes = await prisma.$queryRaw`
    SELECT migration_name, checksum, started_at, finished_at,
           rolled_back_at, applied_steps_count
    FROM "_prisma_migrations"
    ORDER BY started_at ASC
  `;

  console.log(`\nBase interrogée en lecture seule. ${lignes.length} migration(s) enregistrée(s).`);

  // ---------------------------------------------------------------- 1. Ordre

  console.log("\n═══ Ordre réel d'application ═══\n");

  const nomsAlphabetiques = [...lignes]
    .map((l) => l.migration_name)
    .sort((a, b) => a.localeCompare(b));

  let inversions = 0;

  lignes.forEach((l, i) => {
    const rangAlpha = nomsAlphabetiques.indexOf(l.migration_name);
    const inverse = rangAlpha !== i;
    if (inverse) inversions += 1;

    const etat = l.rolled_back_at
      ? "ANNULÉE"
      : l.finished_at
        ? "ok"
        : "INACHEVÉE";

    console.log(
      `${String(i + 1).padStart(2)}. ${l.migration_name.padEnd(38)} ` +
        `${horodatage(l.started_at)}  ${etat.padEnd(9)}` +
        (inverse ? `  ⚠ rang alphabétique ${rangAlpha + 1}` : "")
    );
  });

  if (inversions > 0) {
    console.log(
      `\n⚠ ${inversions} migration(s) appliquées dans un ordre différent de\n` +
        `  l'ordre alphabétique de leur nom. La base fantôme de « migrate dev »\n` +
        `  rejoue par ordre de NOM : c'est là que l'historique se casse.`
    );
  } else {
    console.log("\n✅ L'ordre d'application suit l'ordre alphabétique.");
  }

  // ------------------------------------------------------ 2. Sommes de contrôle

  console.log("\n═══ Fichiers modifiés après application ═══\n");

  let modifiees = 0;
  let absentes = 0;

  for (const l of lignes) {
    const fichier = disque.get(l.migration_name);

    if (!fichier) {
      absentes += 1;
      console.log(`  ✗ ${l.migration_name} — enregistrée en base, ABSENTE du disque`);
      continue;
    }
    if (fichier.contenu === null) {
      absentes += 1;
      console.log(`  ✗ ${l.migration_name} — dossier présent, migration.sql illisible`);
      continue;
    }
    if (!sommes(fichier.contenu).has(l.checksum)) {
      modifiees += 1;
      console.log(`  ⚠ ${l.migration_name} — le fichier ne correspond plus à la somme enregistrée`);
    }
  }

  if (modifiees === 0 && absentes === 0) {
    console.log("  ✅ Tous les fichiers correspondent à ce qui a été appliqué.");
  }
  if (modifiees === lignes.length && lignes.length > 0) {
    console.log(
      "\n  Note : si TOUTES divergent, l'explication la plus probable n'est pas\n" +
        "  que tu as tout modifié, mais que le calcul de somme diffère de celui\n" +
        "  de ta version de Prisma. À ne pas surinterpréter."
    );
  }

  // -------------------------------------------------------------- 3. En attente

  console.log("\n═══ En attente d'application ═══\n");

  const enregistrees = new Set(lignes.map((l) => l.migration_name));
  const attente = [...disque.keys()]
    .filter((nom) => !enregistrees.has(nom))
    .sort((a, b) => a.localeCompare(b));

  if (attente.length === 0) {
    console.log("  Aucune. La base est à jour avec le dossier.");
  } else {
    for (const nom of attente) console.log(`  → ${nom}`);
    console.log(
      `\n  ${attente.length} migration(s) seront appliquées par\n` +
        `  « npm run db:migrate:deploy », qui n'utilise pas de base fantôme.`
    );
  }

  // ----------------------------------------------------------------- 4. Échecs

  const echouees = lignes.filter((l) => !l.finished_at || l.rolled_back_at);
  if (echouees.length > 0) {
    console.log("\n═══ Migrations inachevées ou annulées ═══\n");
    for (const l of echouees) {
      console.log(
        `  ✗ ${l.migration_name} — démarrée ${horodatage(l.started_at)}, ` +
          `${l.rolled_back_at ? "annulée " + horodatage(l.rolled_back_at) : "jamais terminée"}`
      );
    }
    console.log(
      "\n  Une migration inachevée bloque tout déploiement suivant.\n" +
        "  Elle se règle avec « prisma migrate resolve », pas en la relançant."
    );
  }

  console.log("\n═══ Conclusion ═══\n");
  console.log(`  Ordre incohérent    : ${inversions > 0 ? "OUI — migrate dev restera cassé" : "non"}`);
  console.log(`  Fichiers modifiés   : ${modifiees}`);
  console.log(`  Fichiers manquants  : ${absentes}`);
  console.log(`  En attente          : ${attente.length}`);
  console.log(`  Inachevées          : ${echouees.length}`);
  console.log("\n  Aucune écriture n'a eu lieu.\n");
}

main()
  .catch((e) => {
    console.error("\nÉchec du diagnostic :", e.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
