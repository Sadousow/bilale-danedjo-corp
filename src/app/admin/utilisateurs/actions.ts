"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/lib/tenant-db";
import { requireRole, hashPassword } from "@/lib/auth";
import { userQuota } from "@/lib/subscription";

export type UserState = { error?: string; ok?: string };

const ROLES = ["ADMIN", "GERANT", "CAISSIER"] as const;
type RoleValue = (typeof ROLES)[number];

export async function createUserAction(
  _prev: UserState,
  formData: FormData
): Promise<UserState> {
  const prisma = await db();
  await requireRole("ADMIN");

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const role = String(formData.get("role") ?? "CAISSIER") as RoleValue;

  if (!name) return { error: "Le nom est obligatoire." };
  if (!email.includes("@")) return { error: "Adresse email invalide." };
  if (password.length < 8)
    return { error: "Le mot de passe doit contenir au moins 8 caractères." };
  if (!ROLES.includes(role)) return { error: "Rôle inconnu." };

  if (await prisma.user.findFirst({ where: { email } })) {
    return { error: "Un compte existe déjà avec cette adresse email." };
  }

  const quota = await userQuota();
  if (!quota.allowed) return { error: quota.message };

  await prisma.user.create({
    data: { name, email, role, passwordHash: await hashPassword(password) },
  });

  revalidatePath("/admin/utilisateurs");
  return { ok: `Compte créé pour ${name}.` };
}

export async function resetPasswordAction(
  _prev: UserState,
  formData: FormData
): Promise<UserState> {
  const prisma = await db();
  await requireRole("ADMIN");

  const id = String(formData.get("id") ?? "");
  const password = String(formData.get("password") ?? "");

  if (!id) return { error: "Utilisateur introuvable." };
  if (password.length < 8)
    return { error: "Le mot de passe doit contenir au moins 8 caractères." };

  await prisma.user.update({
    where: { id },
    data: { passwordHash: await hashPassword(password) },
  });

  revalidatePath("/admin/utilisateurs");
  return { ok: "Mot de passe mis à jour." };
}

export async function toggleUserAction(formData: FormData) {
  const prisma = await db();
  const session = await requireRole("ADMIN");
  const id = String(formData.get("id") ?? "");
  if (id === session.sub) return; // on ne se désactive pas soi-même

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return;

  /*
   * Même garde-fou que pour les produits : le quota ne compte que les
   * comptes actifs, donc réactiver doit repasser par le contrôle. Sinon
   * désactiver, créer, puis réactiver suffisait à dépasser la limite.
   */
  if (!user.active) {
    const quota = await userQuota();
    if (!quota.allowed) return;
  }

  await prisma.user.update({ where: { id }, data: { active: !user.active } });
  revalidatePath("/admin/utilisateurs");
}

export async function changeRoleAction(formData: FormData) {
  const prisma = await db();
  const session = await requireRole("ADMIN");
  const id = String(formData.get("id") ?? "");
  const role = String(formData.get("role") ?? "") as RoleValue;

  if (id === session.sub) return; // on ne change pas son propre rôle
  if (!ROLES.includes(role)) return;

  await prisma.user.update({ where: { id }, data: { role } });
  revalidatePath("/admin/utilisateurs");
}
