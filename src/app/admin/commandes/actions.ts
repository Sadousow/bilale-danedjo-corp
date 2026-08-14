"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { db, currentTenantId } from "@/lib/tenant-db";
import { nextCounter } from "@/lib/counters";
import { requireRole } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { allowedOrderTransitions, type OrderStatus } from "@/lib/orders";
import { computeTotals, documentReference } from "@/lib/documents";

export async function changeOrderStatusAction(formData: FormData) {
  const prisma = await db();
  const session = await requireRole("GERANT");

  const id = String(formData.get("id") ?? "");
  const target = String(formData.get("status") ?? "") as OrderStatus;

  const order = await prisma.order.findUnique({
    where: { id },
    include: { items: true },
  });
  if (!order) return;

  if (!allowedOrderTransitions(order.status as OrderStatus).includes(target)) {
    return;
  }

  if (target === "LIVREE" && !order.stockApplied) {
    await prisma.$transaction(async (tx) => {
      for (const item of order.items) {
        if (!item.productId) continue;
        const product = await tx.product.findUnique({
          where: { id: item.productId },
          select: { stock: true },
        });
        if (!product) continue;

        const after = product.stock - item.quantity;
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: after },
        });
        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            type: "SORTIE",
            quantity: item.quantity,
            before: product.stock,
            after,
            reason: `Commande ${order.reference}`,
            userId: session.sub,
          },
        });
      }

      await tx.order.update({
        where: { id },
        data: {
          status: "LIVREE",
          stockApplied: true,
          // Paiement à la livraison : la remise du colis vaut encaissement.
          paymentStatus:
            order.paymentMethod === "A_LA_LIVRAISON" ? "PAYEE" : order.paymentStatus,
          paidAmount:
            order.paymentMethod === "A_LA_LIVRAISON" ? order.total : order.paidAmount,
          paidAt:
            order.paymentMethod === "A_LA_LIVRAISON" ? new Date() : order.paidAt,
        },
      });
    });
  } else if (target === "ANNULEE" && order.stockApplied) {
    await prisma.$transaction(async (tx) => {
      for (const item of order.items) {
        if (!item.productId) continue;
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
            reason: `Annulation commande ${order.reference}`,
            userId: session.sub,
          },
        });
      }

      await tx.order.update({
        where: { id },
        data: { status: "ANNULEE", stockApplied: false },
      });
    });
  } else {
    await prisma.order.update({ where: { id }, data: { status: target } });
  }

  revalidatePath("/admin/commandes");
  revalidatePath(`/admin/commandes/${id}`);
  revalidatePath("/admin/stock");
  revalidatePath("/produits");
}

export async function markOrderPaidAction(formData: FormData) {
  const prisma = await db();
  await requireRole("GERANT");
  const id = String(formData.get("id") ?? "");

  const order = await prisma.order.findUnique({ where: { id } });
  if (!order || order.paymentStatus === "PAYEE") return;

  await prisma.order.update({
    where: { id },
    data: { paymentStatus: "PAYEE", paidAmount: order.total, paidAt: new Date() },
  });

  revalidatePath("/admin/commandes");
  revalidatePath(`/admin/commandes/${id}`);
}

/** Établit une facture définitive à partir d'une commande. */
export async function invoiceFromOrderAction(formData: FormData) {
  const prisma = await db();
  const session = await requireRole("GERANT");
  const orderId = String(formData.get("orderId") ?? "");

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: { orderBy: { position: "asc" } }, customer: true },
  });
  if (!order || order.status === "ANNULEE") return;

  const existing = await prisma.document.findFirst({
    where: { orderId, type: "FACTURE", status: { not: "ANNULE" } },
    select: { id: true },
  });
  if (existing) redirect(`/admin/factures/${existing.id}`);

  const settings = await getSettings();
  const now = new Date();
  const year = now.getFullYear();

  // Les prix de la boutique sont TTC : on reconstitue le HT si la TVA s'applique.
  const vatEnabled = settings.vatEnabledByDefault;
  const rate = vatEnabled ? settings.defaultVatRate : 0;
  const toHt = (ttc: number) =>
    vatEnabled ? Math.round(ttc / (1 + rate / 100)) : ttc;

  const lines = order.items.map((item, index) => {
    const unitPrice = toHt(item.unitPrice);
    return {
      productId: item.productId,
      position: index,
      name: item.name,
      description: "",
      unit: item.unit,
      unitPrice,
      quantity: item.quantity,
      discount: 0,
      lineTotal: unitPrice * item.quantity,
    };
  });

  if (order.deliveryFee > 0) {
    const unitPrice = toHt(order.deliveryFee);
    lines.push({
      productId: null,
      position: lines.length,
      name: `Frais de livraison — ${order.zoneName}`,
      description: "",
      unit: null,
      unitPrice,
      quantity: 1,
      discount: 0,
      lineTotal: unitPrice,
    });
  }

  const totals = computeTotals({ lines, discount: 0, vatEnabled, vatRate: rate });

  const tenantId = await currentTenantId();

  const created = await prisma.$transaction(async (tx) => {
    const number = await nextCounter(tx, tenantId, `FACTURE-${year}`);

    return tx.document.create({
      data: {
        type: "FACTURE",
        year,
        number,
        reference: documentReference("FACTURE", year, number),
        status: order.paymentStatus === "PAYEE" ? "PAYE" : "EMIS",
        clientName: order.clientName,
        clientPhone: order.clientPhone,
        clientAddress: order.clientAddress,
        clientNif: order.customer?.nif ?? null,
        clientRccm: order.customer?.rccm ?? null,
        customerId: order.customerId,
        issueDate: order.createdAt,
        vatEnabled,
        vatRate: rate,
        subtotal: totals.subtotal,
        discount: 0,
        taxableBase: totals.taxableBase,
        vatAmount: totals.vatAmount,
        total: totals.total,
        paidAmount: order.paymentStatus === "PAYEE" ? totals.total : 0,
        terms: settings.paymentTerms,
        note: `Établie à partir de la commande ${order.reference}.`,
        deliveryAddress: order.clientAddress,
        // Le stock est piloté par la commande, pas par la facture.
        stockApplied: true,
        orderId: order.id,
        userId: session.sub,
        items: { create: lines },
      },
    });
  });

  revalidatePath("/admin/factures");
  revalidatePath(`/admin/commandes/${orderId}`);
  redirect(`/admin/factures/${created.id}`);
}
