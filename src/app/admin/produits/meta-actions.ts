"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { db } from "@/lib/tenant-db";
import { requireRole } from "@/lib/auth";
import { eligibility } from "@/lib/meta-catalog";

/**
 * Publication d'articles vers le catalogue Meta du marchand.
 *
 * Deux notions distinctes, et c'est tout le modèle :
 *
 *   `published`  — ce que le marchand VEUT. Sa décision, immédiate.
 *   `syncStatus` — ce que Meta SAIT. Ne change qu'après un appel réussi.
 *
 * L'écart entre les deux est le travail à faire. Dépublier ne met donc pas
 * `syncStatus` à `RETIRE` : Meta a toujours l'article jusqu'à ce qu'on le lui
 * retire. C'est la couche de synchronisation qui réconciliera
 * (`published: false` + `syncStatus: PUBLIE` → envoyer une suppression).
 *
 * Écrire `RETIRE` ici serait mentir sur l'état réel, et laisserait une fiche
 * fantôme vivante chez Meta sans que rien ne l'indique.
 */

/** Ce que l'éligibilité a besoin de lire — évite un `select` trop large. */
const CHAMPS_ELIGIBILITE = {
  id: true,
  sku: true,
  name: true,
  description: true,
  image: true,
  imageWidth: true,
  imageHeight: true,
  price: true,
  active: true,
} as const;

function idsDe(formData: FormData): string[] {
  return formData
    .getAll("ids")
    .map((v) => String(v))
    .filter(Boolean);
}

/**
 * Repart vers la liste en conservant les filtres du marchand.
 *
 * Sans ce report, publier depuis « Non publiés » renvoyait sur la liste
 * complète : le marchand perdait sa position et devait refiltrer à chaque
 * lot. Le paramètre `ok` porte le compte rendu — les Server Actions
 * déclenchées par un `<form>` simple ne peuvent rien retourner à l'écran.
 */
function retour(formData: FormData, message: string): never {
  const brut = String(formData.get("retour") ?? "");
  const params = new URLSearchParams(brut.startsWith("?") ? brut.slice(1) : brut);
  params.delete("ok");
  params.set("ok", message);
  redirect(`/admin/produits?${params.toString()}`);
}

export async function publierLotAction(formData: FormData) {
  const prisma = await db();
  await requireRole("GERANT");

  const ids = idsDe(formData);
  if (ids.length === 0) retour(formData, "aucune-selection");

  /*
   * On relit les articles par le client filtré plutôt que de faire confiance
   * aux identifiants du formulaire. Un `id` forgé appartenant à une autre
   * boutique ne ressort simplement pas de cette requête.
   */
  const produits = await prisma.product.findMany({
    where: { id: { in: ids } },
    select: CHAMPS_ELIGIBILITE,
  });

  /*
   * L'éligibilité est revérifiée côté serveur. L'écran l'affiche déjà, mais
   * il peut avoir vieilli : un article désactivé entre l'affichage et le clic
   * ne doit pas partir. Publier un article inactif, c'est payer une publicité
   * qui mène à une page vide.
   */
  const publiables = produits.filter((p) => eligibility(p).publiable);
  const refuses = produits.length - publiables.length;

  if (publiables.length > 0) {
    await prisma.$transaction(
      publiables.map((p) =>
        prisma.metaCatalogItem.upsert({
          where: { productId: p.id },
          create: { productId: p.id, published: true },
          update: {
            published: true,
            /*
             * Un article republié après un retrait ou un refus repart de zéro :
             * garder l'ancien motif de rejet afficherait une erreur périmée.
             */
            syncStatus: "EN_ATTENTE",
            rejectionMessage: "",
          },
        })
      )
    );
    revalidatePath("/admin/produits");
  }

  retour(formData, `publies-${publiables.length}-${refuses}`);
}

export async function depublierLotAction(formData: FormData) {
  const prisma = await db();
  await requireRole("GERANT");

  const ids = idsDe(formData);
  if (ids.length === 0) retour(formData, "aucune-selection");

  const produits = await prisma.product.findMany({
    where: { id: { in: ids } },
    select: { id: true },
  });

  /*
   * `syncStatus` n'est volontairement pas touché : voir l'en-tête du fichier.
   * Tant que Meta n'a pas confirmé la suppression, l'article y est encore.
   */
  const { count } = await prisma.metaCatalogItem.updateMany({
    where: { productId: { in: produits.map((p) => p.id) }, published: true },
    data: { published: false },
  });

  revalidatePath("/admin/produits");
  retour(formData, `retires-${count}`);
}

/**
 * Bascule un seul article — le bouton de la ligne.
 *
 * L'identifiant arrive par `.bind(null, id)` côté appelant, **pas** par le
 * `FormData`. C'est une contrainte de React 19, vérifiée à l'exécution : le
 * `name`/`value` d'un bouton de soumission n'est PAS transmis à une Server
 * Action déclenchée par `formAction`. Un `formData.get("id")` y renvoie
 * toujours `null`, et l'action sort en silence — aucune erreur, aucun journal,
 * un bouton qui ne fait rien.
 *
 * Ne pas « simplifier » en remettant `name="id"` sur le bouton.
 *
 * L'identifiant lié est sérialisé dans la page envoyée au navigateur : n'y
 * mettre que des valeurs non sensibles. Ici c'est sans risque, le client
 * Prisma étant de toute façon restreint au tenant courant.
 */
export async function basculerMetaAction(id: string, formData: FormData) {
  const prisma = await db();
  await requireRole("GERANT");

  if (!id) retour(formData, "introuvable");

  const produit = await prisma.product.findFirst({
    where: { id },
    select: {
      ...CHAMPS_ELIGIBILITE,
      metaCatalogItem: { select: { published: true } },
    },
  });
  if (!produit) retour(formData, "introuvable");

  const dejaPublie = produit.metaCatalogItem?.published === true;

  if (dejaPublie) {
    await prisma.metaCatalogItem.updateMany({
      where: { productId: id },
      data: { published: false },
    });
    revalidatePath("/admin/produits");
    retour(formData, "retires-1");
  }

  const elig = eligibility(produit);
  if (!elig.publiable) retour(formData, "non-publiable");

  await prisma.metaCatalogItem.upsert({
    where: { productId: id },
    create: { productId: id, published: true },
    update: { published: true, syncStatus: "EN_ATTENTE", rejectionMessage: "" },
  });

  revalidatePath("/admin/produits");
  retour(formData, "publies-1-0");
}
