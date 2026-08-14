/** Helpers de commande en ligne — purs, utilisables côté serveur comme client. */

export type OrderStatus =
  | "RECUE"
  | "CONFIRMEE"
  | "PREPAREE"
  | "EXPEDIEE"
  | "LIVREE"
  | "ANNULEE";

export type OrderPaymentMethod = "A_LA_LIVRAISON" | "EN_LIGNE";

export type OrderPaymentStatus =
  | "EN_ATTENTE"
  | "PAYEE"
  | "ECHOUEE"
  | "REMBOURSEE";

export const orderStatusLabels: Record<OrderStatus, string> = {
  RECUE: "Reçue",
  CONFIRMEE: "Confirmée",
  PREPAREE: "Préparée",
  EXPEDIEE: "En livraison",
  LIVREE: "Livrée",
  ANNULEE: "Annulée",
};

/** Formulation orientée client, affichée sur le site. */
export const orderStatusPublic: Record<OrderStatus, string> = {
  RECUE: "Commande reçue — en attente de confirmation",
  CONFIRMEE: "Commande confirmée — préparation en cours",
  PREPAREE: "Commande prête — livraison imminente",
  EXPEDIEE: "En cours de livraison",
  LIVREE: "Livrée",
  ANNULEE: "Annulée",
};

export const orderStatusTone: Record<
  OrderStatus,
  "slate" | "green" | "red" | "gold" | "blue"
> = {
  RECUE: "gold",
  CONFIRMEE: "blue",
  PREPAREE: "blue",
  EXPEDIEE: "blue",
  LIVREE: "green",
  ANNULEE: "red",
};

export const orderPaymentMethodLabels: Record<OrderPaymentMethod, string> = {
  A_LA_LIVRAISON: "Paiement à la livraison",
  EN_LIGNE: "Paiement en ligne",
};

export const orderPaymentStatusLabels: Record<OrderPaymentStatus, string> = {
  EN_ATTENTE: "En attente",
  PAYEE: "Payée",
  ECHOUEE: "Échouée",
  REMBOURSEE: "Remboursée",
};

/** Étapes affichées au client, dans l'ordre. */
export const orderTimeline: OrderStatus[] = [
  "RECUE",
  "CONFIRMEE",
  "PREPAREE",
  "EXPEDIEE",
  "LIVREE",
];

export function allowedOrderTransitions(status: OrderStatus): OrderStatus[] {
  switch (status) {
    case "RECUE":
      return ["CONFIRMEE", "ANNULEE"];
    case "CONFIRMEE":
      return ["PREPAREE", "ANNULEE"];
    case "PREPAREE":
      return ["EXPEDIEE", "ANNULEE"];
    case "EXPEDIEE":
      return ["LIVREE", "ANNULEE"];
    case "LIVREE":
      return ["ANNULEE"];
    default:
      return [];
  }
}

export function orderReference(year: number, number: number): string {
  return `CMD-${year}-${String(number).padStart(4, "0")}`;
}

/**
 * Frais de livraison pour une zone donnée.
 * `freeAbove` à 0 signifie « jamais offert ».
 */
export function deliveryFeeFor(
  zone: { fee: number; freeAbove: number } | null | undefined,
  subtotal: number
): number {
  if (!zone) return 0;
  if (zone.freeAbove > 0 && subtotal >= zone.freeAbove) return 0;
  return Math.max(0, zone.fee);
}

/**
 * Normalise un numéro guinéen au format international attendu par Djomy.
 * Exemples acceptés : 624390332, 0624390332, +224624390332, 00224624390332
 */
export function normalizePhone(raw: string, countryCode = "224"): string | null {
  const digits = (raw || "").replace(/[^\d]/g, "");
  if (!digits) return null;

  let national = digits;
  if (national.startsWith(`00${countryCode}`)) {
    national = national.slice(2 + countryCode.length);
  } else if (national.startsWith(countryCode) && national.length > 9) {
    national = national.slice(countryCode.length);
  } else if (national.startsWith("0")) {
    national = national.slice(1);
  }

  if (national.length < 8 || national.length > 12) return null;
  return `00${countryCode}${national}`;
}

/** Affichage lisible : +224 624 39 03 32 */
export function displayPhone(raw: string): string {
  const normalized = normalizePhone(raw);
  if (!normalized) return raw;

  const national = normalized.slice(5);
  // Format guinéen usuel : 3 chiffres puis groupes de 2.
  const groups =
    national.length === 9
      ? [national.slice(0, 3), ...(national.slice(3).match(/\d{2}/g) ?? [])]
      : (national.match(/\d{1,3}/g) ?? [national]);

  return `+224 ${groups.join(" ")}`;
}
