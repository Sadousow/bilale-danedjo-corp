import "server-only";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";

import { platformDb } from "@/lib/db";
import {
  checkThrottle,
  loginBuckets,
  registerFailure,
  registerSuccess,
} from "@/lib/throttle";
import {
  PLATFORM_COOKIE,
  platformCookieOptions,
  signPlatformSession,
  verifyPlatformSession,
  type PlatformSessionPayload,
} from "@/lib/session";

export type { PlatformSessionPayload };

/** Agent de la plateforme connecté, ou null. */
export async function getPlatformSession(): Promise<PlatformSessionPayload | null> {
  const store = await cookies();
  return verifyPlatformSession(store.get(PLATFORM_COOKIE)?.value);
}

export async function requirePlatformUser(): Promise<PlatformSessionPayload> {
  const session = await getPlatformSession();
  if (!session) redirect("/superadmin/connexion");
  return session;
}

export async function platformLogin(email: string, password: string) {
  // Ces comptes ouvrent la console de toutes les boutiques : c'est la porte
  // la plus intéressante du système, donc la plus exposée.
  const buckets = await loginBuckets("plateforme", email);

  const verdict = await checkThrottle(buckets);
  if (verdict.blocked) return { ok: false as const, error: verdict.message };

  const user = await platformDb.platformUser.findUnique({
    where: { email: email.trim().toLowerCase() },
  });

  if (!user || !user.active) {
    await registerFailure(buckets);
    return { ok: false as const, error: "Identifiants invalides." };
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    await registerFailure(buckets);
    return { ok: false as const, error: "Identifiants invalides." };
  }

  await registerSuccess(buckets);

  const token = await signPlatformSession({
    sub: user.id,
    email: user.email,
    name: user.name,
  });

  const store = await cookies();
  store.set(PLATFORM_COOKIE, token, platformCookieOptions);

  return { ok: true as const };
}

export async function platformLogout() {
  const store = await cookies();
  store.delete(PLATFORM_COOKIE);
}

// ------------------------------------------------------------- audit

type AuditAction =
  | "TENANT_CREE"
  | "TENANT_SUSPENDU"
  | "TENANT_REACTIVE"
  | "TENANT_RESILIE"
  | "OFFRE_CHANGEE"
  | "IMPERSONATION";

/**
 * Trace une action sensible. Le nom de la boutique et celui de l'agent sont
 * recopiés dans la ligne : le journal doit rester lisible même si la boutique
 * ou le compte disparaissent ensuite.
 */
export async function audit(input: {
  action: AuditAction;
  actor?: PlatformSessionPayload | null;
  tenantId?: string | null;
  tenantName?: string;
  details?: string;
}) {
  const store = await headers();
  const ip =
    store.get("x-forwarded-for")?.split(",")[0].trim() ??
    store.get("x-real-ip") ??
    "";

  try {
    await platformDb.auditLog.create({
      data: {
        action: input.action,
        tenantId: input.tenantId ?? null,
        tenantName: input.tenantName ?? "",
        platformUserId: input.actor?.sub ?? null,
        actorName: input.actor?.name ?? "",
        details: input.details ?? "",
        ip,
      },
    });
  } catch {
    // Le journal ne doit jamais faire échouer l'action elle-même.
  }
}
