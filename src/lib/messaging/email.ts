import "server-only";

import {
  isEmail,
  safeHeaderName,
  type Channel,
  type Message,
  type Recipient,
  type SendResult,
} from "./channel";

/**
 * Canal email — Resend.
 *
 * Un seul domaine d'expédition, celui de la plateforme, avec le nom de la
 * boutique en nom affiché. Faire vérifier un domaine à chaque marchand serait
 * la bonne pratique en théorie ; en pratique, aucun commerçant de Conakry ne
 * posera un enregistrement DKIM dans sa zone DNS, et l'inscription en
 * libre-service s'arrêterait là.
 *
 * Variables d'environnement :
 *   RESEND_API_KEY   clé de l'espace Resend
 *   MAIL_FROM        adresse d'expédition, sur un domaine vérifié chez Resend
 *   MAIL_REPLY_TO    repli quand la boutique n'a pas d'adresse (facultatif)
 */

const API_KEY = process.env.RESEND_API_KEY ?? "";
const FROM = (process.env.MAIL_FROM ?? "").trim();
const FALLBACK_REPLY_TO = (process.env.MAIL_REPLY_TO ?? "").trim();

export function isEmailConfigured(): boolean {
  return Boolean(API_KEY && isEmail(FROM));
}

/** Compose l'en-tête `From` : « Nom de la boutique <adresse vérifiée> ». */
function fromHeader(fromName?: string): string {
  const name = safeHeaderName(fromName);
  return name ? `${name} <${FROM}>` : FROM;
}

async function send(message: Message): Promise<SendResult> {
  if (!isEmailConfigured()) {
    return {
      ok: false,
      error: "Envoi d'emails non configuré sur ce serveur.",
    };
  }

  const to = (message.to.email ?? "").trim();
  if (!isEmail(to)) return { ok: false, error: "Adresse email invalide." };

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromHeader(message.fromName),
        to: [to],
        subject: safeHeaderName(message.subject) || "Notification",
        text: message.text,
        ...(message.html ? { html: message.html } : {}),
        ...(message.replyTo && isEmail(message.replyTo)
          ? { reply_to: message.replyTo }
          : FALLBACK_REPLY_TO && isEmail(FALLBACK_REPLY_TO)
            ? { reply_to: FALLBACK_REPLY_TO }
            : {}),
      }),
      // Un fournisseur lent ne doit pas retenir une commande en cours.
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      return {
        ok: false,
        error: `Resend a répondu ${response.status}. ${detail.slice(0, 200)}`,
      };
    }

    const body = (await response.json().catch(() => null)) as {
      id?: string;
    } | null;

    return { ok: true, id: body?.id };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "inconnue";
    return { ok: false, error: `Envoi impossible : ${reason}` };
  }
}

export const emailChannel: Channel = {
  name: "email",
  canReach: (to: Recipient) => isEmail(to.email),
  send,
};
