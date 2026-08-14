/** Formatage monétaire — Franc guinéen (GNF), sans décimales. */
export function formatGNF(amount: number): string {
  return new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 0,
  }).format(Math.round(amount || 0));
}

export function formatPrice(amount: number): string {
  return `${formatGNF(amount)} GNF`;
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export const paymentMethodLabels: Record<string, string> = {
  ESPECES: "Espèces",
  ORANGE_MONEY: "Orange Money",
  MTN_MOMO: "MTN MoMo",
  VIREMENT: "Virement",
  CREDIT: "Crédit",
};

export const movementTypeLabels: Record<string, string> = {
  ENTREE: "Entrée",
  SORTIE: "Sortie",
  VENTE: "Vente",
  AJUSTEMENT: "Ajustement",
  RETOUR: "Retour",
};

export const roleLabels: Record<string, string> = {
  ADMIN: "Administrateur",
  GERANT: "Gérant",
  CAISSIER: "Caissier",
};

/** Numéro de ticket lisible : T-000042 */
export function ticketNumber(n: number): string {
  return `T-${String(n).padStart(6, "0")}`;
}
