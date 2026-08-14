"use server";

import { revalidatePath } from "next/cache";

import { db, currentTenantId } from "@/lib/tenant-db";
import { nextCounter } from "@/lib/counters";
import { requireSession } from "@/lib/auth";

export type CartLine = { productId: string; quantity: number };

export type CheckoutInput = {
  lines: CartLine[];
  discount: number;
  method: "ESPECES" | "ORANGE_MONEY" | "MTN_MOMO" | "VIREMENT" | "CREDIT";
  paid: number;
  customerId?: string | null;
  note?: string;
};

export type CheckoutResult =
  | { ok: true; saleId: string; number: number; change: number; due: number }
  | { ok: false; error: string };

export async function checkoutAction(
  input: CheckoutInput
): Promise<CheckoutResult> {
  const prisma = await db();
  const session = await requireSession();

  const lines = (input.lines ?? []).filter(
    (l) => l.productId && Number.isFinite(l.quantity) && l.quantity > 0
  );
  if (lines.length === 0) return { ok: false, error: "Le panier est vide." };

  const products = await prisma.product.findMany({
    where: { id: { in: lines.map((l) => l.productId) } },
  });
  const byId = new Map(products.map((p) => [p.id, p]));

  // Contrôle de stock avant tout enregistrement
  for (const line of lines) {
    const product = byId.get(line.productId);
    if (!product) return { ok: false, error: "Un produit du panier est introuvable." };
    if (product.stock < line.quantity) {
      return {
        ok: false,
        error: `Stock insuffisant pour « ${product.name} » : ${product.stock} restant(s).`,
      };
    }
  }

  const subtotal = lines.reduce((acc, l) => {
    const p = byId.get(l.productId)!;
    return acc + p.price * l.quantity;
  }, 0);

  const discount = Math.max(0, Math.min(Math.round(input.discount || 0), subtotal));
  const total = subtotal - discount;

  const isCredit = input.method === "CREDIT";
  const paid = isCredit
    ? Math.max(0, Math.min(Math.round(input.paid || 0), total))
    : Math.round(input.paid || 0);

  if (!isCredit && paid < total) {
    return { ok: false, error: "Le montant reçu est inférieur au total à payer." };
  }

  const change = isCredit ? 0 : paid - total;
  const due = isCredit ? total - paid : 0;

  if (isCredit && !input.customerId) {
    return { ok: false, error: "Une vente à crédit doit être rattachée à un client." };
  }

  if (isCredit && input.customerId) {
    const customer = await prisma.customer.findUnique({
      where: { id: input.customerId },
    });
    if (!customer) return { ok: false, error: "Client introuvable." };
    if (
      customer.creditLimit > 0 &&
      customer.creditBalance + due > customer.creditLimit
    ) {
      return {
        ok: false,
        error: `Plafond de crédit dépassé pour ${customer.name}.`,
      };
    }
  }

  const tenantId = await currentTenantId();
  const year = new Date().getFullYear();

  const sale = await prisma.$transaction(async (tx) => {
    // Numéro de ticket séquentiel, propre à cette boutique
    const number = await nextCounter(tx, tenantId, `SALE-${year}`);

    const created = await tx.sale.create({
      data: {
        number,
        subtotal,
        discount,
        total,
        paid,
        change,
        due,
        method: input.method,
        note: (input.note ?? "").trim(),
        userId: session.sub,
        customerId: input.customerId || null,
        items: {
          create: lines.map((l) => {
            const p = byId.get(l.productId)!;
            return {
              productId: p.id,
              name: p.name,
              unitPrice: p.price,
              cost: p.cost,
              quantity: l.quantity,
              lineTotal: p.price * l.quantity,
            };
          }),
        },
      },
    });

    for (const line of lines) {
      const p = byId.get(line.productId)!;
      const after = p.stock - line.quantity;
      await tx.product.update({
        where: { id: p.id },
        data: { stock: after },
      });
      await tx.stockMovement.create({
        data: {
          productId: p.id,
          type: "VENTE",
          quantity: line.quantity,
          before: p.stock,
          after,
          reason: `Vente n°${created.number}`,
          userId: session.sub,
        },
      });
    }

    if (due > 0 && input.customerId) {
      await tx.customer.update({
        where: { id: input.customerId },
        data: { creditBalance: { increment: due } },
      });
    }

    return created;
  });

  revalidatePath("/pos");
  revalidatePath("/admin");
  revalidatePath("/admin/ventes");
  revalidatePath("/admin/stock");
  revalidatePath("/produits");

  return { ok: true, saleId: sale.id, number: sale.number, change, due };
}

/** Création rapide d'un client depuis l'écran de caisse. */
export async function createCustomerFromPos(name: string, phone: string) {
  const prisma = await db();
  await requireSession();

  const cleanName = name.trim();
  if (!cleanName) return { ok: false as const, error: "Nom obligatoire." };

  const cleanPhone = phone.trim() || null;
  if (cleanPhone) {
    const existing = await prisma.customer.findUnique({
      where: { phone: cleanPhone },
    });
    if (existing) {
      return {
        ok: true as const,
        customer: {
          id: existing.id,
          name: existing.name,
          creditBalance: existing.creditBalance,
        },
      };
    }
  }

  const customer = await prisma.customer.create({
    data: { name: cleanName, phone: cleanPhone },
  });

  revalidatePath("/admin/clients");

  return {
    ok: true as const,
    customer: {
      id: customer.id,
      name: customer.name,
      creditBalance: customer.creditBalance,
    },
  };
}
