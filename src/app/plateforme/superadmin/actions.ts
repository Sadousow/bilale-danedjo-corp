"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { platformDb } from "@/lib/db";
import {
  audit,
  platformLogin,
  platformLogout,
  requirePlatformUser,
} from "@/lib/platform-auth";
import { createTenant, suggestSlug } from "@/lib/provisioning";
import { signImpersonationToken } from "@/lib/session";

export type ConsoleState = { ok?: string; error?: string };

// ------------------------------------------------------------- connexion

export async function platformLoginAction(
  _prev: ConsoleState,
  formData: FormData
): Promise<ConsoleState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Renseignez votre email et votre mot de passe." };
  }

  const result = await platformLogin(email, password);
  if (!result.ok) return { error: result.error };

  redirect("/superadmin");
}

export async function platformLogoutAction() {
  await platformLogout();
  redirect("/superadmin/connexion");
}

// ------------------------------------------------------------- boutiques

export async function createTenantAction(
  _prev: ConsoleState,
  formData: FormData
): Promise<ConsoleState> {
  const actor = await requirePlatformUser();

  const name = String(formData.get("name") ?? "");
  const result = await createTenant({
    slug: suggestSlug(String(formData.get("slug") ?? "") || name),
    name,
    adminName: String(formData.get("adminName") ?? ""),
    adminEmail: String(formData.get("adminEmail") ?? ""),
    password: String(formData.get("password") ?? ""),
    status: "ACTIF",
  });

  if (!result.ok) return { error: result.error };

  await audit({
    action: "TENANT_CREE",
    actor,
    tenantId: result.tenantId,
    tenantName: name,
    details: "Création depuis la console",
  });

  revalidatePath("/superadmin");
  return { ok: `Boutique « ${name} » créée sur ${result.slug}.` };
}

export async function changeTenantStatusAction(formData: FormData) {
  const actor = await requirePlatformUser();

  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "") as
    | "ESSAI"
    | "ACTIF"
    | "SUSPENDU"
    | "RESILIE";

  if (!["ESSAI", "ACTIF", "SUSPENDU", "RESILIE"].includes(status)) return;

  const tenant = await platformDb.tenant.findUnique({ where: { id } });
  if (!tenant) return;

  await platformDb.tenant.update({ where: { id }, data: { status } });

  await audit({
    action:
      status === "SUSPENDU"
        ? "TENANT_SUSPENDU"
        : status === "RESILIE"
          ? "TENANT_RESILIE"
          : "TENANT_REACTIVE",
    actor,
    tenantId: tenant.id,
    tenantName: tenant.name,
    details: `${tenant.status} → ${status}`,
  });

  revalidatePath("/superadmin");
  revalidatePath(`/superadmin/boutiques/${id}`);
}

// ------------------------------------------------------------- impersonation

export type ImpersonateState = { url?: string; error?: string };

/**
 * Ouvre une session sur la boutique du marchand, pour le support.
 *
 * Le jeton est valable 60 secondes et transite par l'URL du sous-domaine :
 * poser un cookie sur le domaine parent l'enverrait à toutes les boutiques.
 * L'action est systématiquement tracée.
 *
 * **L'adresse est renvoyée, pas suivie.** `redirect()` vers une autre origine
 * depuis une action serveur ne quitte pas le domaine : le routeur suit la
 * redirection en `fetch`, le cookie est posé sur une réponse que le
 * navigateur jette, et l'agent se retrouve sur la plateforme en croyant être
 * chez le marchand. C'est le composant client qui fait la vraie navigation.
 */
export async function impersonateAction(
  _prev: ImpersonateState,
  formData: FormData
): Promise<ImpersonateState> {
  const actor = await requirePlatformUser();
  const id = String(formData.get("id") ?? "");

  const tenant = await platformDb.tenant.findUnique({
    where: { id },
    select: { id: true, slug: true, name: true },
  });
  if (!tenant) return { error: "Boutique introuvable." };

  const admin = await platformDb.user.findFirst({
    where: { tenantId: tenant.id, role: "ADMIN", active: true },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true },
  });

  if (!admin) {
    return {
      error:
        "Cette boutique n'a aucun administrateur actif : impossible d'ouvrir une session en son nom.",
    };
  }

  await audit({
    action: "IMPERSONATION",
    actor,
    tenantId: tenant.id,
    tenantName: tenant.name,
    details: `Connexion en tant que ${admin.name}`,
  });

  const token = await signImpersonationToken({
    tenantId: tenant.id,
    userId: admin.id,
    actorName: actor.name,
  });

  const root = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "localhost:3000";
  const protocol = root.startsWith("localhost") ? "http" : "https";

  return {
    url: `${protocol}://${tenant.slug}.${root}/api/impersonation?jeton=${encodeURIComponent(token)}`,
  };
}
