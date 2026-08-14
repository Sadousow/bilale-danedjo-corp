import type { MetadataRoute } from "next";

import { getTenant } from "@/lib/tenant";
import { currentOrigin } from "@/lib/site-url";

export const dynamic = "force-dynamic";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const [tenant, base] = await Promise.all([getTenant(), currentOrigin()]);

  // Boutique inconnue, en essai ou suspendue : on n'indexe rien.
  const indexable = !tenant || tenant.status === "ACTIF";

  if (!indexable) {
    return { rules: [{ userAgent: "*", disallow: "/" }] };
  }

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/pos",
          "/login",
          "/compte",
          "/panier",
          "/commander",
          "/commande",
          "/api",
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
