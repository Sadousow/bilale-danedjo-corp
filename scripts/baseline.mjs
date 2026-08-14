/**
 * Baseline d'une base existante.
 *
 *   node scripts/baseline.mjs
 *
 * Prisma refuse d'appliquer des migrations sur une base déjà peuplée qu'il
 * n'a jamais suivie (erreur P3005). Ce script règle le problème :
 *
 *   1. il lit la structure ACTUELLE de la base (pas le schema.prisma)
 *   2. il en fait une migration `0_init`
 *   3. il la marque comme déjà appliquée — elle ne sera jamais rejouée ici
 *
 * Ensuite, `npx prisma migrate deploy` applique la migration multi-tenant.
 *
 * Le script passe par l'API Node plutôt que par une redirection shell :
 * sous PowerShell, `>` écrit en UTF-16 et Prisma ne sait pas relire le
 * fichier obtenu.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const DIR = join("prisma", "migrations", "0_init");
const FILE = join(DIR, "migration.sql");

function run(args) {
  return execFileSync("npx", args, {
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
    shell: process.platform === "win32",
  });
}

if (existsSync(FILE)) {
  console.log(`${FILE} existe déjà — étape ignorée.`);
} else {
  console.log("→ Lecture de la structure actuelle de la base…");

  const sql = run([
    "prisma",
    "migrate",
    "diff",
    "--from-empty",
    "--to-schema-datasource",
    "prisma/schema.prisma",
    "--script",
  ]);

  if (!sql.trim()) {
    console.error(
      "La base semble vide. Dans ce cas, pas besoin de baseline :\n" +
        "  npx prisma migrate deploy"
    );
    process.exit(1);
  }

  mkdirSync(DIR, { recursive: true });
  // Écriture en UTF-8 sans BOM.
  writeFileSync(FILE, sql, { encoding: "utf8" });
  console.log(`   ${FILE} écrit (${sql.split("\n").length} lignes).`);
}

console.log("→ Marquage de 0_init comme déjà appliquée…");
console.log(run(["prisma", "migrate", "resolve", "--applied", "0_init"]));

console.log("✅ Baseline terminée.");
console.log("   Lancez maintenant : npx prisma migrate deploy");
