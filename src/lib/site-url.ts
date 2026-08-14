import "server-only";

import { cache } from "react";
import { headers } from "next/headers";

import { TENANT_HOST_HEADER } from "@/lib/tenant";

/**
 * URL publique de la requête courante.
 *
 * En multi-tenant, il n'y a plus une seule adresse : chaque boutique a la
 * sienne, et certaines ont un domaine personnalisé. Tout ce qui déclare une
 * adresse — métadonnées, sitemap, retours de paiement — doit passer par ici
 * plutôt que par une constante.
 */
export const currentOrigin = cache(async (): Promise<string> => {
  const store = await headers();

  const host =
    store.get(TENANT_HOST_HEADER) ??
    store.get("x-forwarded-host") ??
    store.get("host") ??
    process.env.NEXT_PUBLIC_ROOT_DOMAIN ??
    "localhost:3000";

  const cleanHost = host.split(",")[0].trim();
  const proto =
    store.get("x-forwarded-proto") ??
    (cleanHost.startsWith("localhost") || cleanHost.includes(".localhost")
      ? "http"
      : "https");

  return `${proto}://${cleanHost}`;
});
