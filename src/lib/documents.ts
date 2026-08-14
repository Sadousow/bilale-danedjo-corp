/**
 * Helpers de facturation — purs, utilisables côté serveur comme client.
 * Tous les montants sont des entiers en GNF.
 */

export type DocumentType = "PROFORMA" | "FACTURE" | "BON_LIVRAISON";

export type DocumentStatus =
  | "BROUILLON"
  | "EMIS"
  | "ACCEPTE"
  | "REFUSE"
  | "CONVERTI"
  | "PAYE_PARTIEL"
  | "PAYE"
  | "LIVRE"
  | "ANNULE";

export const documentTypeLabels: Record<DocumentType, string> = {
  PROFORMA: "Facture proforma",
  FACTURE: "Facture",
  BON_LIVRAISON: "Bon de livraison",
};

export const documentTypeShort: Record<DocumentType, string> = {
  PROFORMA: "Proforma",
  FACTURE: "Facture",
  BON_LIVRAISON: "BL",
};

export const documentPrefix: Record<DocumentType, string> = {
  PROFORMA: "PRO",
  FACTURE: "FAC",
  BON_LIVRAISON: "BL",
};

export const documentStatusLabels: Record<DocumentStatus, string> = {
  BROUILLON: "Brouillon",
  EMIS: "Émis",
  ACCEPTE: "Accepté",
  REFUSE: "Refusé",
  CONVERTI: "Converti en facture",
  PAYE_PARTIEL: "Partiellement réglé",
  PAYE: "Réglé",
  LIVRE: "Livré",
  ANNULE: "Annulé",
};

export const documentStatusTone: Record<
  DocumentStatus,
  "slate" | "green" | "red" | "gold" | "blue"
> = {
  BROUILLON: "slate",
  EMIS: "blue",
  ACCEPTE: "green",
  REFUSE: "red",
  CONVERTI: "slate",
  PAYE_PARTIEL: "gold",
  PAYE: "green",
  LIVRE: "green",
  ANNULE: "red",
};

/** Référence lisible : FAC-2026-0001 */
export function documentReference(
  type: DocumentType,
  year: number,
  number: number
): string {
  return `${documentPrefix[type]}-${year}-${String(number).padStart(4, "0")}`;
}

export type LineInput = {
  unitPrice: number;
  quantity: number;
  discount?: number;
};

export function lineTotal(line: LineInput): number {
  const gross = Math.round(line.unitPrice || 0) * Math.round(line.quantity || 0);
  return Math.max(0, gross - Math.round(line.discount || 0));
}

export type TotalsInput = {
  lines: LineInput[];
  discount?: number;
  vatEnabled: boolean;
  vatRate: number;
};

export type Totals = {
  subtotal: number;
  discount: number;
  taxableBase: number;
  vatAmount: number;
  total: number;
};

export function computeTotals(input: TotalsInput): Totals {
  const subtotal = input.lines.reduce((acc, l) => acc + lineTotal(l), 0);
  const discount = Math.max(0, Math.min(Math.round(input.discount || 0), subtotal));
  const taxableBase = subtotal - discount;
  const rate = input.vatEnabled ? Math.max(0, Math.round(input.vatRate || 0)) : 0;
  const vatAmount = Math.round((taxableBase * rate) / 100);

  return {
    subtotal,
    discount,
    taxableBase,
    vatAmount,
    total: taxableBase + vatAmount,
  };
}

/** Transitions autorisées depuis un statut donné, selon le type de document. */
export function allowedTransitions(
  type: DocumentType,
  status: DocumentStatus
): DocumentStatus[] {
  if (status === "ANNULE" || status === "CONVERTI") return [];

  if (type === "PROFORMA") {
    switch (status) {
      case "BROUILLON":
        return ["EMIS", "ANNULE"];
      case "EMIS":
        return ["ACCEPTE", "REFUSE", "ANNULE"];
      case "ACCEPTE":
        return ["ANNULE"];
      case "REFUSE":
        return ["EMIS", "ANNULE"];
      default:
        return [];
    }
  }

  if (type === "FACTURE") {
    switch (status) {
      case "BROUILLON":
        return ["EMIS", "ANNULE"];
      case "EMIS":
      case "PAYE_PARTIEL":
        return ["ANNULE"];
      case "PAYE":
        return [];
      default:
        return [];
    }
  }

  // BON_LIVRAISON
  switch (status) {
    case "BROUILLON":
      return ["EMIS", "ANNULE"];
    case "EMIS":
      return ["LIVRE", "ANNULE"];
    default:
      return [];
  }
}

