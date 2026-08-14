import { PrismaClient } from "@prisma/client";

/**
 * Client Prisma brut, **sans filtre de tenant**.
 *
 * ⚠️ Réservé à trois usages :
 *   1. la résolution du tenant (`src/lib/tenant.ts`)
 *   2. les tables de plateforme (Tenant, TenantDomain, abonnements)
 *   3. la console super-admin et les scripts de maintenance
 *
 * Partout ailleurs, utiliser `db()` ou `tenantDb()` de `src/lib/tenant-db.ts`,
 * qui injectent et vérifient le `tenantId` sur chaque requête.
 * Une règle ESLint interdit d'importer ce module hors des chemins autorisés.
 */

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const platformDb =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = platformDb;

/** Vrai si une base de données est configurée. */
export const hasDatabase = Boolean(process.env.DATABASE_URL);
