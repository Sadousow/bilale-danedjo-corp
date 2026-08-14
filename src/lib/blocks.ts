/**
 * Composition de la page d'accueil — fonctions pures.
 *
 * Le marchand assemble des sections que nous fournissons ; il ne fournit
 * jamais de balisage. Tout ce qui vient de la base est revalidé ici avant
 * d'être rendu : un JSON malformé, tronqué ou trafiqué doit donner une page
 * correcte, jamais une page cassée.
 */

export type BlockType =
  | "hero"
  | "categories"
  | "produits"
  | "arguments"
  | "texte"
  | "image"
  | "appel";

export type ProductSource = "populaires" | "promotions" | "recents";

export type BlockProps = {
  /** Titres de section, communs à plusieurs types. */
  eyebrow?: string;
  title?: string;
  description?: string;
  /** Bloc « produits » */
  source?: ProductSource;
  limit?: number;
  /** Bloc « texte » et « appel » */
  body?: string;
  buttonLabel?: string;
  buttonHref?: string;
  /** Bloc « image » */
  imageUrl?: string;
  /** Fond de section */
  tone?: "clair" | "gris" | "fonce";
};

export type Block = {
  id: string;
  type: BlockType;
  visible: boolean;
  props: BlockProps;
};

export const blockLabels: Record<BlockType, string> = {
  hero: "Bandeau d'accueil",
  categories: "Catégories",
  produits: "Grille de produits",
  arguments: "Vos arguments",
  texte: "Texte libre",
  image: "Image pleine largeur",
  appel: "Appel à l'action",
};

export const blockDescriptions: Record<BlockType, string> = {
  hero: "Grand visuel d'ouverture avec votre titre et vos boutons.",
  categories: "Les familles de produits de votre catalogue.",
  produits: "Une sélection de produits — populaires, en promotion ou récents.",
  arguments: "Quatre encarts qui expliquent pourquoi vous choisir.",
  texte: "Un titre et un paragraphe, pour raconter ce que vous voulez.",
  image: "Une photo sur toute la largeur de l'écran.",
  appel: "Un bandeau qui invite à commander sur WhatsApp.",
};

export const productSourceLabels: Record<ProductSource, string> = {
  populaires: "Produits populaires",
  promotions: "Produits en promotion",
  recents: "Derniers produits ajoutés",
};

export const toneLabels: Record<NonNullable<BlockProps["tone"]>, string> = {
  clair: "Fond blanc",
  gris: "Fond gris clair",
  fonce: "Fond coloré",
};

/** Un bloc ne peut apparaître qu'une fois — sauf ceux qui ont du sens répétés. */
export const REPEATABLE: BlockType[] = ["produits", "texte", "image", "appel"];

/** Mise en page livrée à la création d'une boutique. */
export function defaultBlocks(): Block[] {
  return [
    { id: "b-hero", type: "hero", visible: true, props: {} },
    {
      id: "b-categories",
      type: "categories",
      visible: true,
      props: {
        eyebrow: "Nos catégories",
        title: "Tout ce qu'il faut pour votre quotidien",
        tone: "gris",
      },
    },
    {
      id: "b-populaires",
      type: "produits",
      visible: true,
      props: {
        eyebrow: "Nos meilleures ventes",
        title: "Produits populaires",
        source: "populaires",
        limit: 8,
        tone: "clair",
      },
    },
    {
      id: "b-promos",
      type: "produits",
      visible: true,
      props: {
        eyebrow: "Offres en cours",
        title: "Promotions du moment",
        source: "promotions",
        limit: 3,
        tone: "fonce",
      },
    },
    {
      id: "b-arguments",
      type: "arguments",
      visible: true,
      props: {
        eyebrow: "Pourquoi nous choisir",
        title: "Un partenaire fiable au quotidien",
        tone: "gris",
      },
    },
    {
      id: "b-appel",
      type: "appel",
      visible: true,
      props: {
        title: "Prêt à passer votre commande ?",
        body: "Discutez directement avec notre équipe sur WhatsApp — réponse rapide, devis sur mesure.",
        buttonLabel: "Commander sur WhatsApp",
        tone: "fonce",
      },
    },
  ];
}

const TYPES = new Set<BlockType>([
  "hero",
  "categories",
  "produits",
  "arguments",
  "texte",
  "image",
  "appel",
]);

const SOURCES = new Set<ProductSource>(["populaires", "promotions", "recents"]);
const TONES = new Set(["clair", "gris", "fonce"]);

function text(value: unknown, max: number): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : undefined;
}

/**
 * Les liens de bouton restent internes ou HTTPS.
 * On refuse notamment `javascript:` : c'est le seul endroit du formulaire où
 * une URL finit dans un attribut `href`.
 */
