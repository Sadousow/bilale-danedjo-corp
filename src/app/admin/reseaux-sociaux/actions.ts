"use server";

import { revalidatePath } from "next/cache";

import { db, currentTenantId } from "@/lib/tenant-db";
import { requireRole } from "@/lib/auth";
import {
  PLATEFORMES,
  normaliserTout,
  type SocialKey,
} from "@/lib/reseaux-sociaux";

/**
 * Enregistrement des liens de réseaux sociaux.
 *
 * Toute la logique de normalisation vit dans `src/lib/reseaux-sociaux.ts`,
 * module pur couvert par `npm run test:reseaux`. Cette action ne fait que la
 * brancher sur la base et sur le formulaire.
 */

export type SocialState = {
  ok?: string;
  /** Message général — problème de droits, d'écriture… */
  error?: string;
  /** Un message par réseau fautif, affiché sous le champ concerné. */
  champs?: Partial<Record<SocialKey, string>>;
  /** Ce que le marchand avait tapé, pour réafficher sa saisie telle quelle. */
  valeurs?: Record<SocialKey, string>;
};

export async function saveSocialAction(
  _prev: SocialState,
  formData: FormData
): Promise<SocialState> {
  await requireRole("ADMIN");
  const prisma = await db();
  const tenantId = await currentTenantId();

  const saisies = Object.fromEntries(
    PLATEFORMES.map((p) => [p.key, String(formData.get(p.key) ?? "")])
  ) as Record<SocialKey, string>;

  const { valeurs, erreurs } = normaliserTout(saisies);

  /*
   * Un seul lien fautif suffit à tout refuser.
   *
   * L'alternative — enregistrer les liens valides et signaler les autres —
   * laisse le marchand devant un écran où une partie de sa saisie a été prise
   * et l'autre non, sans qu'il sache laquelle. Mieux vaut ne rien changer et
   * dire précisément quoi corriger.
   */
  if (Object.keys(erreurs).length > 0) {
    return {
      error: "Corrigez les liens signalés ci-dessous.",
      champs: erreurs,
      valeurs,
    };
  }

  await prisma.settings.update({
    where: { tenantId },
    data: Object.fromEntries(
      PLATEFORMES.map((p) => [p.champ, valeurs[p.key]])
    ),
  });

  revalidatePath("/admin/reseaux-sociaux");
  // Le pied de page de la boutique affiche ces icônes.
  revalidatePath("/");

  const actifs = PLATEFORMES.filter((p) => valeurs[p.key]).length;

  return {
    ok:
      actifs === 0
        ? "Enregistré. Aucun réseau n'est affiché sur votre boutique."
        : `Enregistré. ${actifs} réseau(x) affiché(s) en pied de page.`,
    valeurs,
  };
}
