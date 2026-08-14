import "server-only";

import { cache } from "react";
import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { platformDb } from "@/lib/db";

/** En-tête interne posé par `src/proxy.ts`. */
export const TENANT_HOST_HEADER = "x-tenant-host";

/** Sous-domaines qui n'appartiennent à aucun marchand. */
const RESERVED = new Set([
  "www",
  "app",
  "api",
  "admin",
  "superadmin",
  "mail",
  "smtp",
  "ftp",
  "cdn",
  "static",
  "assets",
  "blog",
  "docs",
  "support",
  "status",
]);

export type ResolvedTenant = {
  id: string;
  slug: string;
  name: string;
  status: "ESSAI" | "ACTIF" | "SUSPENDU" | "RESILIE";
};

function rootDomain(): string {
  return (process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "localhost:3000").toLowerCase();
}

type HostKind =
  | { kind: "platform" }
  | { kind: "subdomain"; slug: string }
  | { kind: "custom"; host: string };

/**
 * Analyse purement textuelle du host — aucune requête en base.
 * C'est la seule partie qui peut tourner sur l'edge.
 */
export function classifyHost(rawHost: string | null | undefined): HostKind {
  const host = (rawHost ?? "").toLowerCase().split(",")[0].trim();
  if (!host) return { kind: "platform" };

  const root = rootDomain();
  const hostname = host.split(":")[0];
  const rootname = root.split(":")[0];

  if (hostname === rootname) return { kind: "platform" };

  if (hostname.endsWith(`.${rootname}`)) {
    const sub = hostname.slice(0, -(rootname.length + 1));
    // On ignore un éventuel « www. » de tête : www.bilale → bilale
    const slug = sub.startsWith("www.") ? sub.slice(4) : sub;

    if (!slug || slug.includes(".")) return { kind: "platform" };
    if (RESERVED.has(slug)) return { kind: "platform" };
    return { kind: "subdomain", slug };
  }

  return { kind: "custom", host: hostname };
}

/** Vrai si le slug est utilisable pour une nouvelle boutique. */
export function isSlugAvailableFormat(slug: string): boolean {
  return (
    /^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])$/.test(slug) && !RESERVED.has(slug)
  );
}

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
