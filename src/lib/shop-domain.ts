/**
 * Adresse d'une boutique sur le domaine racine, et décision de la rattacher.
 *
 * Module **pur** : aucune requête, aucun accès réseau. Séparé de `domains.ts`
 * pour être testable d'un trait par `npm run test:domaines` — la règle qui
 * décide quand on appelle l'API Vercel ne doit pas dépendre d'un `fetch`.
 *
 * ── Pourquoi ce rattachement existe ─────────────────────────────────────────
 *
 * Le DNS et le certificat sont deux choses distinctes, et on ne s'en aperçoit
 * qu'au moment où ça casse :
 *
 *   - l'enregistrement `*` chez Cloudflare fait **résoudre** `bilale.guygou.com`
 *   - mais Vercel ne présente un certificat que pour les noms **déclarés sur le
 *     projet**
 *
 * Sans déclaration, le navigateur atteint bien le serveur et se fait claquer la
 * porte au nez : `ERR_SSL_VERSION_OR_CIPHER_MISMATCH` en direct, ou erreur 525
 * si Cloudflare proxifie. La boutique existe, son adresse résout, et elle est
 * inaccessible.
 *
 * Vercel émet un certificat par nom d'hôte dès qu'il est déclaré, sans
 * intervention. Il suffit donc d'appeler l'API à la création du tenant.
 */

/**
 * Domaine racine de la plateforme, sans port.
 *
 * En développement, `NEXT_PUBLIC_ROOT_DOMAIN` vaut `localhost:3000`. Le port
 * n'a rien à faire dans un nom d'hôte déclaré chez un hébergeur.
 */
export function rootDomain(): string {
  return (process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "")
    .trim()
    .toLowerCase()
    .split(":")[0];
}

/** Adresse publique d'une boutique : `bilale` → `bilale.guygou.com`. */
export function shopHost(slug: string, root = rootDomain()): string | null {
  const s = (slug ?? "").trim().toLowerCase();
  if (!s || !root) return null;
  return `${s}.${root}`;
}

export type RaisonNonRattachement =
  | "domaine-racine-absent"
  | "developpement-local"
  | "slug-invalide";

export type DecisionRattachement =
  | { rattacher: true; host: string }
  | { rattacher: false; raison: RaisonNonRattachement };

/**
 * Faut-il déclarer cette boutique chez l'hébergeur ?
 *
 * On refuse en local : déclarer `bilale.localhost` sur un projet Vercel
 * produirait une erreur à chaque inscription de test, et polluerait la liste
 * des domaines du projet avec des noms qui ne résoudront jamais.
 */
export function decideRattachement(
  slug: string,
  root = rootDomain()
): DecisionRattachement {
  if (!root) return { rattacher: false, raison: "domaine-racine-absent" };

  /*
   * `localhost`, `lvh.me` et les adresses IP sont des racines de
   * développement. `lvh.me` résout vers 127.0.0.1 — c'est le repli documenté
   * dans DEPLOIEMENT-SAAS.md quand le navigateur ne gère pas les
   * sous-domaines de localhost.
   */
  const local =
    root === "localhost" ||
    root.endsWith(".localhost") ||
    root === "lvh.me" ||
    root.endsWith(".lvh.me") ||
    /^\d{1,3}(\.\d{1,3}){3}$/.test(root) ||
    !root.includes(".");

  if (local) return { rattacher: false, raison: "developpement-local" };

  const host = shopHost(slug, root);
  if (!host) return { rattacher: false, raison: "slug-invalide" };

  return { rattacher: true, host };
}
