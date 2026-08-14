/**
 * Valeurs de repli **neutres** de la vitrine.
 *
 * Ce fichier contenait les coordonnées de Bilale & Danedjo, du temps où
 * l'application servait une seule entreprise. En multi-tenant, ces valeurs
 * fuyaient chez les autres marchands : le slogan de Bilale s'affichait en
 * titre d'accueil de toute boutique sans slogan, sa description en pied de
 * page, ses horaires sur la page Contact.
 *
 * Règle depuis : **rien ici ne doit désigner un commerce en particulier.**
 * Un repli est soit générique, soit vide — et une valeur vide se masque à
 * l'affichage plutôt que d'afficher les données de quelqu'un d'autre.
 */
export const siteConfig = {
  slogan: "Bienvenue dans notre boutique",
  description: "Commandez en ligne, livraison à domicile.",
  hours: "",
};

/**
 * Lien WhatsApp d'une boutique.
 *
 * **Renvoie une chaîne vide sans numéro**, et c'était le défaut le plus grave
 * de l'ancienne version : elle retombait sur le numéro de Bilale. Un client
 * d'une autre boutique qui cliquait sur « Commander sur WhatsApp » écrivait
 * donc à un commerçant concurrent. L'appelant doit masquer le bouton quand
 * cette fonction ne rend rien.
 */
export function buildWhatsAppLink(number: string, message: string): string {
  const digits = (number ?? "").replace(/[^\d]/g, "");
  if (!digits) return "";
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
