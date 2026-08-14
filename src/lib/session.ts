import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "bdc_session";
const MAX_AGE_SECONDS = 60 * 60 * 12; // 12 h

export type Role = "ADMIN" | "GERANT" | "CAISSIER";

export type SessionPayload = {
  sub: string;
  email: string;
  name: string;
  role: Role;
  /** Boutique à laquelle appartient ce compte. */
  tenantId: string;
  tenantSlug: string;
  /** Nom de l'agent de la plateforme connecté « en tant que » ce marchand. */
  impersonatedBy?: string;
};

function secret(): Uint8Array {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 16) {
    throw new Error(
      "SESSION_SECRET manquant ou trop court (32 caractères minimum). Ajoutez-le dans .env"
    );
  }
  return new TextEncoder().encode(value);
}

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(secret());
}

export async function verifySession(
  token: string | undefined
): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (!payload.sub || !payload.role || !payload.tenantId) return null;
    return {
      sub: String(payload.sub),
      email: String(payload.email ?? ""),
      name: String(payload.name ?? ""),
      role: payload.role as Role,
      tenantId: String(payload.tenantId),
      tenantSlug: String(payload.tenantSlug ?? ""),
      impersonatedBy: payload.impersonatedBy
        ? String(payload.impersonatedBy)
        : undefined,
    };
  } catch {
    return null;
  }
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: MAX_AGE_SECONDS,
};

// ------------------------------------------------------- Session client (boutique)

export const SHOP_COOKIE = "bdc_client";
const SHOP_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 jours

export type ShopSessionPayload = {
  sub: string; // id du Customer
  name: string;
  phone: string;
  tenantId: string;
};

export async function signShopSession(
  payload: ShopSessionPayload
): Promise<string> {
  return new SignJWT({ ...payload, scope: "shop" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${SHOP_MAX_AGE_SECONDS}s`)
    .sign(secret());
}

export async function verifyShopSession(
  token: string | undefined
): Promise<ShopSessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (!payload.sub || payload.scope !== "shop" || !payload.tenantId) {
      return null;
    }
    return {
      sub: String(payload.sub),
      name: String(payload.name ?? ""),
      phone: String(payload.phone ?? ""),
      tenantId: String(payload.tenantId),
    };
  } catch {
    return null;
  }
}

export const shopCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: SHOP_MAX_AGE_SECONDS,
};

// ------------------------------------------------------- Session plateforme

export const PLATFORM_COOKIE = "bdc_platform";
const PLATFORM_MAX_AGE_SECONDS = 60 * 60 * 8; // 8 h

export type PlatformSessionPayload = {
  sub: string;
  email: string;
  name: string;
};

export async function signPlatformSession(
  payload: PlatformSessionPayload
): Promise<string> {
  return new SignJWT({ ...payload, scope: "platform" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${PLATFORM_MAX_AGE_SECONDS}s`)
    .sign(secret());
}

export async function verifyPlatformSession(
  token: string | undefined
): Promise<PlatformSessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (!payload.sub || payload.scope !== "platform") return null;
    return {
      sub: String(payload.sub),
      email: String(payload.email ?? ""),
      name: String(payload.name ?? ""),
    };
  } catch {
    return null;
  }
}

export const platformCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: PLATFORM_MAX_AGE_SECONDS,
};

// ------------------------------------------------------- Jeton d'impersonation

export type ImpersonationPayload = {
  tenantId: string;
  userId: string;
  actorName: string;
};

/**
 * Jeton à usage unique et courte durée, transmis dans l'URL pour ouvrir une
 * session sur le sous-domaine du marchand. Il évite de poser un cookie sur le
 * domaine parent, qui serait envoyé à toutes les boutiques.
 */
export async function signImpersonationToken(
  payload: ImpersonationPayload
): Promise<string> {
  return new SignJWT({ ...payload, scope: "impersonate" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("60s")
    .sign(secret());
}

export async function verifyImpersonationToken(
  token: string | undefined
): Promise<ImpersonationPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (payload.scope !== "impersonate" || !payload.tenantId) return null;
    return {
      tenantId: String(payload.tenantId),
      userId: String(payload.userId),
      actorName: String(payload.actorName ?? ""),
    };
  } catch {
    return null;
  }
}

/** Hiérarchie des rôles : ADMIN > GERANT > CAISSIER */
const rank: Record<Role, number> = { CAISSIER: 1, GERANT: 2, ADMIN: 3 };

export function hasRole(role: Role, minimum: Role): boolean {
  return rank[role] >= rank[minimum];
}
