"use server";

import { revalidatePath } from "next/cache";

import { db, currentTenantId } from "@/lib/tenant-db";
import { requireRole } from "@/lib/auth";

/**
 * Ouvre la vitrine aux visiteurs.
 *
 * Réservé à l'administrateur : ouvrir la boutique est un acte commercial,
 * pas une opération de caisse.
 */
export async function publishShopAction(): Promise<void> {
  await requireRole("ADMIN");
  const prisma = await db();
  const tenantId = await currentTenantId();

  await prisma.settings.update({
    where: { tenantId },
    data: { shopPublished: true },
  });

  revalidatePath("/", "layout");
  revalidatePath("/admin");
}
