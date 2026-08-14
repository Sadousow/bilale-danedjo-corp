"use server";

import { revalidatePath } from "next/cache";

import { platformDb } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { requireTenant } from "@/lib/tenant";
import { tenantHasFeature } from "@/lib/subscription";
import {
  attachDomainToVercel,
  newVerificationToken,
  normalizeHost,
  verifyDomainOwnership,
} from "@/lib/domains";

export type DomainState = { ok?: string; error?: string };

export async function addDomainAction(
  _prev: DomainState,
  formData: FormData
): Promise<DomainState> {
  await requireRole("ADMIN");
  const tenant = await requireTenant();

  /*
   * Le domaine personnalisé est vendu avec l'offre supérieure. Le contrôle
   * manquait : n'importe quel marchand pouvait brancher le sien depuis
   * l'offre la moins chère. C'est la seule fonction du catalogue qui n'était
   * pas verrouillée, et celle qui se monnaie le plus cher.
   */
  if (!(await tenantHasFeature("domain"))) {
    return {
      error:
        "Le nom de domaine personnalisé fait partie d'une offre supérieure. Changez d'offre depuis la page Abonnement pour l'activer.",
    };
  }

  const host = normalizeHost(String(formData.get("host") ?? ""));
  if (!host) {
    return {
      error: "Nom de domaine invalide. Exemple : maboutique.com",
    };
  }

  const root = (process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "").split(":")[0];
  if (root && (host === root || host.endsWith(`.${root}`))) {
    return {
      error: "Ce domaine appartient à la plateforme et ne peut pas être ajouté ici.",
    };
  }

  const existing = await platformDb.tenantDomain.findUnique({ where: { host } });
  if (existing) {
    return {
      error:
        existing.tenantId === tenant.id
          ? "Ce domaine est déjà enregistré pour votre boutique."
          : "Ce domaine est déjà utilisé par une autre boutique.",
    };
  }

  await platformDb.tenantDomain.create({
    data: {
      host,
      tenantId: tenant.id,
      verificationToken: newVerificationToken(),
    },
  });

  revalidatePath("/admin/parametres");
  return {
    ok: `${host} ajouté. Publiez les enregistrements DNS ci-dessous, puis lancez la vérification.`,
  };
}

export async function verifyDomainAction(
  _prev: DomainState,
  formData: FormData
): Promise<DomainState> {
  await requireRole("ADMIN");
  const tenant = await requireTenant();

  const id = String(formData.get("id") ?? "");
  const domain = await platformDb.tenantDomain.findFirst({
    where: { id, tenantId: tenant.id },
  });
  if (!domain) return { error: "Domaine introuvable." };

  const result = await verifyDomainOwnership(
    domain.host,
    domain.verificationToken
  );

  if (!result.ok) {
    const found = result.found?.length
      ? ` Valeurs trouvées : ${result.found.join(", ")}.`
      : "";
    return { error: `${result.error}${found}` };
  }

  const vercel = await attachDomainToVercel(domain.host);

  await platformDb.tenantDomain.update({
    where: { id: domain.id },
    data: { verified: true },
  });

  revalidatePath("/admin/parametres");

  return {
    ok: vercel.ok
      ? `${domain.host} est vérifié et actif.`
      : `${domain.host} est vérifié. ${vercel.message}`,
  };
}

export async function setPrimaryDomainAction(formData: FormData) {
  await requireRole("ADMIN");
  const tenant = await requireTenant();

  const id = String(formData.get("id") ?? "");
  const domain = await platformDb.tenantDomain.findFirst({
    where: { id, tenantId: tenant.id, verified: true },
  });
  if (!domain) return;

  await platformDb.$transaction([
    platformDb.tenantDomain.updateMany({
      where: { tenantId: tenant.id },
      data: { isPrimary: false },
    }),
    platformDb.tenantDomain.update({
      where: { id: domain.id },
      data: { isPrimary: true },
    }),
  ]);

  revalidatePath("/admin/parametres");
}

export async function deleteDomainAction(formData: FormData) {
  await requireRole("ADMIN");
  const tenant = await requireTenant();

  const id = String(formData.get("id") ?? "");
  await platformDb.tenantDomain.deleteMany({
    where: { id, tenantId: tenant.id },
  });

  revalidatePath("/admin/parametres");
}
