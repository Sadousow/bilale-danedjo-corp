"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";

import { db, currentTenantId } from "@/lib/tenant-db";
import { nextCounter } from "@/lib/counters";
import { requireRole } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import {
  allowedTransitions,
  computeTotals,
  documentReference,
  isEditable,
  lineTotal,
  type DocumentStatus,
  type DocumentType,
} from "@/lib/documents";

export type DocumentResult = { ok?: string; error?: string };

export type DocumentLineInput = {
  productId?: string | null;
  name: string;
  description?: string;
  unit?: string | null;
  unitPrice: number;
  quantity: number;
  discount?: number;
};

export type DocumentInput = {
  id?: string;
  type: DocumentType;
  customerId?: string | null;
  clientName: string;
  clientPhone?: string;
  clientAddress?: string;
  clientNif?: string;
  clientRccm?: string;
  issueDate?: string;
  dueDate?: string;
  validUntil?: string;
  vatEnabled: boolean;
  vatRate: number;
  discount: number;
  note?: string;
  terms?: string;
  deliveryAddress?: string;
  lines: DocumentLineInput[];
  parentId?: string | null;
  saleId?: string | null;
};

export type SaveDocumentResult =
  | { ok: true; id: string; reference: string }
  | { ok: false; error: string };

// ------------------------------------------------------------- numérotation

/**
 * Réserve le prochain numéro pour un type de document et une année.
 * Le compteur est incrémenté atomiquement, ce qui évite les doublons
 * même si deux utilisateurs enregistrent au même instant.
 */
async function nextNumber(
  tx: Prisma.TransactionClient,
  tenantId: string,
  type: DocumentType,
  year: number
): Promise<number> {
  return nextCounter(tx, tenantId, `${type}-${year}`);
}

// ------------------------------------------------------------- validation

function cleanLines(lines: DocumentLineInput[]) {
  return (lines ?? [])
    .map((l) => ({
      productId: l.productId || null,
      name: (l.name ?? "").trim(),
      description: (l.description ?? "").trim(),
      unit: l.unit?.trim() || null,
      unitPrice: Math.max(0, Math.round(Number(l.unitPrice) || 0)),
      quantity: Math.round(Number(l.quantity) || 0),
      discount: Math.max(0, Math.round(Number(l.discount) || 0)),
    }))
    .filter((l) => l.name && l.quantity > 0);
}

function validate(input: DocumentInput, lines: ReturnType<typeof cleanLines>) {
  if (!input.clientName?.trim()) return "Le nom du client est obligatoire.";
  if (lines.length === 0)
    return "Ajoutez au moins une ligne avec un libellé et une quantité.";
  if (input.vatEnabled && (input.vatRate < 0 || input.vatRate > 100))
    return "Le taux de TVA doit être compris entre 0 et 100 %.";
  if (input.type === "FACTURE" && lines.some((l) => l.unitPrice <= 0))
    return "Une facture ne peut pas contenir de ligne à prix nul.";
  return null;
}

