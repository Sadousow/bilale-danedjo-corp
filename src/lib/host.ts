/**
 * Qui est qui, d'après l'adresse — analyse purement textuelle, sans base.
 *
 * C'est la première décision prise sur chaque requête : plateforme, boutique,
 * ou rien. Elle tourne sur l'edge, où aucune lecture n'est possible, et elle
 * conditionne tout le reste — la réécriture d'URL, la résolution du tenant, la
 * vérification de session.
 *
 * Ce module est séparé de `tenant.ts`, qui est `server-only` et parle à
 * Prisma : la logique la plus critique du produit méritait d'être testable
 * sans serveur ni base. `scripts/test-hote.mjs` s'en charge.
 */

/** Sous-domaines qui n'appartiennent à aucun marchand. */
export const RESERVED = new Set([
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

export type HostKind =
  | { kind: "platform" }
  | { kind: "subdomain"; slug: string }
  | { kind: "custom"; host: string };

function rootDomain(): string {
  return (process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "localhost:3000").toLowerCase();
}

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

  /*
   * Adresse de déploiement Vercel — `…-git-ma-branche-….vercel.app`.
   *
   * Sans ce cas, un aperçu de branche affichait « cette boutique n'existe
   * pas » sur toutes ses pages : le host ne correspond ni au domaine racine,
   * ni à un sous-domaine, ni à un domaine vérifié, donc il était traité comme
   * le domaine personnalisé d'un marchand inconnu.
   *
   * On le rattache à la zone plateforme, ce qui rend la vitrine, l'inscription
   * et la console consultables sur chaque aperçu. Les boutiques, elles,
   * restent hors d'atteinte : une adresse d'aperçu est un host unique, sans
   * joker, et aucun sous-domaine ne peut y pointer. Tester un marchand
   * demande le vrai domaine avec son `*.`.
   *
   * Aucun risque de collision : Vercel n'autorise pas un client à rattacher
   * un `.vercel.app` comme domaine personnalisé. Et si la racine était
   * elle-même en `.vercel.app`, les deux cas ci-dessus auraient déjà tranché.
   */
  if (hostname.endsWith(".vercel.app")) return { kind: "platform" };

  return { kind: "custom", host: hostname };
}

/** Vrai si le slug est utilisable pour une nouvelle boutique. */
export function isSlugAvailableFormat(slug: string): boolean {
  return (
    /^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])$/.test(slug) && !RESERVED.has(slug)
  );
}
