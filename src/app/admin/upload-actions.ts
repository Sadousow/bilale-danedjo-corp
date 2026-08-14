"use server";

import { requireRole } from "@/lib/auth";
import { currentTenantId } from "@/lib/tenant-db";
import { deleteImage, presignUpload, type UploadKind } from "@/lib/storage";

export type PresignResponse =
  | { ok: true; uploadUrl: string; publicUrl: string }
  | { ok: false; error: string };

/**
 * Prépare l'envoi direct d'une image vers le stockage.
 *
 * Le serveur choisit seul le chemin de destination, préfixé par la boutique :
 * le navigateur ne peut donc pas écrire ailleurs, même en modifiant sa requête.
 */
export async function requestUploadAction(input: {
  kind: UploadKind;
  contentType: string;
  size: number;
}): Promise<PresignResponse> {
  await requireRole("GERANT");
  const tenantId = await currentTenantId();

  const result = await presignUpload({
    tenantId,
    kind: input.kind,
    contentType: input.contentType,
    size: input.size,
  });

  if (!result.ok) return result;

  return { ok: true, uploadUrl: result.uploadUrl, publicUrl: result.publicUrl };
}

/** Supprime une image de la boutique courante. */
export async function deleteUploadAction(url: string): Promise<void> {
  await requireRole("GERANT");
  const tenantId = await currentTenantId();
  await deleteImage(tenantId, url);
}
