import "server-only";

import { cache } from "react";
import { headers } from "next/headers";

import { db } from "@/lib/tenant-db";
import { getSession } from "@/lib/auth";
import { PREVIEW_HEADER } from "@/lib/home-draft-shared";
import { hasRole } from "@/lib/session";
import {
  parseBlocks,
  parseThemePreset,
  type Block,
  type ThemePreset,
} from "@/lib/blocks";

/**
 * Brouillon de la page d'accueil.
 *
 * L'éditeur enregistre en continu ; l'aperçu lit ce brouillon. Les visiteurs,
 * eux, voient toujours la composition publiée — c'est tout l'intérêt : le
 * marchand peut tâtonner sans que sa boutique change sous les yeux de ses
 * clients.
 */

export type HomeDraft = { blocks: Block[]; preset: ThemePreset };

/**
 * Le brouillon n'est servi qu'à un administrateur connecté sur cette
 * boutique. Pour tout le monde d'autre, `?apercu=1` ne fait rien de spécial :
 * pas de refus visible, pas d'indice qu'un brouillon existe.
 */
export async function canPreview(): Promise<boolean> {
  const session = await getSession();
  return session !== null && hasRole(session.role, "ADMIN");
}

export async function isPreviewRequest(): Promise<boolean> {
  const store = await headers();
  return store.get(PREVIEW_HEADER) === "1";
}

/**
 * Brouillon à afficher pour cette requête, ou null.
 * Regroupe les trois conditions — aperçu demandé, administrateur connecté,
 * brouillon existant — pour qu'aucun appelant ne puisse en oublier une.
 * Mis en cache : la mise en page et la page appellent tous deux.
 */
export const previewDraft = cache(async (): Promise<HomeDraft | null> => {
  if (!(await isPreviewRequest())) return null;
  if (!(await canPreview())) return null;
  return getHomeDraft();
});

/** Brouillon en cours, ou null s'il n'y en a pas. */
export async function getHomeDraft(): Promise<HomeDraft | null> {
  try {
    const prisma = await db();
    const row = await prisma.settings.findFirst({
      select: { homeBlocksDraft: true, themePresetDraft: true },
    });

    if (!row?.homeBlocksDraft) return null;

    return {
      blocks: parseBlocks(row.homeBlocksDraft),
      preset: parseThemePreset(row.themePresetDraft),
    };
  } catch {
    return null;
  }
}