/** Un document en brouillon reste modifiable ; les autres sont figés. */
export function isEditable(status: DocumentStatus): boolean {
  return status === "BROUILLON";
}

/**
 * Montant restant dû sur une facture.
 * Les proformas et bons de livraison ne portent pas de solde.
 */
export function balanceDue(doc: {
  type: DocumentType;
  status: DocumentStatus;
  total: number;
  paidAmount: number;
}): number {
  if (doc.type !== "FACTURE" || doc.status === "ANNULE") return 0;
  return Math.max(0, doc.total - doc.paidAmount);
}

/** Montant en toutes lettres, pour le pied des factures. */
export function amountInWords(amount: number): string {
  const n = Math.round(Math.abs(amount));
  if (n === 0) return "zéro franc guinéen";

  const units = [
    "",
    "un",
    "deux",
    "trois",
    "quatre",
    "cinq",
    "six",
    "sept",
    "huit",
    "neuf",
    "dix",
    "onze",
    "douze",
    "treize",
    "quatorze",
    "quinze",
    "seize",
    "dix-sept",
    "dix-huit",
    "dix-neuf",
  ];
  const tens = [
    "",
    "",
    "vingt",
    "trente",
    "quarante",
    "cinquante",
    "soixante",
    "soixante",
    "quatre-vingt",
    "quatre-vingt",
  ];

  function under100(value: number, pluralize: boolean): string {
    if (value < 20) return units[value];
    const t = Math.floor(value / 10);
    const u = value % 10;
    if (t === 7 || t === 9) {
      const base = tens[t];
      const rest = units[10 + u];
      return u === 1 && t === 7 ? `${base} et onze` : `${base}-${rest}`;
    }
    if (u === 0) return t === 8 && pluralize ? "quatre-vingts" : tens[t];
    if (u === 1 && t !== 8) return `${tens[t]} et un`;
    return `${tens[t]}-${units[u]}`;
  }

  /**
   * `pluralize` vaut faux devant « mille », qui est un adjectif numéral :
   * on écrit « quatre-vingt mille » et « deux cent mille », sans s,
   * mais « deux cents millions » et « quatre-vingts francs », avec s.
   */
  function under1000(value: number, pluralize: boolean): string {
    const h = Math.floor(value / 100);
    const rest = value % 100;

    if (h === 0) return under100(rest, pluralize);
    if (h === 1) return rest === 0 ? "cent" : `cent ${under100(rest, pluralize)}`;

    const prefix = `${units[h]} cent`;
    if (rest === 0) return pluralize ? `${prefix}s` : prefix;
    return `${prefix} ${under100(rest, pluralize)}`;
  }

  const scales: [number, string, string][] = [
    [1_000_000_000, "milliard", "milliards"],
    [1_000_000, "million", "millions"],
  ];

  let remaining = n;
  const parts: string[] = [];
  let endsOnNoun = false; // vrai si le montant se termine par million(s)/milliard(s)

  for (const [value, singular, plural] of scales) {
    const count = Math.floor(remaining / value);
    if (count > 0) {
      parts.push(`${under1000(count, true)} ${count > 1 ? plural : singular}`);
      remaining %= value;
      endsOnNoun = remaining === 0;
    }
  }

  const thousands = Math.floor(remaining / 1000);
  if (thousands > 0) {
    parts.push(thousands === 1 ? "mille" : `${under1000(thousands, false)} mille`);
    remaining %= 1000;
    endsOnNoun = false;
  }

  if (remaining > 0) {
    parts.push(under1000(remaining, true));
    endsOnNoun = false;
  }

  const words = parts.join(" ").trim();
  // « million » et « milliard » sont des noms : ils appellent « de francs ».
  const currency =
    n === 1 ? "franc guinéen" : endsOnNoun ? "de francs guinéens" : "francs guinéens";

  return `${words} ${currency}`;
}
