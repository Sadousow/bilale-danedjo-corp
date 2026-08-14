"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/lib/tenant-db";
import { requireRole } from "@/lib/auth";

export type ZoneState = { ok?: string; error?: string };

function refresh() {
  revalidatePath("/admin/parametres");
  revalidatePath("/commander");
}

export async function saveZoneAction(
  _prev: ZoneState,
  formData: FormData
): Promise<ZoneState> {
  const prisma = await db();
  await requireRole("ADMIN");

  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const fee = Math.round(Number(formData.get("fee") ?? 0));
  const freeAbove = Math.round(Number(formData.get("freeAbove") ?? 0));
  const delay = String(formData.get("delay") ?? "").trim();
  const position = Math.round(Number(formData.get("position") ?? 0));

  if (!name) return { error: "Le nom de la zone est obligatoire." };
  if (!Number.isFinite(fee) || fee < 0)
    return { error: "Les frais de livraison doivent être positifs." };
  if (!Number.isFinite(freeAbove) || freeAbove < 0)
    return { error: "Le seuil de gratuité doit être positif." };

  const data = {
    name,
    fee,
    freeAbove,
    delay,
    position: Number.isFinite(position) ? position : 0,
    active: formData.get("active") === "on",
  };

  if (id) {
    await prisma.deliveryZone.update({ where: { id }, data });
  } else {
    await prisma.deliveryZone.create({ data });
  }

  refresh();
  return { ok: id ? "Zone mise à jour." : `Zone « ${name} » ajoutée.` };
}

export async function deleteZoneAction(formData: FormData) {
  const prisma = await db();
  await requireRole("ADMIN");
  const id = String(formData.get("id") ?? "");

  const used = await prisma.order.count({ where: { zoneId: id } });
  if (used > 0) {
    // Des commandes y font référence : on désactive au lieu de supprimer.
    await prisma.deliveryZone.update({ where: { id }, data: { active: false } });
  } else {
    await prisma.deliveryZone.delete({ where: { id } });
  }

  refresh();
}
