import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { SESSION_COOKIE, hasRole, verifySession } from "@/lib/session";
import { TENANT_HOST_HEADER, classifyHost } from "@/lib/tenant";
import { PATHNAME_HEADER } from "@/lib/plans";
import {
  contentSecurityPolicy,
  isFramableBySelf,
  originOf,
  securityHeaders,
} from "@/lib/security-headers";
import { PREVIEW_HEADER } from "@/lib/home-draft-shared";

/**
 * Point d'entrée de chaque requête.
 * Next.js 16 : le fichier `middleware` a été renommé `proxy`.
 *
 * Quatre responsabilités :
 *   1. poser les en-têtes de sécurité, dont la CSP et son nonce
 *   2. transmettre le host au reste de l'application (résolution du tenant)
 *   3. aiguiller le domaine racine vers la zone plateforme, par réécriture
 *      d'URL — l'adresse affichée reste propre
 *   4. protéger /admin et /pos, et vérifier que la session appartient bien
 *      au tenant du host
 */

// Lues une fois : sur l'edge, ces valeurs sont figées à la compilation.
const STORAGE_PUBLIC_ORIGIN = originOf(process.env.S3_PUBLIC_URL);
const STORAGE_API_ORIGIN = originOf(process.env.S3_ENDPOINT);
const IS_DEV = process.env.NODE_ENV === "development";
// CSP_REPORT_ONLY=1 : la politique est annoncée mais rien n'est bloqué.
const REPORT_ONLY = process.env.CSP_REPORT_ONLY === "1";

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  const host =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "";

  // Un nonce par requête. Next le relit dans l'en-tête CSP et l'applique
  // lui-même à ses balises <script> pendant le rendu.
  const nonce = crypto.randomUUID().replace(/-/g, "");
  const options = {
    nonce,
    isDev: IS_DEV,
    storagePublicOrigin: STORAGE_PUBLIC_ORIGIN,
    storageApiOrigin: STORAGE_API_ORIGIN,
    reportOnly: REPORT_ONLY,
    framableBySelf: isFramableBySelf(pathname),
  };
  const headers = securityHeaders(options);

  // Le proxy tourne sur l'edge : il ne peut pas interroger la base.
  // Il se contente d'une analyse textuelle et passe le host en en-tête ;
  // la traduction en tenantId se fait côté serveur, avec mise en cache.
  const classified = classifyHost(host);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(TENANT_HOST_HEADER, host);
  requestHeaders.set("x-nonce", nonce);

  // Une mise en page ne connaît pas le chemin demandé. Le back-office en a
  // besoin : quand la boutique est fermée pour impayé, seules quelques
  // sections restent ouvertes, et c'est la mise en page qui doit trancher —
  // poser la garde dans chacune des vingt pages serait un oubli programmé.
  requestHeaders.set(PATHNAME_HEADER, pathname);

  // Une mise en page ne reçoit pas les paramètres d'URL. On traduit donc
  // `?apercu=1` en en-tête, pour que le thème du brouillon s'applique dès la
  // mise en page. L'en-tête entrant est écrasé : lui seul ne donne aucun
  // droit, la session administrateur est vérifiée côté serveur.
  requestHeaders.set(
    PREVIEW_HEADER,
    request.nextUrl.searchParams.get("apercu") === "1" ? "1" : "0"
  );
  // Toujours l'en-tête bloquant côté *requête* : c'est là que Next lit le
  // nonce pour l'appliquer à ses balises <script>. En mode observation, seule
  // la réponse change de nom d'en-tête — les nonces restent posés, ce qui
  // permet de basculer en blocage sans rien changer d'autre.
  requestHeaders.set(
    "Content-Security-Policy",
    contentSecurityPolicy({ ...options, reportOnly: false })
  );

  /** Toute réponse sortant d'ici passe par là : aucun chemin sans en-têtes. */
  const secure = (response: NextResponse) => {
    for (const [key, value] of Object.entries(headers)) {
      response.headers.set(key, value);
    }
    return response;
  };

  const forward = () =>
    secure(NextResponse.next({ request: { headers: requestHeaders } }));

  // ------------------------------------------------------ zone plateforme

  if (classified.kind === "platform") {
    // Les routes techniques ne sont pas réécrites.
    if (pathname.startsWith("/api") || pathname.startsWith("/plateforme")) {
      return forward();
    }

    // Le back-office et la caisse n'existent que sur une boutique.
    if (
      pathname.startsWith("/admin") ||
      pathname.startsWith("/pos") ||
      pathname === "/login"
    ) {
      return secure(NextResponse.redirect(new URL("/", request.url)));
    }

    const url = request.nextUrl.clone();
    url.pathname = `/plateforme${pathname === "/" ? "" : pathname}`;
    return secure(
      NextResponse.rewrite(url, { request: { headers: requestHeaders } })
    );
  }

  // ------------------------------------------------------ zone boutique

  const isProtected =
    pathname.startsWith("/admin") ||
    pathname.startsWith("/pos") ||
    pathname === "/login";

  if (!isProtected) return forward();

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = await verifySession(token);

  // Une session émise pour une autre boutique n'a aucune valeur ici.
  const sameTenant =
    session !== null &&
    (classified.kind !== "subdomain" || session.tenantSlug === classified.slug);

  if (pathname === "/login") {
    if (session && sameTenant) {
      const target = session.role === "CAISSIER" ? "/pos" : "/admin";
      return secure(NextResponse.redirect(new URL(target, request.url)));
    }
    return forward();
  }

  if (!session || !sameTenant) {
    const url = new URL("/login", request.url);
    url.searchParams.set("suivant", pathname + search);
    const response = secure(NextResponse.redirect(url));
    if (session && !sameTenant) response.cookies.delete(SESSION_COOKIE);
    return response;
  }

  // Le back-office demande au minimum le rôle GERANT
  if (pathname.startsWith("/admin") && !hasRole(session.role, "GERANT")) {
    return secure(NextResponse.redirect(new URL("/pos", request.url)));
  }

  return forward();
}

export const config = {
  matcher: [
    /*
     * Toutes les routes sauf les fichiers statiques : le host doit être
     * transmis partout, pas seulement sur les zones protégées.
     */
    "/((?!_next/static|_next/image|favicon.ico|brand/|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|txt|xml)$).*)",
  ],
};
