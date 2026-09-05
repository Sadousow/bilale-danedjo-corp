import "server-only";

import { cache } from "react";
import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { platformDb } from "@/lib/db";
import { classifyHost } from "@/lib/host";

/*
 * Réexportés pour ne pas casser les appelants : `classifyHost` reste
 * l'entrée naturelle depuis « le tenant ». La logique, elle, vit dans un
 * module pur et testable.
 */
export { classifyHost, isSlugAvailableFormat, RESERVED } from "@/lib/host";
export type { HostKind } from "@/lib/host";

/** En-tête interne posé par `src/proxy.ts`. */
export const TENANT_HOST_HEADER = "x-tenant-host";

export type ResolvedTenant = {
  id: string;
  slug: string;
  name: string;
  status: "ESSAI" | "ACTIF" | "SUSPENDU" | "RESILIE";
};

/**
 * Tenant de la requête courante, ou null si on est sur la zone plateforme
 * ou si le host ne correspond à aucune boutique.
 *
 * Mis en cache par requête : plusieurs appels ne déclenchent qu'une lecture.
 */
export const getTenant = cache(async (): Promise<ResolvedTenant | null> => {
  const store = await headers();
  const host =
    store.get(TENANT_HOST_HEADER) ??
    store.get("x-forwarded-host") ??
    store.get("host");

  const classified = classifyHost(host);
  if (classified.kind === "platform") return null;

  const select = {
    id: true,
    slug: true,
    name: true,
    status: true,
  } as const;

  try {
    if (classified.kind === "subdomain") {
      const tenant = await platformDb.tenant.findUnique({
        where: { slug: classified.slug },
        select,
      });
      return tenant as ResolvedTenant | null;
    }

    const domain = await platformDb.tenantDomain.findFirst({
      where: { host: classified.host, verified: true },
      select: { tenant: { select } },
    });
    return (domain?.tenant ?? null) as ResolvedTenant | null;
  } catch {
    return null;
  }
});

/** Tenant de la requête, ou 404. */
export async function requireTenant(): Promise<ResolvedTenant> {
  const tenant = await getTenant();
  if (!tenant || tenant.status === "RESILIE") notFound();
  return tenant;
}

/**
 * Boutique suspendue par la plateforme.
 *
 * À distinguer de la suspension **pour impayé**, qui vient de l'abonnement et
 * laisse volontairement la caisse ouverte : on ne coupe pas l'outil de
 * travail de quelqu'un à qui on réclame de l'argent.
 *
 * Celle-ci est décidée à la main, pour un motif grave — fraude, produits
 * illicites. Elle ferme **tout** : vitrine, back-office et caisse.
 *
 * Cette fonction existait déjà mais n'était appelée nulle part : suspendre
 * depuis la console ne faisait que changer une ligne en base.
 */
export function isTenantSuspended(tenant: ResolvedTenant): boolean {
  return tenant.status === "SUSPENDU";
}
