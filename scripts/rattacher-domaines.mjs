/**
 * Rattrapage des adresses de boutique chez l'hébergeur.
 *
 *   node scripts/rattacher-domaines.mjs --dry   # liste sans rien déclarer
 *   node scripts/rattacher-domaines.mjs
 *
 * ── Pourquoi ce script existe ───────────────────────────────────────────────
 *
 * Deux choses distinctes rendent une boutique joignable :
 *
 *   1. le DNS — l'enregistrement `*` chez Cloudflare fait résoudre
 *      `<slug>.guygou.com`
 *   2. le certificat — Vercel n'en présente un que pour les noms **déclarés
 *      sur le projet**
 *
 * Quand la seconde manque, la boutique résout et refuse la connexion :
 * `ERR_SSL_VERSION_OR_CIPHER_MISMATCH` en direct, erreur 525 derrière un proxy
 * Cloudflare. Rien n'échoue côté serveur, aucun journal ne s'allume — seul le
 * marchand le découvre.
 *
 * `provisioning.ts` déclare l'adresse à la création. Ce script rattrape :
 *   - les boutiques créées avant que ce rattachement n'existe
 *   - celles dont la déclaration a échoué parce que l'API était indisponible
 *
 * Il est **idempotent** : une adresse déjà déclarée est signalée comme telle
 * et rien n'est modifié. On peut le relancer sans réfléchir.
 *
 * ⚠️ Les boutiques RESILIE sont ignorées : rien ne justifie de payer un
 * certificat pour une adresse qui ne doit plus servir.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const DRY = process.argv.includes("--dry");

const RACINE = (process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "")
  .trim()
  .toLowerCase()
  .split(":")[0];

const TOKEN = process.env.VERCEL_TOKEN;
const PROJET = process.env.VERCEL_PROJECT_ID;
const EQUIPE = process.env.VERCEL_TEAM_ID;

/** Déclare un nom d'hôte sur le projet Vercel. Ne lève jamais. */
async function declarer(host) {
  const url = new URL(`https://api.vercel.com/v10/projects/${PROJET}/domains`);
  if (EQUIPE) url.searchParams.set("teamId", EQUIPE);

  try {
    const reponse = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: host }),
    });

    if (reponse.ok) return { etat: "declare" };

    const corps = await reponse.json().catch(() => null);
    const code = corps?.error?.code;

    // Déjà déclaré : ce n'est pas un échec, c'est le résultat recherché.
    if (code === "domain_already_in_use" || reponse.status === 409) {
      return { etat: "deja" };
    }

    return {
      etat: "echec",
      motif: corps?.error?.message ?? `HTTP ${reponse.status}`,
    };
  } catch (e) {
    return { etat: "echec", motif: e.message };
  }
}

async function main() {
  if (!RACINE || !RACINE.includes(".") || RACINE === "localhost") {
    console.error(
      `\nNEXT_PUBLIC_ROOT_DOMAIN vaut « ${RACINE || "(vide)"} ».\n` +
        `Ce script ne sert qu'en production, avec un vrai domaine racine.`
    );
    process.exit(1);
  }

  if (!DRY && (!TOKEN || !PROJET)) {
    console.error(
      "\nVERCEL_TOKEN et VERCEL_PROJECT_ID sont requis pour déclarer.\n" +
        "Relancez avec --dry pour voir la liste sans rien changer."
    );
    process.exit(1);
  }

  const boutiques = await prisma.tenant.findMany({
    where: { status: { not: "RESILIE" } },
    select: { slug: true, name: true, status: true },
    orderBy: { slug: "asc" },
  });

  console.log(
    `\n${boutiques.length} boutique(s) active(s) · domaine racine : ${RACINE}` +
      (DRY ? "\nMode simulation : aucune déclaration envoyée." : "")
  );

  const compte = { declare: 0, deja: 0, echec: 0, simule: 0 };

  for (const b of boutiques) {
    const host = `${b.slug}.${RACINE}`;

    if (DRY) {
      compte.simule += 1;
      console.log(`  → ${host.padEnd(38)} ${b.name}`);
      continue;
    }

    const r = await declarer(host);
    compte[r.etat] += 1;

    const symbole = { declare: "✅", deja: "•", echec: "✗" }[r.etat];
    console.log(
      `  ${symbole} ${host.padEnd(38)} ` +
        { declare: "déclarée", deja: "déjà déclarée", echec: `ÉCHEC — ${r.motif}` }[r.etat]
    );
  }

  console.log("\n────────────────────────────────────────");
  if (DRY) {
    console.log(`  ${compte.simule} adresse(s) seraient déclarées.`);
    console.log("  Relancez sans --dry pour agir.\n");
  } else {
    console.log(`  Nouvellement déclarées : ${compte.declare}`);
    console.log(`  Déjà en place         : ${compte.deja}`);
    console.log(`  Échecs                : ${compte.echec}`);
    if (compte.declare > 0) {
      console.log(
        "\n  Le certificat est émis dans la minute qui suit. Vérifiez en\n" +
          "  ouvrant une des adresses en HTTPS."
      );
    }
    if (compte.echec > 0) process.exitCode = 1;
    console.log("");
  }
}

main()
  .catch((e) => {
    console.error("\nÉchec :", e.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
