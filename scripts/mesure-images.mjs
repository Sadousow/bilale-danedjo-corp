/**
 * Rattrapage des dimensions d'images produit.
 *
 *   node scripts/mesure-images.mjs                  # toutes les boutiques
 *   node scripts/mesure-images.mjs --tenant=bilale  # une seule
 *   node scripts/mesure-images.mjs --dry            # ne rien écrire
 *   node scripts/mesure-images.mjs --all            # remesurer même le déjà mesuré
 *
 * Pourquoi ce script existe : `Product.imageWidth` et `imageHeight` sont
 * arrivés après coup, donc nuls sur tout le catalogue existant. Or Meta refuse
 * les images de moins de 500 × 500 px, et le back-office doit pouvoir prévenir
 * le marchand avant qu'il tente de publier.
 *
 * Il ne télécharge pas les images : une requête HTTP `Range` sur les 64 premiers
 * kilo-octets suffit, les trois formats acceptés annonçant leur taille dans
 * l'en-tête. Une photo de 3 Mo coûte donc 64 Ko de trafic.
 *
 * Le rapport final donne le chiffre qui décide de la suite : combien d'articles
 * passent réellement le seuil de Meta.
 */
import { PrismaClient } from "@prisma/client";
import { imageSize } from "./image-size.mjs";

/** Seuil imposé par Meta — doit rester aligné sur src/lib/meta-catalog.ts. */
const MIN_IMAGE_SIDE = 500;

/** Assez pour l'en-tête de n'importe quel JPEG, PNG ou WebP. */
const HEAD_BYTES = 64 * 1024;

/** Requêtes simultanées. Bas volontairement : on lit le bucket d'un client. */
const CONCURRENCE = 6;

const prisma = new PrismaClient();

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const value = (name) => {
  const found = args.find((a) => a.startsWith(`--${name}=`));
  return found ? found.slice(name.length + 3) : null;
};

const DRY = flag("dry");
const ALL = flag("all");
const TENANT_SLUG = value("tenant");

/**
 * Télécharge le début du fichier et s'arrête.
 *
 * `Range` est une demande, pas un ordre : un stockage peut l'ignorer et
 * répondre 200 avec tout le fichier. On lit donc le flux morceau par morceau et
 * on l'annule dès qu'on en a assez — sinon une photo de 4 Mo serait rapatriée
 * en entier pour lire 24 octets.
 */
async function fetchHead(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(url, {
      headers: { Range: `bytes=0-${HEAD_BYTES - 1}` },
      signal: controller.signal,
    });

    if (!response.ok && response.status !== 206) {
      return { erreur: `HTTP ${response.status}` };
    }
    if (!response.body) return { erreur: "réponse sans corps" };

    const morceaux = [];
    let total = 0;
    const reader = response.body.getReader();

    while (total < HEAD_BYTES) {
      const { done, value: chunk } = await reader.read();
      if (done) break;
      morceaux.push(chunk);
      total += chunk.length;
    }
    await reader.cancel().catch(() => {});

    return { buffer: Buffer.concat(morceaux.map(Buffer.from)) };
  } catch (e) {
    return { erreur: e.name === "AbortError" ? "délai dépassé" : e.message };
  } finally {
    clearTimeout(timeout);
  }
}

/** Exécute `travail` sur chaque élément, `limite` à la fois. */
async function enParallele(items, limite, travail) {
  let index = 0;
  const ouvriers = Array.from({ length: Math.min(limite, items.length) }, async () => {
    while (index < items.length) {
      const i = index++;
      await travail(items[i], i);
    }
  });
  await Promise.all(ouvriers);
}

async function main() {
  const tenants = await prisma.tenant.findMany({
    where: TENANT_SLUG ? { slug: TENANT_SLUG } : {},
    select: { id: true, slug: true, name: true },
    orderBy: { slug: "asc" },
  });

  if (tenants.length === 0) {
    console.error(
      TENANT_SLUG
        ? `Aucune boutique avec le slug « ${TENANT_SLUG} ».`
        : "Aucune boutique en base."
    );
    process.exit(1);
  }

  if (DRY) console.log("Mode simulation : aucune écriture en base.\n");

  const global = { total: 0, mesures: 0, echecs: 0, conformes: 0, tropPetites: 0 };

  for (const tenant of tenants) {
    const produits = await prisma.product.findMany({
      where: {
        tenantId: tenant.id,
        image: { not: "" },
        ...(ALL ? {} : { OR: [{ imageWidth: null }, { imageHeight: null }] }),
      },
      select: { id: true, sku: true, name: true, image: true },
      orderBy: { sku: "asc" },
    });

    console.log(
      `\n${tenant.name} (${tenant.slug}) — ${produits.length} article(s) à mesurer`
    );
    if (produits.length === 0) continue;

    const echecs = [];
    let mesures = 0;
    let conformes = 0;
    let tropPetites = 0;

    await enParallele(produits, CONCURRENCE, async (p) => {
      const { buffer, erreur } = await fetchHead(p.image);

      if (erreur) {
        echecs.push({ sku: p.sku, motif: erreur });
        return;
      }

      const taille = imageSize(buffer);
      if (!taille) {
        echecs.push({ sku: p.sku, motif: "format non reconnu" });
        return;
      }

      if (!DRY) {
        await prisma.product.update({
          where: { id: p.id },
          data: { imageWidth: taille.width, imageHeight: taille.height },
        });
      }

      mesures += 1;
      const assezGrande =
        taille.width >= MIN_IMAGE_SIDE && taille.height >= MIN_IMAGE_SIDE;
      if (assezGrande) conformes += 1;
      else {
        tropPetites += 1;
        console.log(
          `  ⚠ ${p.sku} — ${taille.width} × ${taille.height} px, sous le seuil`
        );
      }
    });

    console.log(
      `  ${mesures} mesuré(s) · ${conformes} conforme(s) · ` +
        `${tropPetites} trop petite(s) · ${echecs.length} échec(s)`
    );
    for (const e of echecs) console.log(`  ✗ ${e.sku} — ${e.motif}`);

    global.total += produits.length;
    global.mesures += mesures;
    global.echecs += echecs.length;
    global.conformes += conformes;
    global.tropPetites += tropPetites;
  }

  console.log("\n────────────────────────────────────────");
  console.log(`Articles examinés   : ${global.total}`);
  console.log(`Mesurés            : ${global.mesures}`);
  console.log(`Échecs de lecture  : ${global.echecs}`);
  console.log(
    `Conformes à Meta   : ${global.conformes}` +
      (global.mesures > 0
        ? ` (${Math.round((global.conformes / global.mesures) * 100)} %)`
        : "")
  );
  console.log(`Sous le seuil      : ${global.tropPetites}`);

  if (global.tropPetites > 0) {
    console.log(
      `\nCes ${global.tropPetites} article(s) seront marqués « photo trop petite »\n` +
        `dans le back-office. Le marchand devra reprendre la photo pour les publier.`
    );
  }
  if (global.echecs > 0) {
    console.log(
      `\n${global.echecs} image(s) illisibles : URL cassée, objet supprimé du\n` +
        `stockage, ou format inattendu. Leurs dimensions restent nulles, donc les\n` +
        `articles restent publiables avec une réserve affichée.`
    );
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
