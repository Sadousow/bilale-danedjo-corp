import type { MetadataRoute } from "next";

import { getTenant } from "@/lib/tenant";
import { currentOrigin } from "@/lib/site-url";

export const dynamic = "force-dynamic";

/**
 * Un sitemap par boutique, construit depuis le host de la requête.
 * Sur le domaine racine, on ne référence que la vitrine de la plateforme.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [tenant, base] = await Promise.all([getTenant(), currentOrigin()]);
  const now = new Date();

  if (!tenant) {
    return [
      { url: base, lastModified: now, changeFrequency: "weekly", priority: 1 },
      {
        url: `${base}/inscription`,
        lastModified: now,
        changeFrequency: "monthly",
        priority: 0.8,
      },
    ];
  }

  // Une boutique suspendue ou en essai n'a pas vocation à être indexée.
  if (tenant.status !== "ACTIF") return [];

  const routes = ["", "/a-propos", "/produits", "/promotions", "/contact", "/faq"];

  return routes.map((route) => ({
    url: `${base}${route}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: route === "" ? 1 : 0.8,
  }));
}
