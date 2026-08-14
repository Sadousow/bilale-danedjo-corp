import "server-only";

import { createHash, randomBytes } from "node:crypto";

import { platformDb } from "@/lib/db";
import { db } from "@/lib/tenant-db";
import { requireTenant } from "@/lib/tenant";
import { getSettings } from "@/lib/settings";
import { currentOrigin } from "@/lib/site-url";
import { sendMessageInBackground } from "@/lib/messaging/send";
import {
  emailVerification,
  accountRecovery,
  mailColors,
} from "@/lib/messaging/templates";
import { isEmail } from "@/lib/messaging/channel";
import { createResetToken } from "@/lib/password-reset";

/**
 * Confirmation de l'adresse email d'un client.
 *
 * Deux situations, deux réponses très différentes :
 *
 * - **Adresse inconnue.** Rien à voler : le compte est créé, la session
 *   ouverte, et un message de confirmation part pour marquer l'adresse comme
 *   prouvée. L'usage n'est pas bloqué en attendant.
 *
 * - **Un client existe déjà avec cette adresse, sans mot de passe** — il a
 *   été créé lors d'un achat en caisse. C'est le cas dangereux : ce compte
 *   porte un historique de commandes et parfois un solde de crédit. On ne le
 *   rattache **pas**. On envoie un lien de récupération à l'adresse
 *   concernée, et c'est en l'ouvrant que la personne prouve qu'elle relève
 *   cette boîte, puis choisit son mot de passe.
 */

const VERIFY_TTL_HOURS = 48;

function hash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Envoie un lien de confirmation d'adresse. Silencieux en cas d'échec. */
export async function sendEmailVerification(customer: {
  id: string;
  name: string;
  email: string | null;
}): Promise<void> {
  if (!isEmail(customer.email)) return;

  try {
    const [tenant, settings, origin] = await Promise.all([
      requireTenant(),
      getSettings(),
      currentOrigin(),
    ]);

    const token = randomBytes(32).toString("base64url");

    await platformDb.verificationToken.create({
      data: {
        tokenHash: hash(token),
        scope: "email-client",
        subjectId: customer.id,
        tenantId: tenant.id,
        expiresAt: new Date(Date.now() + VERIFY_TTL_HOURS * 3600_000),
      },
    });

    const shopName = settings.companyName || tenant.name;
    const mail = emailVerification({
      colors: mailColors(settings.primaryColor, settings.accentColor),
      shopName,
      name: customer.name,
      url: `${origin}/compte/verification?jeton=${encodeURIComponent(token)}`,
      hours: VERIFY_TTL_HOURS,
    });

    sendMessageInBackground({
      to: { email: customer.email!, name: customer.name },
      fromName: shopName,
      replyTo: settings.companyEmail || undefined,
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
    });
  } catch (error) {
    console.error("[verification] envoi :", error);
  }
}

/**
 * Un compte existe déjà pour cette adresse, sans mot de passe.
 * On envoie un lien de récupération — ouvrir sa boîte est la preuve.
 */
export async function sendAccountRecovery(customer: {
  id: string;
  name: string;
  email: string;
}): Promise<void> {
  try {
    const [tenant, settings, origin] = await Promise.all([
      requireTenant(),
      getSettings(),
      currentOrigin(),
    ]);

    const token = await createResetToken({
      scope: "client",
      subjectId: customer.id,
      tenantId: tenant.id,
    });

    const shopName = settings.companyName || tenant.name;
    const mail = accountRecovery({
      colors: mailColors(settings.primaryColor, settings.accentColor),
      shopName,
      name: customer.name,
      url: `${origin}/compte/mot-de-passe?jeton=${encodeURIComponent(token)}`,
    });

    sendMessageInBackground({
      to: { email: customer.email, name: customer.name },
      fromName: shopName,
      replyTo: settings.companyEmail || undefined,
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
    });
  } catch (error) {
    console.error("[verification] récupération :", error);
  }
}

/** Confirme l'adresse à partir du jeton présenté. */
export async function confirmEmail(
  token: string | null | undefined
): Promise<{ ok: boolean; name?: string }> {
  const raw = (token ?? "").trim();
  if (!raw || raw.length > 200) return { ok: false };

  try {
    const tenant = await requireTenant();
    const row = await platformDb.verificationToken.findUnique({
      where: { tokenHash: hash(raw) },
    });

    if (
      !row ||
      row.usedAt ||
      row.expiresAt <= new Date() ||
      row.scope !== "email-client" ||
      // Un lien émis sur une boutique ne vaut rien sur une autre.
      row.tenantId !== tenant.id
    ) {
      return { ok: false };
    }

    const prisma = await db();

    const burnt = await platformDb.verificationToken.updateMany({
      where: { id: row.id, usedAt: null },
      data: { usedAt: new Date() },
    });
    if (burnt.count === 0) return { ok: false };

    const customer = await prisma.customer.update({
      where: { id: row.subjectId },
      data: { emailVerifiedAt: new Date() },
    });

    return { ok: true, name: customer.name };
  } catch (error) {
    console.error("[verification] confirmation :", error);
    return { ok: false };
  }
}
