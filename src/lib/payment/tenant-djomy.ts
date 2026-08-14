import "server-only";

import { platformDb } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { decryptSecret } from "@/lib/crypto";
import { isDjomyConfigured, type DjomyCredentials } from "./djomy";

/**
 * Clés Djomy d'un marchand. Chaque boutique encaisse avec les siennes ;
 * le secret est déchiffré à la volée et ne quitte jamais le serveur.
 */
export async function credentialsForTenant(
  tenantId: string
): Promise<DjomyCredentials> {
  const tenant = await platformDb.tenant.findUnique({
    where: { id: tenantId },
    select: { djomyClientId: true, djomyClientSecret: true, djomyEnabled: true },
  });

  if (!tenant?.djomyEnabled) return { clientId: "", clientSecret: "" };

  return {
    clientId: tenant.djomyClientId ?? "",
    clientSecret: decryptSecret(tenant.djomyClientSecret),
  };
}

/** Clés Djomy de la boutique de la requête courante. */
export async function currentTenantCredentials(): Promise<DjomyCredentials> {
  const tenant = await requireTenant();
  return credentialsForTenant(tenant.id);
}

/** Vrai si la boutique courante peut encaisser en ligne. */
export async function isTenantPaymentReady(): Promise<boolean> {
  return isDjomyConfigured(await currentTenantCredentials());
}
