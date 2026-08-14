/**
 * Identité de la plateforme — Guÿgou.
 *
 * À ne pas confondre avec l'identité d'une boutique. La règle est simple et
 * vaut partout dans le code :
 *
 *   - **la vitrine appartient au marchand** — son logo, ses couleurs, ses
 *     textes, injectés par `(site)/layout.tsx` depuis ses réglages ;
 *   - **l'outil appartient à Guÿgou** — back-office, caisse, connexion et
 *     zone plateforme, qui utilisent les valeurs par défaut de `globals.css`.
 *
 * Ce module ne contient donc que ce qui est propre à la plateforme.
 */

/**
 * Le tréma vit dans le logo, jamais dans une adresse.
 * Un caractère accentué dans un nom de domaine passe par un encodage
 * technique qui casse dans les courriels et ne se tape pas sur un clavier de
 * téléphone — or chaque marchand doit pouvoir dicter son adresse.
 */
export const brand = {
  /** Forme affichée : titres, en-têtes, pied de page. */
  name: "Guÿgou",
  /** Forme technique : domaines, identifiants, boutiques d'applications. */
  slug: "guygou",
  slogan: "Chaque vente compte.",
  description:
    "Caisse, stock, facturation et boutique en ligne pour les commerçants de Guinée.",
} as const;

/**
 * Palette de la plateforme.
 *
 * Le vert est un choix défensif : en Guinée, l'orange appartient à Orange
 * Money et le jaune à MTN. Une marque de paiement dans ces teintes se fait
 * prendre pour un service de l'un des deux. Le bleu est le territoire des
 * banques. Le vert profond reste libre, dit la croissance, et tient le
 * contraste en plein soleil sur un écran bon marché.
 */
export const palette = {
  /** Confiance, prospérité. Fonds, en-têtes, texte de titre. */
  primary: "#0E3B2E",
  primaryDark: "#072018",
  primaryLight: "#1C6B4F",
  /** Énergie. Boutons, montants encaissés — jamais du texte courant. */
  accent: "#5FB63F",
  accentDark: "#46902C",
  accentLight: "#8FD14F",
  /** La couleur du papier du ticket. */
  paper: "#F7F1E4",
  ink: "#14110F",
} as const;

/** Chemins des fichiers du logo, servis depuis `public/`. */
export const logos = {
  /** Logotype horizontal, avec tréma. */
  full: "/brand/guygou.svg",
  /** Icône carrée, pour les favicons et les boutiques d'applications. */
  mark: "/brand/guygou-icone.svg",
  /** Trait plein, sans aplat — pour l'impression thermique 80 mm. */
  mono: "/brand/guygou-mono.svg",
} as const;
