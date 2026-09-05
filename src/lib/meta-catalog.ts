/**
 * Éligibilité d'un article au catalogue Meta.
 *
 * Meta refuse en lot, avec des codes, et sans rien dire au marchand : un
 * article absent de ses publicités, aucune explication. Ce module retourne la
 * décision **avant** tout appel réseau, avec une phrase en français destinée à
 * être affichée telle quelle dans la liste des produits.
 *
 * Fonction pure : aucune requête, aucun fetch. C'est ce qui permet de calculer
 * l'état de 200 produits en une passe, dans le rendu de la page.
 */

/**
 * Côté minimal d'une image de catalogue, en pixels.
 * Seuil imposé par Meta : « JPEG or PNG, at least 500 × 500 px ».
 */
export const MIN_IMAGE_SIDE = 500;

/**
 * Longueur maximale du titre d'un article chez Meta.
 * La spécification recommande 65 caractères, mais n'en refuse qu'au-delà de 200.
 */
export const MAX_TITLE_LENGTH = 200;

/** Ce dont le calcul a besoin — un sous-ensemble de `Product`. */
export type EligibilityInput = {
  name: string;
  description: string;
  image: string;
  imageWidth: number | null;
  imageHeight: number | null;
  price: number;
  active: boolean;
};

export type Eligibility =
  | { publiable: true; reserve: string | null }
  | { publiable: false; motif: string; champ: EligibilityField };

/** Sur quel champ le marchand doit agir — sert à cibler le lien de correction. */
export type EligibilityField =
  | "actif"
  | "image"
  | "description"
  | "prix"
  | "nom";

/**
 * L'article peut-il partir chez Meta, et sinon pourquoi.
 *
 * Les conditions sont évaluées dans l'ordre où le marchand doit agir : activer
 * l'article d'abord, soigner la fiche ensuite. Un seul motif est renvoyé —
 * lister cinq reproches à la fois n'aide personne à commencer.
 */
export function eligibility(p: EligibilityInput): Eligibility {
  // Un article publié chez Meta mais désactivé dans la boutique donne une
  // publicité qui mène à une page vide. Le marchand paie pour envoyer des gens
  // dans le mur, et rien dans les journaux ne le signale.
  if (!p.active) {
    return {
      publiable: false,
      motif: "Activez d'abord l'article dans votre boutique.",
      champ: "actif",
    };
  }

  if (!p.image.trim()) {
    return {
      publiable: false,
      motif: "Ajoutez une photo : Meta n'accepte pas d'article sans image.",
      champ: "image",
    };
  }

  // Dimensions connues et insuffisantes : refus net, avec les chiffres. Le
  // marchand doit pouvoir comparer sa photo au seuil sans deviner.
  if (
    p.imageWidth !== null &&
    p.imageHeight !== null &&
    (p.imageWidth < MIN_IMAGE_SIDE || p.imageHeight < MIN_IMAGE_SIDE)
  ) {
    return {
      publiable: false,
      motif:
        `Photo trop petite (${p.imageWidth} × ${p.imageHeight} px). ` +
        `Meta demande au moins ${MIN_IMAGE_SIDE} × ${MIN_IMAGE_SIDE} px.`,
      champ: "image",
    };
  }

  if (!p.description.trim()) {
    return {
      publiable: false,
      motif: "Ajoutez une description : Meta l'exige pour chaque article.",
      champ: "description",
    };
  }

  if (p.price <= 0) {
    return {
      publiable: false,
      motif: "Renseignez un prix supérieur à zéro.",
      champ: "prix",
    };
  }

  if (p.name.length > MAX_TITLE_LENGTH) {
    return {
      publiable: false,
      motif:
        `Nom trop long (${p.name.length} caractères). ` +
        `Meta en accepte ${MAX_TITLE_LENGTH} au maximum.`,
      champ: "nom",
    };
  }

  // Dimensions inconnues : on laisse passer, avec une réserve affichée.
  //
  // Nul ne veut pas dire « trop petite » — c'est le cas de tous les produits
  // créés avant la colonne. Bloquer les rendrait tous impubliables du jour au
  // lendemain, ce qui serait faux pour la plupart. On préfère un avertissement
  // honnête et un rejet éventuel de Meta, remonté ensuite dans
  // `rejectionMessage`.
  const dimensionsInconnues =
    p.imageWidth === null || p.imageHeight === null;

  return {
    publiable: true,
    reserve: dimensionsInconnues
      ? `Taille de la photo non mesurée. Si elle fait moins de ` +
        `${MIN_IMAGE_SIDE} × ${MIN_IMAGE_SIDE} px, Meta la refusera.`
      : null,
  };
}

