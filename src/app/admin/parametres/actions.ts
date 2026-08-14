"use server";

import { revalidatePath } from "next/cache";

import { db, currentTenantId } from "@/lib/tenant-db";
import { requireRole } from "@/lib/auth";

export type SettingsState = { ok?: string; error?: string };

function text(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

export async function saveSettingsAction(
  _prev: SettingsState,
  formData: FormData
): Promise<SettingsState> {
  const prisma = await db();
  await requireRole("ADMIN");

  const companyName = text(formData, "companyName");
  if (!companyName) return { error: "La raison sociale est obligatoire." };

  const defaultVatRate = Math.round(Number(formData.get("defaultVatRate") ?? 18));
  if (!Number.isFinite(defaultVatRate) || defaultVatRate < 0 || defaultVatRate > 100)
    return { error: "Le taux de TVA doit être compris entre 0 et 100 %." };

  const proformaValidityDays = Math.round(
    Number(formData.get("proformaValidityDays") ?? 30)
  );
  if (!Number.isFinite(proformaValidityDays) || proformaValidityDays < 1)
    return { error: "La durée de validité doit être d'au moins 1 jour." };

  const data = {
    companyName,
    companyAddress: text(formData, "companyAddress"),
    companyPhone: text(formData, "companyPhone"),
    companyEmail: text(formData, "companyEmail"),
    whatsappNumber: text(formData, "whatsappNumber").replace(/[^\d]/g, ""),
    slogan: text(formData, "slogan"),
    nif: text(formData, "nif"),
    rccm: text(formData, "rccm"),
    bankName: text(formData, "bankName"),
    bankAccount: text(formData, "bankAccount"),
    bankIban: text(formData, "bankIban"),
    bankSwift: text(formData, "bankSwift"),
    defaultVatRate,
    vatEnabledByDefault: formData.get("vatEnabledByDefault") === "on",
    paymentTerms: text(formData, "paymentTerms"),
    proformaValidityDays,
    documentFooter: text(formData, "documentFooter"),
    signatureLabel: text(formData, "signatureLabel") || "Cachet et signature",
    shopEnabled: formData.get("shopEnabled") === "on",
    onlinePaymentEnabled: formData.get("onlinePaymentEnabled") === "on",
    minOrderAmount: Math.max(
      0,
      Math.round(Number(formData.get("minOrderAmount") ?? 0)) || 0
    ),
    orderConfirmation: text(formData, "orderConfirmation"),
  };

  const tenantId = await currentTenantId();

  await prisma.settings.upsert({
    where: { tenantId },
    update: data,
    create: data,
  });

  revalidatePath("/admin/parametres");
  revalidatePath("/admin/factures");
  revalidatePath("/commander");
  revalidatePath("/panier");

  return { ok: "Paramètres enregistrés." };
}
