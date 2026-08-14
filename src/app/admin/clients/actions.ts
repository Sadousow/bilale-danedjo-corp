"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { db } from "@/lib/tenant-db";
import { requireRole } from "@/lib/auth";

export type CustomerState = { error?: string; ok?: string };

export async function saveCustomerAction(
  _prev: CustomerState,
  formData: FormData
): Promise<CustomerState> {
  const prisma = await db();
  await requireRole("GERANT");

  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const creditLimit = Math.max(0, Math.round(Number(formData.get("creditLimit") ?? 0)));

  if (!name) return { error: "Le nom du client est obligatoire." };

  if (phone) {
    const existing = await prisma.customer.findUnique({ where: { phone } });
    if (existing && existing.id !== id) {
      return { error: "Ce numéro de téléphone est déjà associé à un autre client." };
    }
  }

  const data = {
    name,
    phone: phone || null,
    address: address || null,
    notes,
    creditLimit: Number.isFinite(creditLimit) ? creditLimit : 0,
    nif: String(formData.get("nif") ?? "").trim() || null,
    rccm: String(formData.get("rccm") ?? "").trim() || null,
  };

  if (id) {
    await prisma.customer.update({ where: { id }, data });
  } else {
    await prisma.customer.create({ data });
  }

  revalidatePath("/admin/clients");
  redirect("/admin/clients");
}

/** Encaisse un remboursement de crédit client. */
export async function recordPaymentAction(
  _prev: CustomerState,
  formData: FormData
): Promise<CustomerState> {
  const prisma = await db();
  const session = await requireRole("GERANT");

  const customerId = String(formData.get("customerId") ?? "");
  const amount = Math.round(Number(formData.get("amount") ?? 0));
  const method = String(formData.get("method") ?? "ESPECES") as
    | "ESPECES"
    | "ORANGE_MONEY"
    | "MTN_MOMO"
    | "VIREMENT";
  const note = String(formData.get("note") ?? "").trim();

  if (!customerId) return { error: "Client introuvable." };
  if (!Number.isFinite(amount) || amount <= 0)
    return { error: "Le montant doit être supérieur à 0." };

  const customer = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!customer) return { error: "Client introuvable." };
  if (amount > customer.creditBalance)
    return {
      error: `Ce client ne doit que ${customer.creditBalance.toLocaleString("fr-FR")} GNF.`,
    };

  await prisma.$transaction([
    prisma.payment.create({
      data: { customerId, amount, method, note, userId: session.sub },
    }),
    prisma.customer.update({
      where: { id: customerId },
      data: { creditBalance: { decrement: amount } },
    }),
  ]);

  revalidatePath("/admin/clients");
  revalidatePath(`/admin/clients/${customerId}`);

  return { ok: "Règlement enregistré." };
}
