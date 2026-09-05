/**
 * Réparation de l'historique des migrations — le conflit `Settings.slogan`.
 *
 *   node scripts/reparer-mig2.mjs              # simulation, n'écrit rien
 *   node scripts/reparer-mig2.mjs --appliquer  # applique réellement
 *
 * ── Le problème ────────────────────────────────────────────────────────────
 *
 * `20260811225612_mig2` a été générée par Prisma et appliquée le 11 août à
 * 22:56. `20260811160000_plateforme` a été écrite à la main 22 minutes plus
 * tard, avec un timestamp choisi plus ancien — elle se classe donc AVANT dans
 * l'ordre alphabétique, alors qu'elle a été appliquée APRÈS.
 *
 * Les deux ajoutent `Settings.slogan`. En base, l'ordre chronologique les rend
 * compatibles : mig2 crée la colonne, plateforme la redemande avec
 * `IF NOT EXISTS` et ne fait rien. Mais la base fantôme de `prisma migrate dev`
 * rejoue par ordre de NOM : plateforme crée la colonne, puis mig2 la redemande
 * SANS `IF NOT EXISTS`. Erreur P3006, et `migrate dev` inutilisable.
 *
 * ── Le correctif ───────────────────────────────────────────────────────────
 *
 * Rendre les deux `ADD COLUMN` de mig2 idempotents, exactement comme le fait
 * déjà `plateforme`. Vérifié en rejouant les 16 migrations contre un Postgres
 * neuf : l'ordre alphabétique corrigé et l'ordre chronologique produisent des
 * schémas identiques — 333 colonnes, 351 contraintes, 100 index, 14
 * énumérations, aucune différence.
 *
 * ── Pourquoi ce script, et pas juste un coup d'éditeur ──────────────────────
 *
 * Prisma stocke une somme SHA-256 de chaque migration dans `_prisma_migrations`.
 * Modifier le fichier seul rend cette somme fausse, et Prisma réagit alors en
 * proposant de RÉINITIALISER LA BASE — « All data will be lost ». Sur une base
 * de production, c'est le pire scénario possible.
 *
 * Le fichier et la somme doivent donc changer ensemble. C'est tout ce que fait
 * ce script : une seule ligne d'`UPDATE`, sur une table de métadonnées. Aucune
 * table métier n'est touchée, aucun schéma modifié.
 *
 * ⚠️ À lancer une fois par environnement ayant cet historique.
 */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

import { PrismaClient } from "@prisma/client";

const MIGRATION = "20260811225612_mig2";
const FICHIER = `prisma/migrations/${MIGRATION}/migration.sql`;

const AVANT = `ALTER TABLE "Settings" ADD COLUMN     "slogan" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "whatsappNumber" TEXT NOT NULL DEFAULT '';`;

const APRES = `ALTER TABLE "Settings" ADD COLUMN IF NOT EXISTS "slogan" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Settings" ADD COLUMN IF NOT EXISTS "whatsappNumber" TEXT NOT NULL DEFAULT '';`;

const APPLIQUER = process.argv.includes("--appliquer");
const prisma = new PrismaClient();

/** Somme telle que Prisma la calcule : SHA-256 du script, hexadécimal minuscule. */
function somme(contenu) {
  return createHash("sha256").update(contenu, "utf8").digest("hex");
}

