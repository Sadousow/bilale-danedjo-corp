import Link from "next/link";
import { headers } from "next/headers";

import { TENANT_HOST_HEADER } from "@/lib/tenant";
import { classifyHost } from "@/lib/host";

export const dynamic = "force-dynamic";

/**
 * Page 404 racine. Elle sert deux cas très différents :
 *   — une adresse inconnue à l'intérieur d'une boutique existante
 *   — un sous-domaine qui ne correspond à aucune boutique
 *
 * On distingue les deux pour ne pas laisser un visiteur croire que la
 * boutique existe et qu'elle est vide.
 */
export default async function NotFound() {
  const store = await headers();
  const host =
    store.get(TENANT_HOST_HEADER) ??
    store.get("x-forwarded-host") ??
    store.get("host");

  const classified = classifyHost(host);
  const root = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "localhost:3000";
  const unknownShop = classified.kind !== "platform";

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-16 bg-slate-50">
      <div className="max-w-md text-center">
        <p className="font-display text-6xl font-bold text-brand-blue/20">404</p>

        {unknownShop ? (
          <>
            <h1 className="mt-4 font-display text-2xl font-bold text-brand-blue">
              Cette boutique n&apos;existe pas
            </h1>
            <p className="mt-3 text-slate-600">
              L&apos;adresse{" "}
              <span className="font-medium text-slate-800">{host}</span>
              {" ne correspond à aucune boutique. Vérifiez l'orthographe, ou "}
              demandez le bon lien au commerçant.
            </p>
            <a
              href={`https://${root}`}
              className="mt-8 inline-block bg-brand-blue hover:bg-brand-blue-light text-white font-semibold px-6 py-3 rounded-md transition-colors"
            >
              Découvrir la plateforme
            </a>
          </>
        ) : (
          <>
            <h1 className="mt-4 font-display text-2xl font-bold text-brand-blue">
              Page introuvable
            </h1>
            <p className="mt-3 text-slate-600">
              Cette page n&apos;existe pas ou a été déplacée.
            </p>
            <Link
              href="/"
              className="mt-8 inline-block bg-brand-blue hover:bg-brand-blue-light text-white font-semibold px-6 py-3 rounded-md transition-colors"
            >
              Retour à l&apos;accueil
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
