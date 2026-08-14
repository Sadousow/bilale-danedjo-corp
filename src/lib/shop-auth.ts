import "server-only";

import { cookies } from "next/headers";
import bcrypt from "bcryptjs";

import { db } from "@/lib/tenant-db";
import { requireTenant } from "@/lib/tenant";
import { normalizePhone } from "@/lib/orders";
import {
  sendAccountRecovery,
  sendEmailVerification,
} from "@/lib/email-verification";
import {
  checkThrottle,
  loginBuckets,
  registerFailure,
  registerSuccess,
} from "@/lib/throttle";
import {
  SHOP_COOKIE,
  shopCookieOptions,
  signShopSession,
  verifyShopSession,
  type ShopSessionPayload,
} from "@/lib/session";

export type { ShopSessionPayload };

/** Client connecté sur cette boutique, ou null. */
export async function getShopSession(): Promise<ShopSessionPayload | null> {
  const store = await cookies();
  const session = await verifyShopSession(store.get(SHOP_COOKIE)?.value);
  if (!session) return null;

  const tenant = await requireTenant();
  if (session.tenantId !== tenant.id) return null;

  return session;
}

async function openSession(customer: {
  id: string;
  name: string;
  phone: string | null;
}) {
  const tenant = await requireTenant();
  const token = await signShopSession({
    sub: customer.id,
    name: customer.name,
    phone: customer.phone ?? "",
    tenantId: tenant.id,
  });
  const store = await cookies();
  store.set(SHOP_COOKIE, token, shopCookieOptions);
}

export async function shopRegister(input: {
  name: string;
  email: string;
  phone: string;
  password: string;
  address?: string;
}) {
  const prisma = await db();

  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  const phone = normalizePhone(input.phone);

  if (!name) return { ok: false as const, error: "Votre nom est obligatoire." };
  if (!email.includes("@"))
    return { ok: false as const, error: "Adresse email invalide." };
  if (!phone)
    return { ok: false as const, error: "Numéro de téléphone invalide." };
  if (input.password.length < 8)
    return {
      ok: false as const,
      error: "Le mot de passe doit contenir au moins 8 caractères.",
    };

  const byEmail = await prisma.customer.findFirst({ where: { email } });

  if (byEmail?.passwordHash) {
    return {
      ok: false as const,
      error: "Un compte existe déjà avec cette adresse email.",
    };
  }

  /*
   * Un client sans mot de passe existe déjà à cette adresse : il a été créé
   * lors d'un achat en caisse, et il porte son historique de commandes et
   * parfois un solde de crédit.
   *
   * Ce compte n'est PAS rattaché ici. Auparavant il l'était, et connaître
   * l'adresse email d'un client suffisait donc à prendre son compte. On
   * envoie désormais un lien à cette adresse : l'ouvrir est la preuve qu'on
   * en est le titulaire.
   */
  if (byEmail) {
    await sendAccountRecovery({ id: byEmail.id, name: byEmail.name, email });
    return {
      ok: false as const,
      pending: true as const,
      error:
        "Un compte existe déjà à cette adresse. Nous venons d'y envoyer un lien pour le récupérer et choisir votre mot de passe.",
    };
  }

  /*
   * Le rapprochement par téléphone a été retiré, et c'était le plus grave :
   * un numéro se connaît ou se devine bien plus facilement qu'une boîte email,
   * et il n'existe aucun moyen d'en prouver la possession par email. Un
   * nouveau compte est créé ; le rattachement à l'historique se fera à la
   * confirmation de l'adresse, ou à la commande suivante.
   */
  const passwordHash = await bcrypt.hash(input.password, 10);

  const customer = await prisma.customer.create({
    data: {
      name,
      email,
      phone,
      passwordHash,
      address: input.address?.trim() || null,
    },
  });

  // Adresse inconnue jusqu'ici : rien à voler, on ouvre la session tout de
  // suite et la confirmation part en parallèle. Bloquer l'usage en attendant
  // ferait perdre des clients sans rien protéger.
  await openSession(customer);
  await sendEmailVerification({ id: customer.id, name: customer.name, email });

  return { ok: true as const, customerId: customer.id };
}

export async function shopLogin(identifier: string, password: string) {
  const prisma = await db();
  const tenant = await requireTenant();

  const buckets = await loginBuckets(`client:${tenant.id}`, identifier);

  const verdict = await checkThrottle(buckets);
  if (verdict.blocked) return { ok: false as const, error: verdict.message };

  const value = identifier.trim().toLowerCase();
  const phone = normalizePhone(identifier);

  const customer = value.includes("@")
    ? await prisma.customer.findFirst({ where: { email: value } })
    : phone
      ? await prisma.customer.findFirst({ where: { phone } })
      : null;

  if (!customer?.passwordHash) {
    await registerFailure(buckets);
    return { ok: false as const, error: "Identifiants invalides." };
  }

  const valid = await bcrypt.compare(password, customer.passwordHash);
  if (!valid) {
    await registerFailure(buckets);
    return { ok: false as const, error: "Identifiants invalides." };
  }

  await registerSuccess(buckets);
  await openSession(customer);
  return { ok: true as const, customerId: customer.id };
}

export async function shopLogout() {
  const store = await cookies();
  store.delete(SHOP_COOKIE);
}

/**
 * Retrouve ou crée le client correspondant à une commande invitée.
 * Le rapprochement se fait sur le téléphone, puis sur l'email — dans les
 * limites de la boutique courante.
 */
export async function findOrCreateCustomer(input: {
  name: string;
  phone: string;
  email?: string | null;
  address?: string | null;
}) {
  const prisma = await db();

  const phone = normalizePhone(input.phone);
  const email = input.email?.trim().toLowerCase() || null;

  const existing =
    (phone ? await prisma.customer.findFirst({ where: { phone } }) : null) ??
    (email ? await prisma.customer.findFirst({ where: { email } }) : null);

  if (existing) {
    return prisma.customer.update({
      where: { id: existing.id },
      data: {
        name: existing.name || input.name.trim(),
        phone: phone ?? existing.phone,
        email: existing.email ?? email,
        address: input.address?.trim() || existing.address,
      },
    });
  }

  return prisma.customer.create({
    data: {
      name: input.name.trim(),
      phone,
      email,
      address: input.address?.trim() || null,
    },
  });
}
