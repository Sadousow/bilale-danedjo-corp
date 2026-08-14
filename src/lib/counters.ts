import "server-only";

import type { Prisma } from "@prisma/client";

/**
 * Numérotation séquentielle par tenant.
 *
 * Le compteur est incrémenté atomiquement : deux utilisateurs qui encaissent
 * au même instant ne peuvent pas obtenir le même numéro. Chaque tenant a sa
 * propre suite — les tickets de deux marchands ne se mélangent jamais.
 *
 * Clés utilisées : `SALE-2026`, `FACTURE-2026`, `PROFORMA-2026`,
 * `BON_LIVRAISON-2026`, `ORDER-2026`.
 */
export async function nextCounter(
  tx: Prisma.TransactionClient,
  tenantId: string,
  key: string
): Promise<number> {
  const counter = await tx.counter.upsert({
    where: { tenantId_key: { tenantId, key } },
    create: { key, value: 1 },
    update: { value: { increment: 1 } },
  });
  return counter.value;
}