function parseDate(value?: string): Date | null {
  if (!value) return null;
  const d = new Date(`${value}T12:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

// ------------------------------------------------------------- création / édition

export async function saveDocumentAction(
  input: DocumentInput
): Promise<SaveDocumentResult> {
  const prisma = await db();
  const session = await requireRole("GERANT");

  const lines = cleanLines(input.lines);
  const error = validate(input, lines);
  if (error) return { ok: false, error };

  const totals = computeTotals({
    lines,
    discount: input.discount,
    vatEnabled: input.vatEnabled,
    vatRate: input.vatRate,
  });

  const issueDate = parseDate(input.issueDate) ?? new Date();

  const base = {
    clientName: input.clientName.trim(),
    clientPhone: input.clientPhone?.trim() || null,
    clientAddress: input.clientAddress?.trim() || null,
    clientNif: input.clientNif?.trim() || null,
    clientRccm: input.clientRccm?.trim() || null,
    customerId: input.customerId || null,
    issueDate,
    dueDate: parseDate(input.dueDate),
    validUntil: parseDate(input.validUntil),
    vatEnabled: input.vatEnabled,
    vatRate: input.vatEnabled ? Math.round(input.vatRate) : 0,
    subtotal: totals.subtotal,
    discount: totals.discount,
    taxableBase: totals.taxableBase,
    vatAmount: totals.vatAmount,
    total: totals.total,
    note: (input.note ?? "").trim(),
    terms: (input.terms ?? "").trim(),
    deliveryAddress: input.deliveryAddress?.trim() || null,
  };

  const itemsData = lines.map((l, index) => ({
    productId: l.productId,
    position: index,
    name: l.name,
    description: l.description,
    unit: l.unit,
    unitPrice: l.unitPrice,
    quantity: l.quantity,
    discount: l.discount,
    lineTotal: lineTotal(l),
  }));

  // --- Mise à jour d'un brouillon existant
  if (input.id) {
    const existing = await prisma.document.findUnique({
      where: { id: input.id },
      select: { id: true, status: true, reference: true },
    });
    if (!existing) return { ok: false, error: "Document introuvable." };
    if (!isEditable(existing.status as DocumentStatus))
      return {
        ok: false,
        error: "Ce document est émis : il n'est plus modifiable.",
      };

    await prisma.$transaction([
      prisma.documentItem.deleteMany({ where: { documentId: input.id } }),
      prisma.document.update({
        where: { id: input.id },
        data: { ...base, items: { create: itemsData } },
      }),
    ]);

    revalidatePath("/admin/factures");
    revalidatePath(`/admin/factures/${input.id}`);
    return { ok: true, id: existing.id, reference: existing.reference };
  }

  // --- Création
  const year = issueDate.getFullYear();

  const tenantId = await currentTenantId();

  const created = await prisma.$transaction(async (tx) => {
    const number = await nextNumber(tx, tenantId, input.type, year);
    return tx.document.create({
      data: {
        ...base,
        type: input.type,
        year,
        number,
        reference: documentReference(input.type, year, number),
        parentId: input.parentId || null,
        saleId: input.saleId || null,
        userId: session.sub,
        items: { create: itemsData },
      },
    });
  });

  revalidatePath("/admin/factures");
  return { ok: true, id: created.id, reference: created.reference };
}

// ------------------------------------------------------------- transitions

export async function changeStatusAction(formData: FormData) {
  const prisma = await db();
  const session = await requireRole("GERANT");

  const id = String(formData.get("id") ?? "");
  const target = String(formData.get("status") ?? "") as DocumentStatus;

  const doc = await prisma.document.findUnique({
    where: { id },
    include: { items: true },
  });
  if (!doc) return;

  const allowed = allowedTransitions(
    doc.type as DocumentType,
    doc.status as DocumentStatus
  );
  if (!allowed.includes(target)) return;

  // Livraison : c'est ici que le stock bouge.
  if (target === "LIVRE") {
    await prisma.$transaction(async (tx) => {
      if (!doc.stockApplied) {
        for (const item of doc.items) {
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
              reason: `Bon de livraison ${doc.reference}`,
              userId: session.sub,
            },
          });
        }
      }

      await tx.document.update({
        where: { id },
        data: {
          status: "LIVRE",
          deliveredAt: new Date(),
          stockApplied: true,
        },
      });
    });
  } else if (target === "ANNULE" && doc.stockApplied) {
    // Annulation d'un BL déjà livré : on remet le stock.
    await prisma.$transaction(async (tx) => {
      for (const item of doc.items) {
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
            reason: `Annulation ${doc.reference}`,
            userId: session.sub,
          },
        });
      }

      await tx.document.update({
        where: { id },
        data: { status: "ANNULE", stockApplied: false },
      });
    });
  } else {
    await prisma.document.update({ where: { id }, data: { status: target } });
  }

  revalidatePath("/admin/factures");
  revalidatePath(`/admin/factures/${id}`);
  revalidatePath("/admin/stock");
  revalidatePath("/produits");
}

// ------------------------------------------------------------- conversions

/** Duplique un document vers un autre type, en conservant le chaînage. */
async function duplicateAs(
  sourceId: string,
  type: DocumentType,
  userId: string
): Promise<SaveDocumentResult> {
  const prisma = await db();
  const source = await prisma.document.findUnique({
    where: { id: sourceId },
    include: { items: { orderBy: { position: "asc" } } },
  });
  if (!source) return { ok: false, error: "Document source introuvable." };

  const settings = await getSettings();
  const now = new Date();
  const year = now.getFullYear();

  const dueDate =
    type === "FACTURE"
      ? new Date(now.getTime() + 30 * 24 * 3600 * 1000)
      : null;

  const tenantId = await currentTenantId();

  const created = await prisma.$transaction(async (tx) => {
    const number = await nextNumber(tx, tenantId, type, year);

    const doc = await tx.document.create({
      data: {
        type,
        year,
        number,
        reference: documentReference(type, year, number),
        status: "BROUILLON",
        clientName: source.clientName,
        clientPhone: source.clientPhone,
        clientAddress: source.clientAddress,
        clientNif: source.clientNif,
        clientRccm: source.clientRccm,
        customerId: source.customerId,
        issueDate: now,
        dueDate,
        validUntil: null,
        vatEnabled: type === "BON_LIVRAISON" ? false : source.vatEnabled,
        vatRate: type === "BON_LIVRAISON" ? 0 : source.vatRate,
        subtotal: source.subtotal,
        discount: source.discount,
        taxableBase: source.taxableBase,
        vatAmount: type === "BON_LIVRAISON" ? 0 : source.vatAmount,
        total: type === "BON_LIVRAISON" ? source.taxableBase : source.total,
        note: source.note,
        terms: type === "FACTURE" ? settings.paymentTerms : "",
        deliveryAddress: source.deliveryAddress ?? source.clientAddress,
        parentId: source.id,
        saleId: source.saleId,
        userId,
        items: {
          create: source.items.map((item) => ({
            productId: item.productId,
            position: item.position,
            name: item.name,
            description: item.description,
            unit: item.unit,
            unitPrice: item.unitPrice,
            quantity: item.quantity,
            discount: item.discount,
            lineTotal: item.lineTotal,
          })),
        },
      },
    });

    if (type === "FACTURE" && source.type === "PROFORMA") {
      await tx.document.update({
        where: { id: source.id },
        data: { status: "CONVERTI" },
      });
    }

    return doc;
  });

  revalidatePath("/admin/factures");
  revalidatePath(`/admin/factures/${sourceId}`);

  return { ok: true, id: created.id, reference: created.reference };
}

export async function convertToInvoiceAction(formData: FormData) {
  const prisma = await db();
  const session = await requireRole("GERANT");
  const id = String(formData.get("id") ?? "");

  const source = await prisma.document.findUnique({
    where: { id },
    select: { type: true, status: true },
  });
  if (!source || source.type !== "PROFORMA") return;
  if (source.status === "ANNULE" || source.status === "CONVERTI") return;

  const result = await duplicateAs(id, "FACTURE", session.sub);
  if (result.ok) redirect(`/admin/factures/${result.id}`);
}

export async function createDeliveryNoteAction(formData: FormData) {
  const prisma = await db();
  const session = await requireRole("GERANT");
  const id = String(formData.get("id") ?? "");

  const source = await prisma.document.findUnique({
    where: { id },
    select: { type: true, status: true },
  });
  if (!source) return;
  if (source.type === "BON_LIVRAISON") return;
  if (source.status === "ANNULE") return;

  const result = await duplicateAs(id, "BON_LIVRAISON", session.sub);
  if (result.ok) redirect(`/admin/factures/${result.id}`);
}

/** Crée une facture à partir d'une vente encaissée en caisse. */
export async function invoiceFromSaleAction(formData: FormData) {
  const prisma = await db();
  const session = await requireRole("GERANT");
  const saleId = String(formData.get("saleId") ?? "");

  const sale = await prisma.sale.findUnique({
    where: { id: saleId },
    include: { items: true, customer: true },
  });
  if (!sale || sale.status === "ANNULEE") return;

  const existing = await prisma.document.findFirst({
    where: { saleId, type: "FACTURE", status: { not: "ANNULE" } },
    select: { id: true },
  });
  if (existing) redirect(`/admin/factures/${existing.id}`);

  const settings = await getSettings();
  const now = new Date();
  const year = now.getFullYear();

  // Les prix de la caisse sont TTC : on reconstitue le HT si la TVA est active.
  const vatEnabled = settings.vatEnabledByDefault;
  const rate = vatEnabled ? settings.defaultVatRate : 0;
  const toHt = (ttc: number) =>
    vatEnabled ? Math.round(ttc / (1 + rate / 100)) : ttc;

  const lines = sale.items.map((item, index) => {
    const unitPrice = toHt(item.unitPrice);
    return {
      productId: item.productId,
      position: index,
      name: item.name,
      description: "",
      unit: null as string | null,
      unitPrice,
      quantity: item.quantity,
      discount: 0,
      lineTotal: unitPrice * item.quantity,
    };
  });

  const totals = computeTotals({
    lines,
    discount: toHt(sale.discount),
    vatEnabled,
    vatRate: rate,
  });

  const tenantId = await currentTenantId();

  const created = await prisma.$transaction(async (tx) => {
    const number = await nextNumber(tx, tenantId, "FACTURE", year);
    return tx.document.create({
      data: {
        type: "FACTURE",
        year,
        number,
        reference: documentReference("FACTURE", year, number),
        status: sale.due > 0 ? "PAYE_PARTIEL" : "PAYE",
        clientName: sale.customer?.name ?? "Client comptant",
        clientPhone: sale.customer?.phone ?? null,
        clientAddress: sale.customer?.address ?? null,
        clientNif: sale.customer?.nif ?? null,
        clientRccm: sale.customer?.rccm ?? null,
        customerId: sale.customerId,
        issueDate: sale.createdAt,
        vatEnabled,
        vatRate: rate,
        subtotal: totals.subtotal,
        discount: totals.discount,
        taxableBase: totals.taxableBase,
        vatAmount: totals.vatAmount,
        total: totals.total,
        paidAmount: sale.paid,
        terms: settings.paymentTerms,
        note: `Établie à partir de la vente n°${sale.number}.`,
        // Le stock a déjà été décrémenté par la caisse.
        stockApplied: true,
        saleId: sale.id,
        userId: session.sub,
        items: { create: lines },
      },
    });
  });

  revalidatePath("/admin/factures");
  redirect(`/admin/factures/${created.id}`);
}

// ------------------------------------------------------------- règlements

export async function recordDocumentPaymentAction(
  _prev: DocumentResult,
  formData: FormData
): Promise<DocumentResult> {
  const prisma = await db();
  const session = await requireRole("GERANT");

  const documentId = String(formData.get("documentId") ?? "");
  const amount = Math.round(Number(formData.get("amount") ?? 0));
  const method = String(formData.get("method") ?? "ESPECES") as
    | "ESPECES"
    | "ORANGE_MONEY"
    | "MTN_MOMO"
    | "VIREMENT";
  const note = String(formData.get("note") ?? "").trim();

  const doc = await prisma.document.findUnique({ where: { id: documentId } });
  if (!doc) return { error: "Document introuvable." };
  if (doc.type !== "FACTURE")
    return { error: "Seule une facture peut recevoir un règlement." };
  if (doc.status === "ANNULE") return { error: "Cette facture est annulée." };
  if (!Number.isFinite(amount) || amount <= 0)
    return { error: "Le montant doit être supérieur à 0." };

  const remaining = doc.total - doc.paidAmount;
  if (amount > remaining)
    return {
      error: `Le solde restant n'est que de ${remaining.toLocaleString("fr-FR")} GNF.`,
    };

  const paidAmount = doc.paidAmount + amount;

  await prisma.$transaction([
    prisma.documentPayment.create({
      data: { documentId, amount, method, note, userId: session.sub },
    }),
    prisma.document.update({
      where: { id: documentId },
      data: {
        paidAmount,
        status: paidAmount >= doc.total ? "PAYE" : "PAYE_PARTIEL",
      },
    }),
  ]);

  revalidatePath("/admin/factures");
  revalidatePath(`/admin/factures/${documentId}`);

  return { ok: "Règlement enregistré." };
}

// ------------------------------------------------------------- suppression

export async function deleteDraftAction(formData: FormData) {
  const prisma = await db();
  await requireRole("GERANT");
  const id = String(formData.get("id") ?? "");

  const doc = await prisma.document.findUnique({
    where: { id },
    select: { status: true },
  });
  if (!doc || doc.status !== "BROUILLON") return;

  await prisma.document.delete({ where: { id } });
  revalidatePath("/admin/factures");
  redirect("/admin/factures");
}

// ------------------------------------------------------------- helpers de page

export async function searchProductsForDocument(query: string) {
  const prisma = await db();
  await requireRole("GERANT");

  const where: Prisma.ProductWhereInput = { active: true };
  if (query.trim()) {
    where.OR = [
      { name: { contains: query, mode: "insensitive" } },
      { sku: { contains: query, mode: "insensitive" } },
    ];
  }

  return prisma.product.findMany({
    where,
    orderBy: { name: "asc" },
    take: 20,
    select: { id: true, name: true, price: true, unit: true, stock: true },
  });
}
