import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { platformDb } from "@/lib/db";
import { getTenant } from "@/lib/tenant";
import {
  SESSION_COOKIE,
  sessionCookieOptions,
  signSession,
  verifyImpersonationToken,
  type Role,
} from "@/lib/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Redirection relative, volontairement écrite à la main.
 *
 * `NextResponse.redirect(new URL("/admin", request.url))` produisait
 * `http://localhost:3000/admin` : dans un gestionnaire de route Node,
 * `request.url` porte l'origine du serveur, pas le sous-domaine visité. La
 * session était bien créée puis l'agent atterrissait sur la plateforme, sans
 * message, en croyant être chez le marchand. Un `Location` relatif est résolu
 * par le navigateur contre l'adresse réellement demandée — donc toujours la
 * bonne boutique, en développement comme en production.
 */
function redirectTo(path: string): NextResponse {
  return new NextResponse(null, { status: 303, headers: { Location: path } });
}

/**
 * Échange un jeton d'impersonation contre une session sur cette boutique.
 *
 * Le jeton est émis par la console plateforme, vaut 60 secondes, et n'est
 * accepté que sur le sous-domaine de la boutique qu'il désigne. La session
 * résultante porte le nom de l'agent, affiché en bandeau dans le back-office.
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("jeton") ?? undefined;
  const payload = await verifyImpersonationToken(token);

  if (!payload) {
    return redirectTo("/login?erreur=lien-expire");
  }

  // Le jeton doit désigner la boutique dont on visite le domaine.
  const tenant = await getTenant();
  if (!tenant || tenant.id !== payload.tenantId) {
    return redirectTo("/login?erreur=boutique-incorrecte");
  }

  const user = await platformDb.user.findFirst({
    where: { id: payload.userId, tenantId: tenant.id, active: true },
    select: { id: true, email: true, name: true, role: true },
  });

  if (!user) {
    return redirectTo("/login?erreur=compte-introuvable");
  }

  const session = await signSession({
    sub: user.id,
    email: user.email,
    name: user.name,
    role: user.role as Role,
    tenantId: tenant.id,
    tenantSlug: tenant.slug,
    impersonatedBy: payload.actorName,
  });

  const response = redirectTo("/admin");
  response.cookies.set(SESSION_COOKIE, session, sessionCookieOptions);
  return response;
}
