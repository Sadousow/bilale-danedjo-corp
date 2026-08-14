"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/lib/tenant-db";
import { requireRole } from "@/lib/auth";

/**
 * Annule une vente : remet les articles en stock et solde
 * l'éventuel crédit client correspondant.
 */
export async function cancelSaleAction(formData: FormData) {
  const prisma = await db();
  const session = await requireRole("GERANT");
  const id = String(formData.get("id") ?? "");

  const sale = await prisma.sale.findUnique({
    where: { id },
    include: { items: true },
  });
  if (!sale || sale.status === "ANNULEE") return;

  await prisma.$transaction(async (tx) => {
    for (const item of sale.items) {
      const product = await tx.product.findUnique({
        where: { id: item.productId },
        select: { stock: true },
      });
      if (!product) continue;

      const after = product.stock + item.quantity;
      await tx.product.update({
        where: { id: item.productId },
        data: { stock: after },
      });
      await tx.stockMovement.create({
        data: {
          productId: item.productId,
          type: "RETOUR",
          quantity: item.quantity,
          before: product.stock,
          after,
          reason: `Annulation vente n°${sale.number}`,
          userId: session.sub,
        },
      });
    }

    if (sale.customerId && sale.due > 0) {
      await tx.customer.update({
        where: { id: sale.customerId },
        data: { creditBalance: { decrement: sale.due } },
      });
    }

    await tx.sale.update({
      where: { id: sale.id },
      data: { status: "ANNULEE", due: 0 },
    });
  });

  revalidatePath("/admin/ventes");
  revalidatePath(`/admin/ventes/${id}`);
  revalidatePath("/admin/clients");
  revalidatePath("/admin/stock");
}
