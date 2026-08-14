import "server-only";

import { emailChannel } from "./email";
import type { Message, SendResult } from "./channel";

export type { Message, Recipient } from "./channel";
export { isEmailConfigured } from "./email";

/**
 * Point d'entrée unique de tous les envois.
 *
 * Les canaux sont essayés dans l'ordre, le premier capable de joindre le
 * destinataire l'emporte. Aujourd'hui il n'y en a qu'un ; le jour où le SMS
 * s'ajoutera, il suffira de l'insérer dans ce tableau — et un destinataire
 * sans email mais avec un numéro sera joint automatiquement, sans qu'aucun
 * appelant ne change.
 */
const channels = [emailChannel];

/**
 * Envoie un message. **Ne lève jamais.**
 *
 * C'est délibéré : aucune notification ne doit faire échouer l'action qui
 * l'a déclenchée. Une commande enregistrée dont l'accusé de réception n'est
 * pas parti reste une commande enregistrée — l'inverse serait un désastre.
 * L'échec est journalisé et remonté dans le retour, à l'appelant d'en faire
 * ce qu'il veut.
 */
export async function sendMessage(message: Message): Promise<SendResult> {
  const channel = channels.find((c) => c.canReach(message.to));

  if (!channel) {
    return { ok: false, error: "Aucun canal ne peut joindre ce destinataire." };
  }

  try {
    const result = await channel.send(message);

    if (!result.ok) {
      console.error(
        `[message] échec ${channel.name} — ${message.subject} : ${result.error}`
      );
    }

    return result;
  } catch (error) {
    const reason = error instanceof Error ? error.message : "inconnue";
    console.error(`[message] exception ${channel.name} : ${reason}`);
    return { ok: false, error: reason };
  }
}

/**
 * Envoie sans attendre le résultat.
 * À utiliser dans les chemins où l'utilisateur attend une réponse — une
 * commande, un paiement — pour ne pas lui faire patienter le temps d'un
 * aller-retour vers le fournisseur.
 */
export function sendMessageInBackground(message: Message): void {
  void sendMessage(message);
}