async function main() {
  const brut = readFileSync(FICHIER, "utf8");

  // Fins de ligne normalisées : Prisma accepte les trois variantes à la
  // vérification, on stocke donc la version Unix, stable quel que soit git.
  const actuel = brut.replace(/\r\n/g, "\n");
  const attendu = AVANT.replace(/\r\n/g, "\n");

  const [ligne] = await prisma.$queryRaw`
    SELECT migration_name, checksum, finished_at
    FROM "_prisma_migrations"
    WHERE migration_name = ${MIGRATION}
  `;

  if (!ligne) {
    console.error(
      `\n« ${MIGRATION} » n'est pas enregistrée dans cette base.\n` +
        `Rien à réparer ici — cet environnement a un autre historique.`
    );
    process.exit(1);
  }
  if (!ligne.finished_at) {
    console.error(
      `\n« ${MIGRATION} » est enregistrée mais INACHEVÉE.\n` +
        `Régler cela d'abord, avec « prisma migrate resolve ». Rien n'a été écrit.`
    );
    process.exit(1);
  }

  if (!actuel.includes(attendu)) {
    if (actuel.includes(APRES.replace(/\r\n/g, "\n"))) {
      const attenduApres = somme(actuel);
      const aJour = ligne.checksum === attenduApres;
      console.log(
        `\nLe fichier est déjà corrigé.\n` +
          `Somme en base : ${aJour ? "à jour ✅" : "PÉRIMÉE ⚠"}`
      );
      if (!aJour) {
        console.log(
          `\n  en base : ${ligne.checksum}\n  fichier : ${attenduApres}\n` +
            (APPLIQUER
              ? "\n  Mise à jour…"
              : "\n  Relancer avec --appliquer pour corriger la somme.")
        );
        if (APPLIQUER) {
          await prisma.$executeRaw`
            UPDATE "_prisma_migrations" SET checksum = ${attenduApres}
            WHERE migration_name = ${MIGRATION}
          `;
          console.log("  ✅ Somme mise à jour.");
        }
      }
      return;
    }
    console.error(
      `\nLe fichier ne contient pas le bloc attendu.\n` +
        `Il a été modifié autrement, ou Prisma l'a formaté différemment.\n` +
        `Rien n'a été écrit — inspecter ${FICHIER} à la main.`
    );
    process.exit(1);
  }

  const ancienneSomme = somme(actuel);
  const corrige = actuel.replace(attendu, APRES);
  const nouvelleSomme = somme(corrige);

  console.log(`\nMigration      : ${MIGRATION}`);
  console.log(`Somme en base  : ${ligne.checksum}`);
  console.log(`Somme fichier  : ${ancienneSomme} ${ligne.checksum === ancienneSomme ? "(concordent ✅)" : "(divergent ⚠)"}`);
  console.log(`Après correctif: ${nouvelleSomme}`);

  console.log("\nRemplacement :\n");
  for (const l of AVANT.split("\n")) console.log(`  - ${l}`);
  for (const l of APRES.split("\n")) console.log(`  + ${l}`);

  if (!APPLIQUER) {
    console.log(
      "\nSimulation — rien n'a été écrit, ni sur le disque ni en base.\n" +
        "Relancer avec --appliquer pour effectuer les deux changements.\n"
    );
    return;
  }

  /*
   * Ordre imposé : le fichier d'abord, la somme ensuite.
   *
   * Si l'écriture disque échoue, la base garde l'ancienne somme et reste
   * cohérente avec l'ancien fichier. L'inverse — somme mise à jour, fichier
   * inchangé — laisserait Prisma convaincu que le fichier a été altéré, donc
   * en position de proposer une réinitialisation.
   */
  writeFileSync(FICHIER, corrige, "utf8");
  console.log("\n  ✅ Fichier corrigé.");

  await prisma.$executeRaw`
    UPDATE "_prisma_migrations" SET checksum = ${nouvelleSomme}
    WHERE migration_name = ${MIGRATION}
  `;
  console.log("  ✅ Somme de contrôle mise à jour en base.");

  const [verif] = await prisma.$queryRaw`
    SELECT checksum FROM "_prisma_migrations" WHERE migration_name = ${MIGRATION}
  `;
  console.log(
    verif.checksum === nouvelleSomme
      ? "  ✅ Vérification : la base et le fichier concordent."
      : "  ⚠ Vérification : la somme en base ne correspond pas. À inspecter."
  );

  console.log(
    "\nÀ faire ensuite :\n" +
      "  node scripts/diagnostic-migrations.mjs   # doit annoncer 0 fichier modifié\n" +
      "  npx prisma migrate dev --create-only     # doit ne plus lever P3006\n"
  );
}

main()
  .catch((e) => {
    console.error("\nÉchec :", e.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
