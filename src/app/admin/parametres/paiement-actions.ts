"use server";

import { revalidatePath } from "next/cache";

import { platformDb } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { requireTenant } from "@/lib/tenant";
import { encryptSecret } from "@/lib/crypto";

export type PaymentKeysState = { ok?: string; error?: string };

/**
 * Clés Djomy du marchand. Le secret est chiffré avant d'être écrit et n'est
 * jamais réaffiché : le formulaire propose de le laisser vide pour le
 * conserver tel quel.
 */
export async function savePaymentKeysAction(
  _prev: PaymentKeysState,
  formData: FormData
): Promise<PaymentKeysState> {
  await requireRole("ADMIN");
  const tenant = await requireTenant();

  const clientId = String(formData.get("djomyClientId") ?? "").trim();
  const clientSecret = String(formData.get("djomyClientSecret") ?? "").trim();
  const enabled = formData.get("djomyEnabled") === "on";

  const current = await platformDb.tenant.findUnique({
    where: { id: tenant.id },
    select: { djomyClientSecret: true },
  });

  const keepSecret = !clientSecret;
  const storedSecret = keepSecret
    ? current?.djomyClientSecret
    : encryptSecret(clientSecret);

  if (enabled && (!clientId || !storedSecret)) {
    return {
      error:
        "Renseignez la clé API et la clé secrète avant d'activer le paiement en ligne.",
    };
  }

  try {
    await platformDb.tenant.update({
      where: { id: tenant.id },
      data: {
        djomyClientId: clientId || null,
        djomyClientSecret: storedSecret ?? null,
        djomyEnabled: enabled,
      },
    });
  } catch (error) {
    // Typiquement : TENANT_SECRET_KEY absente ou trop courte.
    return {
      error:
        error instanceof Error
          ? error.message
          : "Enregistrement impossible. Vérifiez la configuration du serveur.",
    };
  }

  revalidatePath("/admin/parametres");
  revalidatePath("/commander");

  return {
    ok: enabled
      ? "Clés enregistrées. Le paiement en ligne est actif."
      : "Clés enregistrées. Le paiement en ligne reste désactivé.",
  };
}
