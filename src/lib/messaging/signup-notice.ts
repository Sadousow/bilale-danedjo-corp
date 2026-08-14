import "server-only";

import { brand } from "@/lib/brand";
import { TRIAL_DAYS } from "@/lib/plans";
import { sendMessage } from "./send";
import { shopWelcome, newShopAlert } from "./templates";
import { isEmail } from "./channel";

/**
 * Messages envoyés à la création d'une boutique.
 *
 * Aucun ne peut faire échouer l'inscription : la boutique existe déjà en base
 * quand ces fonctions sont appelées. Un message perdu est un désagrément, une
 * inscription perdue est un client perdu.
 */

const ROOT = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "";
/** Adresse interne prévenue des nouvelles inscriptions. */
const OPS = (process.env.SIGNUP_ALERT_EMAIL ?? "").trim();

function shopUrl(slug: string): string {
  const scheme = ROOT.includes("localhost") ? "http" : "https";
  return `${scheme}://${slug}.${ROOT}`;
}

export async function notifyNewShop(input: {
  slug: string;
  shopName: string;
  adminName: string;
  adminEmail: string;
  phone: string;
}): Promise<void> {
  const url = shopUrl(input.slug);

  // --- Au marchand : son adresse, avant tout
  if (isEmail(input.adminEmail)) {
    const mail = shopWelcome({
      platformName: brand.name,
      shopName: input.shopName,
      adminName: input.adminName,
      shopUrl: url,
      loginUrl: `${url}/login`,
      trialDays: TRIAL_DAYS,
    });

    await sendMessage({
      to: { email: input.adminEmail, name: input.adminName },
      // Ce message vient de la plateforme, pas de la boutique : c'est nous
      // qui accueillons le marchand.
      fromName: brand.name,
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
    });
  }

  // --- À nous
  if (isEmail(OPS)) {
    const mail = newShopAlert({
      shopName: input.shopName,
      slug: input.slug,
      adminName: input.adminName,
      adminEmail: input.adminEmail,
      phone: input.phone,
      shopUrl: url,
    });

    await sendMessage({
      to: { email: OPS },
      fromName: brand.name,
      replyTo: isEmail(input.adminEmail) ? input.adminEmail : undefined,
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
    });
  }
}
