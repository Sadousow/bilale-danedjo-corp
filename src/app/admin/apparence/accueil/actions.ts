"use server";

import { revalidatePath } from "next/cache";

import { db, currentTenantId } from "@/lib/tenant-db";
import { requireRole } from "@/lib/auth";
import { deleteImage } from "@/lib/storage";
import {
  parseBlocks,
  parseThemePreset,
  defaultBlocks,
  serializeBlocks,
  type Block,
} from "@/lib/blocks";

export type HomeState = { ok?: string; error?: string };

/**
 * Deux écritures distinctes, et c'est volontaire :
 *
 *   - `saveDraftAction` alimente l'aperçu, en continu pendant l'édition ;
 *   - `publishHomeAction` remplace ce que voient les visiteurs.
 *
 * Sans cette séparation, chaque essai de mise en page changerait la boutique
 * sous les yeux des clients.
 *
 * Dans les deux cas, ce qui arrive du navigateur repasse par `parseBlocks` :
 * le formulaire n'est pas la frontière de confiance, la fonction de lecture
 * l'est. Un appel forgé ne peut pas déposer en base un type de bloc inconnu,
 * une URL `javascript:` ou un texte de 10 Mo.
 */

/** Enregistre le brouillon. Visible uniquement dans l'aperçu. */
export async function saveDraftAction(input: {
  themePreset: string;
  blocks: unknown;
}): Promise<HomeState> {
  await requireRole("ADMIN");
  const prisma = await db();
  const tenantId = await currentTenantId();

  await prisma.settings.update({
    where: { tenantId },
    data: {
      homeBlocksDraft: serializeBlocks(parseBlocks(input.blocks)),
      themePresetDraft: parseThemePreset(input.themePreset),
    },
  });

  // L'aperçu est une vraie page de la vitrine : sans cela, il resterait en
  // cache et n'afficherait jamais le brouillon qu'on vient d'écrire.
  revalidatePath("/");

  return { ok: "Brouillon à jour." };
}

/** Publie la composition : c'est elle que voient désormais les visiteurs. */
export async function publishHomeAction(input: {
  themePreset: string;
  blocks: unknown;
}): Promise<HomeState> {
  await requireRole("ADMIN");
  const prisma = await db();
  const tenantId = await currentTenantId();

  const blocks = parseBlocks(input.blocks);
  const themePreset = parseThemePreset(input.themePreset);

  const current = await prisma.settings.findFirst({ select: { homeBlocks: true } });
  const previousImages = imageUrls(parseBlocks(current?.homeBlocks));

  await prisma.settings.update({
    where: { tenantId },
    data: {
      homeBlocks: serializeBlocks(blocks),
      themePreset,
      // Le brouillon rejoint la version publiée : plus de « modifications
      // non publiées » affichées alors qu'il n'y en a plus.
      homeBlocksDraft: serializeBlocks(blocks),
      themePresetDraft: themePreset,
    },
  });

  // Les images de blocs supprimés ou remplacés n'ont plus d'usage.
  // On ne les efface qu'à la publication : une image retirée puis remise
  // pendant l'édition doit survivre.
  const kept = new Set(imageUrls(blocks));
  for (const url of previousImages) {
    if (!kept.has(url)) await deleteImage(tenantId, url);
  }

  revalidatePath("/admin/apparence/accueil");
  revalidatePath("/");

  return { ok: "Page d'accueil publiée." };
}

/** Abandonne le brouillon et revient à ce qui est publié. */
export async function discardDraftAction(): Promise<HomeState> {
  await requireRole("ADMIN");
  const prisma = await db();
  const tenantId = await currentTenantId();

  const current = await prisma.settings.findFirst({
    select: { homeBlocks: true, themePreset: true },
  });

  await prisma.settings.update({
    where: { tenantId },
    data: {
      homeBlocksDraft: current?.homeBlocks ?? undefined,
      themePresetDraft: current?.themePreset ?? "classique",
    },
  });

  revalidatePath("/admin/apparence/accueil");
  revalidatePath("/");

  return { ok: "Modifications abandonnées." };
}

/** Revient à la composition d'origine, sans toucher aux couleurs ni aux textes. */
export async function resetHomeAction(): Promise<HomeState> {
  await requireRole("ADMIN");
  const prisma = await db();
  const tenantId = await currentTenantId();

  const blocks = serializeBlocks(defaultBlocks());

  await prisma.settings.update({
    where: { tenantId },
    data: { homeBlocksDraft: blocks },
  });

  revalidatePath("/admin/apparence/accueil");
  revalidatePath("/");

  return {
    ok: "Composition d'origine rétablie dans le brouillon. Publiez pour l'appliquer.",
  };
}

function imageUrls(blocks: Block[]): string[] {
  return blocks
    .map((b) => b.props.imageUrl)
    .filter((url): url is string => Boolean(url));
}
