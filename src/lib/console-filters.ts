import type { SubscriptionStatus } from "@/lib/plans";

/**
 * Vocabulaire et tri de la console — sans base de données.
 *
 * Ce module est volontairement séparé de `platform-shops.ts` : la barre de
 * filtres est un composant client, et importer les libellés depuis un module
 * marqué `server-only` ferait remonter Prisma dans le paquet du navigateur.
 * Rien ici ne touche à la base, ce qui rend aussi le filtrage testable sans
 * serveur.
 */

export type ShopAlert =
  | "jamais-publiee"
  | "essai-bientot-fini"
  | "sans-vente"
  | "impaye";

export const alertLabels: Record<ShopAlert, string> = {
  "jamais-publiee": "Jamais publiée",
  "essai-bientot-fini": "Essai bientôt fini",
  "sans-vente": "Aucune vente récente",
  impaye: "Facture impayée",
};

export type ShopFilter =
  | "tout"
  | "essai"
  | "actif"
  | "impaye"
  | "suspendu"
  | "jamais-publiee"
  | "a-relancer";

export const filterLabels: Record<ShopFilter, string> = {
  tout: "Toutes",
  essai: "En essai",
  actif: "Actives",
  impaye: "Impayées",
  suspendu: "Suspendues",
  "jamais-publiee": "Jamais publiées",
  "a-relancer": "À relancer",
};

export function parseFilter(value: string | undefined): ShopFilter {
  return value && value in filterLabels ? (value as ShopFilter) : "tout";
}

/** Une boutique telle que la console la manipule. */
export type ShopRow = {
  id: string;
  slug: string;
  name: string;
  /** Statut administratif posé à la main par la plateforme. */
  tenantStatus: string;
  createdAt: Date;
  host: string | null;
  published: boolean;
  contact: { phone: string; email: string };
  subscription: {
    status: SubscriptionStatus;
    planName: string;
    priceMonthly: number;
    currentPeriodEnd: Date;
    daysLeft: number;
  } | null;
  counts: { users: number; products: number; orders: number; sales: number };
  lastActivity: Date | null;
  unpaid: number;
  alerts: ShopAlert[];
};

/**
 * Filtrage et recherche en mémoire.
 *
 * Volontairement pas en base : la liste tient de toute façon en mémoire pour
 * calculer les alertes, et un `where` dupliquerait la logique des alertes en
 * SQL — deux définitions de « à relancer » finissent toujours par diverger.
 */
export function filterShops(
  shops: ShopRow[],
  { q, filter }: { q?: string; filter?: ShopFilter }
): ShopRow[] {
  let rows = shops;

  switch (filter) {
    case "essai":
      rows = rows.filter((s) => s.subscription?.status === "ESSAI");
      break;
    case "actif":
      rows = rows.filter((s) => s.subscription?.status === "ACTIF");
      break;
    case "impaye":
      rows = rows.filter((s) => s.subscription?.status === "IMPAYE");
      break;
    case "suspendu":
      // Suspension administrative ou fermeture pour non-paiement : de la
      // console, ce sont deux façons d'être fermé et on veut les deux.
      rows = rows.filter(
        (s) =>
          s.tenantStatus === "SUSPENDU" || s.subscription?.status === "SUSPENDU"
      );
      break;
    case "jamais-publiee":
      rows = rows.filter((s) => !s.published);
      break;
    case "a-relancer":
      rows = rows.filter((s) => s.alerts.length > 0);
      break;
    default:
      break;
  }

  const needle = q?.trim().toLowerCase();
  if (needle) {
    rows = rows.filter(
      (s) =>
        s.name.toLowerCase().includes(needle) ||
        s.slug.toLowerCase().includes(needle) ||
        (s.host?.toLowerCase().includes(needle) ?? false) ||
        s.contact.phone.includes(needle) ||
        s.contact.email.toLowerCase().includes(needle)
    );
  }

  return rows;
}

/** Compte les boutiques par filtre, pour les pastilles de la barre. */
export function countByFilter(
  shops: ShopRow[]
): Partial<Record<ShopFilter, number>> {
  const counts: Partial<Record<ShopFilter, number>> = {};
  for (const filter of Object.keys(filterLabels) as ShopFilter[]) {
    counts[filter] = filterShops(shops, { filter }).length;
  }
  return counts;
}