/** Vrai si l'article satisfait toutes les conditions connues. */
export function estPubliable(p: EligibilityInput): boolean {
  return eligibility(p).publiable;
}

// ───────────────────────────── état affiché dans la liste des produits

/**
 * Ce que la colonne « Meta » montre pour un article.
 *
 * Cette fonction vivait dans le JSX de la page, en cascade de `if`. Sortie
 * ici, elle devient testable — et c'est le genre de logique qui a besoin de
 * l'être : cinq états, dont un seul signale un vrai problème, et aucune
 * erreur ne se produit quand elle se trompe.
 */
export type EtatMetaCle =
  /** Envoyé ou en route vers Meta. */
  | "publie"
  /** Le marchand l'a publié, mais l'article ne remplit plus les conditions. */
  | "bloque"
  /** Meta l'a refusé. */
  | "rejete"
  /** Publiable, pas encore publié. */
  | "publiable"
  /** Ne remplit pas les conditions, et n'est pas publié. */
  | "impossible";

export type EtatMeta = {
  cle: EtatMetaCle;
  /** Texte du badge — court, il tient dans une colonne. */
  texte: string;
  /** Explication, en infobulle. Nulle quand il n'y a rien à dire. */
  detail: string | null;
  /**
   * L'article demande-t-il une action du marchand ?
   *
   * Seuls ces deux états méritent d'être poussés sous les yeux : les autres
   * sont des situations normales. Signaler tout, c'est ne rien signaler.
   */
  alerte: boolean;
};

/** État de synchronisation tel que stocké — miroir de l'enum Prisma. */
export type SyncStatut = "EN_ATTENTE" | "PUBLIE" | "REJETE" | "RETIRE";

export type ItemMeta = {
  published: boolean;
  syncStatus: SyncStatut;
  rejectionMessage: string;
} | null;

export function etatMeta(produit: EligibilityInput, item: ItemMeta): EtatMeta {
  const elig = eligibility(produit);
  const publie = item?.published === true;

  /*
   * L'ordre compte. « Bloqué » passe avant tout le reste : c'est le seul cas
   * où le marchand peut payer une publicité qui mène à une page vide, et il
   * ne produit aucune erreur nulle part.
   */
  if (publie && !elig.publiable) {
    return {
      cle: "bloque",
      texte: "Bloqué",
      detail: elig.publiable ? null : elig.motif,
      alerte: true,
    };
  }

  if (publie && item?.syncStatus === "REJETE") {
    return {
      cle: "rejete",
      texte: "Refusé par Meta",
      detail: item.rejectionMessage || "Motif non communiqué par Meta.",
      alerte: true,
    };
  }

  if (publie && item?.syncStatus === "PUBLIE") {
    return { cle: "publie", texte: "Publié", detail: null, alerte: false };
  }

  if (publie) {
    return {
      cle: "publie",
      texte: "En attente",
      detail: "Sera envoyé à la prochaine synchronisation.",
      alerte: false,
    };
  }

  if (elig.publiable) {
    return {
      cle: "publiable",
      texte: "Non publié",
      detail: elig.reserve,
      alerte: false,
    };
  }

  return {
    cle: "impossible",
    texte: "Non publiable",
    detail: elig.motif,
    alerte: false,
  };
}

/**
 * L'article peut-il être coché dans la liste ?
 *
 * Un article déjà publié reste sélectionnable même s'il est devenu inéligible :
 * sans cela, un article « Bloqué » ne pourrait plus être dépublié — le
 * marchand serait coincé avec une fiche qu'il ne peut plus retirer.
 */
export function estSelectionnable(produit: EligibilityInput, item: ItemMeta): boolean {
  return item?.published === true || eligibility(produit).publiable;
}
