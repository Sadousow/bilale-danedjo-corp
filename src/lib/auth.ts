import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";

import { db } from "@/lib/tenant-db";
import { isTenantSuspended, requireTenant } from "@/lib/tenant";
import {
  checkThrottle,
  loginBuckets,
  registerFailure,
  registerSuccess,
} from "@/lib/throttle";
import {
  SESSION_COOKIE,
  hasRole,
  sessionCookieOptions,
  signSession,
  verifySession,
  type Role,
  type SessionPayload,
} from "@/lib/session";

export type { Role, SessionPayload };

/**
 * Session du personnel, vérifiée contre le tenant du host.
 * Un jeton émis pour une autre boutique est ignoré.
 */
export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const session = await verifySession(store.get(SESSION_COOKIE)?.value);
  if (!session) return null;

  const tenant = await requireTenant();
  if (session.tenantId !== tenant.id) return null;

  return session;
}

/** Session courante, redirige vers /login si absente. */
export async function requireSession(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

/** Session courante avec un rôle minimum, sinon redirection. */
export async function requireRole(minimum: Role): Promise<SessionPayload> {
  const session = await requireSession();
  // Pas les droits : on renvoie vers la caisse, accessible à tous les rôles.
  if (!hasRole(session.role, minimum)) redirect("/pos");
  return session;
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(
  plain: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/** Vérifie les identifiants et pose le cookie de session. */
export async function createSessionFor(email: string, password: string) {
  const tenant = await requireTenant();
  const prisma = await db();

  // Le compteur est propre à la boutique : un attaquant qui s'acharne sur
  // une boutique ne doit pas verrouiller le même email chez une autre.
  const buckets = await loginBuckets(`staff:${tenant.id}`, email);

  // Avant bcrypt : c'est le calcul du hachage qui coûte cher, donc c'est lui
  // que la limitation doit protéger.
  const verdict = await checkThrottle(buckets);
  if (verdict.blocked) return { ok: false as const, error: verdict.message };

  // Boutique suspendue : aucune session n'est ouverte. Bloquer seulement à
  // l'affichage laisserait un jeton valide circuler.
  if (isTenantSuspended(tenant)) {
    return {
      ok: false as const,
      error: "Ce compte est suspendu. Contactez la plateforme.",
    };
  }

  const user = await prisma.user.findFirst({
    where: { email: email.trim().toLowerCase() },
  });

  if (!user || !user.active) {
    await registerFailure(buckets);
    return { ok: false as const, error: "Identifiants invalides." };
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    await registerFailure(buckets);
    return { ok: false as const, error: "Identifiants invalides." };
  }

  await registerSuccess(buckets);

  const token = await signSession({
    sub: user.id,
    email: user.email,
    name: user.name,
    role: user.role as Role,
    tenantId: tenant.id,
    tenantSlug: tenant.slug,
  });

  const store = await cookies();
  store.set(SESSION_COOKIE, token, sessionCookieOptions);

  return { ok: true as const, role: user.role as Role };
}

export async function destroySession() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}
