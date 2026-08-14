"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/lib/tenant-db";
import { requireRole } from "@/lib/auth";

export type StockState = { error?: string; ok?: string };

export async function adjustStockAction(
  _prev: StockState,
  formData: FormData
): Promise<StockState> {
  const prisma = await db();
  const session = await requireRole("GERANT");

  const productId = String(formData.get("productId") ?? "");
  const type = String(formData.get("type") ?? "ENTREE") as
    | "ENTREE"
    | "SORTIE"
    | "AJUSTEMENT";
  const quantity = Math.round(Number(formData.get("quantity") ?? 0));
  const reason = String(formData.get("reason") ?? "").trim();

  if (!productId) return { error: "Sélectionnez un produit." };
  if (!Number.isFinite(quantity) || quantity <= 0)
    return { error: "La quantité doit être un nombre supérieur à 0." };

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) return { error: "Produit introuvable." };

  let after: number;
  if (type === "ENTREE") after = product.stock + quantity;
  else if (type === "SORTIE") after = product.stock - quantity;
  else after = quantity; // AJUSTEMENT : la quantité devient le nouveau stock

  if (after < 0)
    return {
      error: `Stock insuffisant : il ne reste que ${product.stock} unité(s).`,
    };

  await prisma.$transaction([
    prisma.product.update({ where: { id: productId }, data: { stock: after } }),
    prisma.stockMovement.create({
      data: {
        productId,
        type,
        quantity: type === "AJUSTEMENT" ? Math.abs(after - product.stock) : quantity,
        before: product.stock,
        after,
        reason,
        userId: session.sub,
      },
    }),
  ]);

  revalidatePath("/admin/stock");
  revalidatePath("/admin/produits");
  revalidatePath("/produits");

  return { ok: `${product.name} : stock mis à jour (${product.stock} → ${after}).` };
}