function safeHref(value: unknown): string | undefined {
  const raw = text(value, 300);
  if (!raw) return undefined;
  if (raw.startsWith("/")) return raw;
  if (/^https:\/\/[^\s"'<>]+$/i.test(raw)) return raw;
  return undefined;
}

function safeImage(value: unknown): string | undefined {
  const raw = text(value, 500);
  if (!raw) return undefined;
  return /^https:\/\/[^\s"'<>]+$/i.test(raw) ? raw : undefined;
}

function parseProps(value: unknown): BlockProps {
  const raw = (value ?? {}) as Record<string, unknown>;

  const limit = Number(raw.limit);
  const tone = typeof raw.tone === "string" && TONES.has(raw.tone) ? raw.tone : undefined;

  return {
    eyebrow: text(raw.eyebrow, 80),
    title: text(raw.title, 120),
    description: text(raw.description, 400),
    source:
      typeof raw.source === "string" && SOURCES.has(raw.source as ProductSource)
        ? (raw.source as ProductSource)
        : undefined,
    limit: Number.isFinite(limit) ? Math.min(24, Math.max(1, Math.round(limit))) : undefined,
    body: text(raw.body, 2000),
    buttonLabel: text(raw.buttonLabel, 60),
    buttonHref: safeHref(raw.buttonHref),
    imageUrl: safeImage(raw.imageUrl),
    tone: tone as BlockProps["tone"],
  };
}

/** Relit la composition enregistrée, en se méfiant de tout. */
export function parseBlocks(value: unknown): Block[] {
  if (!Array.isArray(value) || value.length === 0) return defaultBlocks();

  const seen = new Set<string>();

  const blocks = value
    .filter(
      (item): item is Record<string, unknown> =>
        typeof item === "object" && item !== null
    )
    .map((item, index) => {
      const type = item.type as BlockType;
      if (!TYPES.has(type)) return null;

      // Les blocs non répétables ne peuvent apparaître qu'une fois.
      if (!REPEATABLE.includes(type)) {
        if (seen.has(type)) return null;
        seen.add(type);
      }

      const id =
        typeof item.id === "string" && item.id.trim()
          ? item.id.trim().slice(0, 40)
          : `b-${type}-${index}`;

      return {
        id,
        type,
        visible: item.visible !== false,
        props: parseProps(item.props),
      } satisfies Block;
    })
    .filter((block): block is Block => block !== null)
    .slice(0, 20);

  return blocks.length ? blocks : defaultBlocks();
}

/** Identifiant de bloc, unique dans la page. */
export function newBlockId(type: BlockType): string {
  return `b-${type}-${Math.random().toString(36).slice(2, 8)}`;
}

export function newBlock(type: BlockType): Block {
  const base: Block = { id: newBlockId(type), type, visible: true, props: {} };

  if (type === "produits") {
    base.props = {
      eyebrow: "Notre sélection",
      title: "Nos produits",
      source: "populaires",
      limit: 8,
      tone: "clair",
    };
  } else if (type === "texte") {
    base.props = { title: "Titre de la section", body: "", tone: "clair" };
  } else if (type === "appel") {
    base.props = {
      title: "Une question ?",
      body: "Écrivez-nous, nous répondons rapidement.",
      buttonLabel: "Nous écrire sur WhatsApp",
      tone: "fonce",
    };
  } else if (type === "image") {
    base.props = { tone: "clair" };
  }

  return base;
}

// ------------------------------------------------------------- thèmes

export type ThemePreset = "classique" | "epure" | "chaleureux";

type Preset = {
  label: string;
  description: string;
  radius: string;
  spacing: string;
  shadow: string;
  shadowHover: string;
};

export const themePresets: Record<ThemePreset, Preset> = {
  classique: {
    label: "Classique",
    description: "Angles arrondis, ombres douces. Le style d'origine.",
    radius: "0.75rem",
    spacing: "4rem",
    shadow: "0 1px 3px rgb(15 23 42 / 0.08)",
    shadowHover: "0 20px 25px -5px rgb(15 23 42 / 0.12)",
  },
  epure: {
    label: "Épuré",
    description: "Angles nets, beaucoup d'air, presque pas d'ombres.",
    radius: "0.25rem",
    spacing: "5.5rem",
    shadow: "none",
    shadowHover: "0 1px 2px rgb(15 23 42 / 0.1)",
  },
  chaleureux: {
    label: "Chaleureux",
    description: "Angles très arrondis, ombres marquées, plus compact.",
    radius: "1.5rem",
    spacing: "3.25rem",
    shadow: "0 4px 14px rgb(15 23 42 / 0.1)",
    shadowHover: "0 24px 38px -8px rgb(15 23 42 / 0.22)",
  },
};

export function parseThemePreset(value: unknown): ThemePreset {
  return value === "epure" || value === "chaleureux" ? value : "classique";
}

/**
 * Variables CSS du thème, à injecter avec celles des couleurs.
 * Les valeurs viennent du tableau ci-dessus, jamais d'un formulaire : rien à
 * échapper ici, contrairement aux couleurs.
 */
export function presetStyle(preset: ThemePreset): string {
  const p = themePresets[preset];
  return `--shop-radius:${p.radius};--shop-spacing:${p.spacing};--shop-shadow:${p.shadow};--shop-shadow-hover:${p.shadowHover};`;
}

/**
 * Prépare la composition pour l'écriture en base.
 * Les champs absents valent `undefined` après `parseBlocks` ; on les retire
 * pour n'enregistrer que du JSON strict.
 */
export function serializeBlocks(blocks: Block[]): unknown {
  return JSON.parse(JSON.stringify(blocks));
}
