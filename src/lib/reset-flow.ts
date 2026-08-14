import "server-only";

import { db } from "@/lib/tenant-db";
import { platformDb } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { getSettings } from "@/lib/settings";
import { currentOrigin } from "@/lib/site-url";
import { brand } from "@/lib/brand";
import { sendMessage } from "@/lib/messaging/send";
import { passwordReset, mailColors } from "@/lib/messaging/templates";
import { isEmail } from "@/lib/messaging/channel";
import {
  createResetToken,
  RESET_TTL_MINUTES,
  type ResetScope,
} from "@/lib/password-reset";
import {
  callerAddress,
  checkThrottle,
  registerFailure,
  RULES,
} from "@/lib/throttle";
import { createHash } from "node:crypto";

/**
 * Demande de réinitialisation.
 *
 * **La réponse est toujours la même**, que le compte existe ou non. Un
 * formulaire qui répondrait « adresse inconnue » deviendrait un outil pour
 * savoir qui est client de quelle boutique, ou quel employé travaille où.
 *
 * Le compteur de tentatives sert ici à deux choses : empêcher qu'on découvre
 * des comptes en masse, et empêcher qu'on se serve du formulaire pour
 * inonder la boîte de quelqu'un.
 */

import type { RequestState } from "@/lib/form-state";
export type { RequestState };

/** Message unique, quel que soit le résultat réel. */
export const NEUTRAL_NOTICE =
  "Si un compte existe avec cette adresse, un message vient de partir. Vérifiez votre boîte de réception, et vos indésirables.";

async function throttleBuckets(email: string) {
  const digest = (value: string) =>
    createHash("sha256").update(value.trim().toLowerCase()).digest("base64url").slice(0, 24);

  return [
    { key: `reset:adresse:${digest(email)}`, rule: RULES.inscription },
    { key: `reset:ip:${digest(await callerAddress())}`, rule: RULES.compte },
  ];
}

export async function requestPasswordReset(input: {
  email: string;
  scope: ResetScope;
}): Promise<RequestState> {
  const email = input.email.trim().toLowerCase();

  if (!isEmail(email)) {
    return { error: "Renseignez une adresse email valide." };
  }

  const buckets = await throttleBuckets(email);
  const verdict = await checkThrottle(buckets);
  if (verdict.blocked) return { error: verdict.message };
  await registerFailure(buckets);

  try {
    if (input.scope === "plateforme") {
      await sendPlatformReset(email);
    } else {
      await sendShopReset(email, input.scope);
    }
  } catch (error) {
    // Un incident d'envoi ne doit pas révéler que le compte existe : on
    // journalise et on répond comme d'habitude.
    console.error("[reset] échec de la demande :", error);
  }

  return { sent: true };
}

async function sendPlatformReset(email: string): Promise<void> {
  const user = await platformDb.platformUser.findUnique({ where: { email } });
  if (!user || !user.active) return;

  const token = await createResetToken({
    scope: "plateforme",
    subjectId: user.id,
  });

  const origin = await currentOrigin();
  const url = `${origin}/superadmin/mot-de-passe?jeton=${encodeURIComponent(token)}`;

  const mail = passwordReset({
    shopName: brand.name,
    name: user.name || "",
    url,
    minutes: RESET_TTL_MINUTES,
  });

  await sendMessage({
    to: { email, name: user.name },
    fromName: brand.name,
    subject: mail.subject,
    text: mail.text,
    html: mail.html,
  });
}

async function sendShopReset(email: string, scope: ResetScope): Promise<void> {
  const tenant = await requireTenant();
  const prisma = await db();
  const settings = await getSettings();

  const subject =
    scope === "staff"
      ? await prisma.user.findFirst({ where: { email, active: true } })
      : await prisma.customer.findFirst({ where: { email } });

  if (!subject) return;
  // Un client qui n'a jamais créé de mot de passe n'a rien à réinitialiser.
  if (scope === "client" && !("passwordHash" in subject && subject.passwordHash)) {
    return;
  }

  const token = await createResetToken({
    scope,
    subjectId: subject.id,
    tenantId: tenant.id,
  });

  const origin = await currentOrigin();
  const path = scope === "staff" ? "/mot-de-passe" : "/compte/mot-de-passe";
  const url = `${origin}${path}?jeton=${encodeURIComponent(token)}`;

  const mail = passwordReset({
    colors: mailColors(settings.primaryColor, settings.accentColor),
    shopName: settings.companyName || tenant.name,
    name: subject.name || "",
    url,
    minutes: RESET_TTL_MINUTES,
  });

  await sendMessage({
    to: { email, name: subject.name },
    // Le destinataire connaît sa boutique, pas la plateforme : c'est le nom
    // du marchand qui doit apparaître dans sa boîte de réception.
    fromName: settings.companyName || tenant.name,
    replyTo: settings.companyEmail || undefined,
    subject: mail.subject,
    text: mail.text,
    html: mail.html,
  });
}
