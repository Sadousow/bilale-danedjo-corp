import "server-only";

import { platformDb } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";

/**
 * Garde d'isolation multi-tenant.
 *
 * `tenantDb(id)` renvoie un client Prisma dérivé qui, pour chaque modèle
 * métier, injecte automatiquement `tenantId` dans les filtres et dans les
 * données créées. Aucune requête applicative ne doit utiliser `platformDb`.
 */

/** Modèles portant une colonne `tenantId`. */
const TENANT_SCOPED = new Set([
  "User",
  "Category",
  "Product",
  "Customer",
  "Sale",
  "SaleItem",
  "StockMovement",
  "Payment",
  "Counter",
  "Document",
  "DocumentItem",
  "DocumentPayment",
  "DeliveryZone",
  "Order",
  "OrderItem",
  "Settings",
]);

type Args = Record<string, unknown>;

function withTenant(where: unknown, tenantId: string): Args {
  return { ...((where as Args) ?? {}), tenantId };
}

function injectData(data: unknown, tenantId: string): unknown {
  if (Array.isArray(data)) {
    return data.map((item) => ({ ...(item as Args), tenantId }));
  }
  return { ...((data as Args) ?? {}), tenantId };
}

const cachedClients = new Map<string, ReturnType<typeof build>>();

function build(tenantId: string) {
  return platformDb.$extends({
    name: "tenant-guard",
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (!model || !TENANT_SCOPED.has(model)) {
            return query(args);
          }

          const a = (args ?? {}) as Args;

          switch (operation) {
            case "create":
              a.data = injectData(a.data, tenantId);
              break;

            case "createMany":
            case "createManyAndReturn":
              a.data = injectData(a.data, tenantId);
              break;

            case "upsert":
              a.create = injectData(a.create, tenantId);
              a.update = a.update ?? {};
              a.where = withTenant(a.where, tenantId);
              break;

            default:
              // findUnique, findFirst, findMany, update, updateMany, delete,
              // deleteMany, count, aggregate, groupBy…
              //
              // Depuis Prisma 5, le `where` d'un findUnique / update / delete
              // accepte des filtres non uniques en plus de la clé unique
              // (« extendedWhereUnique »). Ajouter `tenantId` transforme donc
              // une lecture croisée en « enregistrement introuvable ».
              a.where = withTenant(a.where, tenantId);
              break;
          }

          return query(a);
        },
      },
    },
  });
}

/** Client Prisma restreint à un tenant donné. */
export function tenantDb(tenantId: string) {
  if (!tenantId) {
    throw new Error("tenantDb appelé sans tenantId — requête refusée.");
  }
  let client = cachedClients.get(tenantId);
  if (!client) {
    client = build(tenantId);
    cachedClients.set(tenantId, client);
  }
  return client;
}

export type TenantDb = ReturnType<typeof tenantDb>;

/**
 * Client Prisma du tenant de la requête courante.
 * Lève un 404 si le host ne correspond à aucune boutique.
 *
 *   const prisma = await db();
 *   const produits = await prisma.product.findMany();
 */
export async function db(): Promise<TenantDb> {
  const tenant = await requireTenant();
  return tenantDb(tenant.id);
}

/** Identifiant du tenant de la requête courante. */
export async function currentTenantId(): Promise<string> {
  const tenant = await requireTenant();
  return tenant.id;
}
