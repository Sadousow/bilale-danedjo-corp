/**
 * Thème d'une boutique — fonctions pures.
 *
 * Les couleurs de marque sont des variables CSS définies dans `globals.css`.
 * Les redéclarer sur un élément parent suffit à repeindre toute la vitrine :
 * aucune classe Tailwind n'a besoin de changer.
 */

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

/**
 * Palette de départ d'une boutique.
 *
 * Neutre à dessein : un ardoise très sombre et un ambre chaud s'accordent
 * avec à peu près n'importe quel logo. Les valeurs d'origine étaient celles
 * du premier marchand, et toute boutique neuve lui ressemblait.
 */
export const DEFAULT_PRIMARY = "#1F2937";
export const DEFAULT_ACCENT = "#B45309";

/** Normalise une couleur saisie par le marchand, ou renvoie la valeur de repli. */
export function safeColor(value: string | null | undefined, fallback: string): string {
  const raw = (value ?? "").trim();
  if (!HEX.test(raw)) return fallback;

  // Forme courte #abc → #aabbcc, pour pouvoir calculer dessus.
  if (raw.length === 4) {
    return `#${raw[1]}${raw[1]}${raw[2]}${raw[2]}${raw[3]}${raw[3]}`.toUpperCase();
  }
  return raw.toUpperCase();
}

function channels(hex: string): [number, number, number] {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

function toHex([r, g, b]: [number, number, number]): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return `#${[r, g, b]
    .map((v) => clamp(v).toString(16).padStart(2, "0"))
    .join("")}`.toUpperCase();
}

/** Éclaircit une couleur vers le blanc. `amount` entre 0 et 1. */
export function lighten(hex: string, amount: number): string {
  const [r, g, b] = channels(hex);
  return toHex([
    r + (255 - r) * amount,
    g + (255 - g) * amount,
    b + (255 - b) * amount,
  ]);
}

/** Assombrit une couleur vers le noir. */
export function darken(hex: string, amount: number): string {
  const [r, g, b] = channels(hex);
  return toHex([r * (1 - amount), g * (1 - amount), b * (1 - amount)]);
}

export type ThemeColors = {
  primary: string;
  primaryDark: string;
  primaryLight: string;
  accent: string;
  accentDark: string;
  accentLight: string;
};

/**
 * Décline les deux couleurs choisies en la palette complète attendue par les
 * composants. Le marchand n'a que deux décisions à prendre ; les nuances
 * claires et sombres en découlent.
 */
export function buildTheme(
  primaryInput: string | null | undefined,
  accentInput: string | null | undefined
): ThemeColors {
  const primary = safeColor(primaryInput, DEFAULT_PRIMARY);
  const accent = safeColor(accentInput, DEFAULT_ACCENT);

  return {
    primary,
    primaryDark: darken(primary, 0.25),
    primaryLight: lighten(primary, 0.22),
    accent,
    accentDark: darken(accent, 0.15),
    accentLight: lighten(accent, 0.3),
  };
}

/** Bloc de variables CSS à injecter en tête de la vitrine. */
export function themeStyle(theme: ThemeColors): string {
  return `:root{--brand-blue:${theme.primary};--brand-blue-dark:${theme.primaryDark};--brand-blue-light:${theme.primaryLight};--brand-gold:${theme.accent};--brand-gold-dark:${theme.accentDark};--brand-gold-light:${theme.accentLight};}`;
}

// ------------------------------------------------------------- textes

export type Highlight = { title: string; text: string };

export const DEFAULT_HIGHLIGHTS: Highlight[] = [
  {
    title: "Livraison rapide",
    text: "Livraison à domicile dans des délais courts.",
  },
  {
    title: "Qualité garantie",
    text: "Des produits sélectionnés chez des fournisseurs de confiance.",
  },
  {
    title: "Service WhatsApp",
    text: "Commandez directement par WhatsApp, avec un conseil personnalisé.",
  },
  {
    title: "Prix justes",
    text: "Des tarifs compétitifs pour les particuliers comme pour les professionnels.",
  },
];

/** Lit les arguments d'accueil enregistrés, en se méfiant du contenu de la base. */
export function parseHighlights(value: unknown): Highlight[] {
  if (!Array.isArray(value)) return DEFAULT_HIGHLIGHTS;

  const parsed = value
    .filter(
      (item): item is Highlight =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as Highlight).title === "string"
    )
    .map((item) => ({
      title: item.title.trim(),
      text: typeof item.text === "string" ? item.text.trim() : "",
    }))
    .filter((item) => item.title);

  return parsed.length ? parsed.slice(0, 6) : DEFAULT_HIGHLIGHTS;
}
