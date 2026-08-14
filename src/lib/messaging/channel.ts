/**
 * Message sortant, indépendant du canal — fonctions pures.
 *
 * Tout ce qui part de la plateforme passe par cette forme : un destinataire,
 * un objet, un corps en texte brut, et une version HTML facultative.
 *
 * Le **texte brut n'est pas une politesse**, c'est la pièce maîtresse. C'est
 * lui qu'un SMS enverra le jour où on branchera ce canal, lui que lisent les
 * clients de messagerie dégradés, et lui qui reste lisible sur un téléphone
 * d'entrée de gamme avec une connexion lente. Le HTML est l'habillage, pas
 * le contenu.
 */

export type Recipient = {
  name?: string;
  email?: string;
  /** Format international sans +, ex. 224624390332. Inutilisé pour l'instant. */
  phone?: string;
};

export type Message = {
  to: Recipient;
  subject: string;
  text: string;
  html?: string;
  /**
   * Nom affiché de l'expéditeur. C'est celui de la **boutique**, pas de la
   * plateforme : un client qui commande chez Bilale doit voir « Bilale et
   * Danedjo » dans sa boîte, pas « Guÿgou », dont il n'a jamais entendu
   * parler.
   */
  fromName?: string;
  /**
   * Adresse de réponse. Une réponse doit arriver chez le marchand, jamais
   * chez nous — nous ne saurions pas quoi en faire.
   */
  replyTo?: string;
};

export type SendResult =
  | { ok: true; id?: string }
  | { ok: false; error: string };

/**
 * Un canal d'envoi. L'email est le seul branché aujourd'hui ; le SMS et
 * WhatsApp viendront s'ajouter ici sans que le reste du code change.
 */
export type Channel = {
  name: string;
  /** Le canal peut-il joindre ce destinataire ? */
  canReach(to: Recipient): boolean;
  send(message: Message): Promise<SendResult>;
};

// ------------------------------------------------------------- validation

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function isEmail(value: string | null | undefined): boolean {
  const raw = (value ?? "").trim();
  return raw.length <= 254 && EMAIL.test(raw);
}

/**
 * Nettoie un nom avant de le poser dans un en-tête `From`.
 *
 * Le nom vient des réglages d'un marchand, donc d'un formulaire. Un retour
 * à la ligne ou un guillemet dans un en-tête permettrait d'en injecter
 * d'autres — un `Bcc:` vers l'extérieur, par exemple. On ne garde que ce qui
 * est sûr.
 */
export function safeHeaderName(value: string | null | undefined): string {
  return (value ?? "")
    .replace(/[\r\n]+/g, " ")
    .replace(/["<>\\]/g, "")
    .trim()
    .slice(0, 78);
}
