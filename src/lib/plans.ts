/**
 * Règles d'abonnement — fonctions pures, testables sans base de données.
 */

export type SubscriptionStatus =
  | "ESSAI"
  | "ACTIF"
  | "IMPAYE"
  | "SUSPENDU"
  | "RESILIE";

export type PlanFeature = "shop" | "invoicing" | "domain";

/** Durée de l'essai offert à l'inscription. */
export const TRIAL_DAYS = 14;

/** Délai de grâce après une échéance impayée, avant fermeture de la vitrine. */
export const GRACE_DAYS = 7;

/** Nombre de jours avant l'échéance où la facture est émise. */
export const INVOICE_LEAD_DAYS = 3;

/** Durée d'une période d'abonnement, en jours. */
export const PERIOD_DAYS = 30;

export const subscriptionStatusLabels: Record<SubscriptionStatus, string> = {
  ESSAI: "Essai",
  ACTIF: "Actif",
  IMPAYE: "Impayé",
  SUSPENDU: "Suspendu",
  RESILIE: "Résilié",
};

export const featureLabels: Record<PlanFeature, string> = {
  shop: "Boutique en ligne",
  invoicing: "Facturation",
  domain: "Domaine personnalisé",
};

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function daysBetween(from: Date, to: Date): number {
  const ms = to.getTime() - from.getTime();
  return Math.ceil(ms / (24 * 60 * 60 * 1000));
}

export type SubscriptionDates = {
  status: SubscriptionStatus;
  currentPeriodEnd: Date;
  graceEndsAt: Date | null;
};

/**
 * Statut réellement applicable, calculé à partir des dates.
 *
 * On ne se repose pas sur la tâche planifiée pour fermer une boutique : si
 * elle ne tourne pas, le statut enregistré serait périmé et un marchand
 * continuerait d'utiliser un service qu'il ne paie plus. Le calcul à la
 * lecture fait autorité ; la tâche ne fait que persister le résultat.
 */
export function effectiveStatus(
  subscription: SubscriptionDates,
  now: Date = new Date()
): SubscriptionStatus {
  if (subscription.status === "RESILIE") return "RESILIE";

  // Période en cours : rien à signaler.
  if (now <= subscription.currentPeriodEnd) {
    return subscription.status === "ESSAI" ? "ESSAI" : "ACTIF";
  }

  const graceEnd =
    subscription.graceEndsAt ?? addDays(subscription.currentPeriodEnd, GRACE_DAYS);

  return now <= graceEnd ? "IMPAYE" : "SUSPENDU";
}

/**
 * Fin de période à retenir une fois une facture réglée.
 *
 * Une facture réglée en retard couvre une période **déjà écoulée**. La
 * reprendre telle quelle rendait le marchand échu à la seconde où il venait de
 * payer : il réglait un mois plein et n'achetait pas un seul jour de service.
 * On lui sert donc ses trente jours à partir du règlement.
 *
 * Payé à temps, rien ne change : la période facturée court encore, et c'est
 * elle qui fait foi — sans quoi payer trois jours en avance en ferait perdre
 * trois.
 */
export function renewedPeriodEnd(
  invoicePeriodEnd: Date,
  now: Date = new Date()
): Date {
  return invoicePeriodEnd > now ? invoicePeriodEnd : addDays(now, PERIOD_DAYS);
}

/**
 * Date à laquelle une baisse d'offre programmée prendra effet, ou `null` si
 * l'échéance est déjà passée.
 *
 * Dans ce dernier cas, le changement s'applique au prochain règlement : lui
 * annoncer une date au passé — « prend effet le 15/07 » alors qu'on est le 14
 * août — ne veut rien dire.
 */
export function pendingPlanEffectiveOn(
  currentPeriodEnd: Date,
  now: Date = new Date()
): Date | null {
  return currentPeriodEnd > now ? currentPeriodEnd : null;
}

/** La vitrine publique est-elle fermée aux visiteurs ? */
export function isShopClosed(status: SubscriptionStatus): boolean {
  return status === "SUSPENDU" || status === "RESILIE";
}

/** Le back-office reste accessible pour régulariser et exporter. */
export function isBackOfficeOpen(status: SubscriptionStatus): boolean {
  return status !== "RESILIE";
}

/** En-tête posé par le proxy : le chemin demandé, lisible depuis une mise en page. */
export const PATHNAME_HEADER = "x-chemin";

/**
 * Sections du back-office qui restent ouvertes quand la boutique est fermée
 * faute de paiement.
 *
 * Deux, et pas une de plus : **payer**, et **récupérer ses données**. Tout
 * fermer priverait le marchand du seul écran où il peut régulariser, ce qui
 * ne sert ni lui ni nous. Tout laisser ouvert reviendrait à offrir le service
 * impayé.
 *
 * La caisse, elle, n'est jamais coupée pour un impayé — c'est l'outil avec
 * lequel le marchand gagne de quoi payer.
 */
const OPEN_WHEN_UNPAID = ["/admin/abonnement", "/admin/rapports"];

export function isAdminPathOpenWhenUnpaid(pathname: string): boolean {
  return OPEN_WHEN_UNPAID.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );
}

export type PlanLimits = {
  maxProducts: number; // 0 = illimité
  maxUsers: number;
  featureShop: boolean;
  featureInvoicing: boolean;
  featureDomain: boolean;
};

/**
 * Ce que chaque fonction apporte, dit au marchand.
 *
 * Ces textes s'affichent au moment précis où quelqu'un découvre qu'une
 * section lui est fermée — donc au moment où il est le plus disposé à payer.
 * Ils décrivent le bénéfice, pas la fonctionnalité.
 */
export const featureDetails: Record<
  PlanFeature,
  { title: string; benefits: string[] }
> = {
  shop: {
    title: "La boutique en ligne",
    benefits: [
      "Vos clients commandent depuis leur téléphone, jour et nuit",
      "Paiement à la livraison ou par Mobile Money",
      "Les commandes arrivent directement dans ce back-office",
    ],
  },
  invoicing: {
    title: "La facturation",
    benefits: [
      "Proformas, factures et bons de livraison numérotés",
      "NIF, RCCM et TVA conformes, prêts à imprimer",
      "Suivi des règlements et des soldes clients",
    ],
  },
  domain: {
    title: "Votre propre nom de domaine",
    benefits: [
      "Votre boutique sur votre adresse à vous",
      "Certificat de sécurité compris",
      "Une adresse qui vous appartient, même si vous changez d'outil",
    ],
  },
};

export function hasFeature(plan: PlanLimits, feature: PlanFeature): boolean {
  if (feature === "shop") return plan.featureShop;
  if (feature === "invoicing") return plan.featureInvoicing;
  return plan.featureDomain;
}

export type QuotaCheck = {
  allowed: boolean;
  used: number;
  limit: number; // 0 = illimité
  message?: string;
};

export function checkQuota(
  used: number,
  limit: number,
  labels: { singular: string; plural: string }
): QuotaCheck {
  if (limit <= 0) return { allowed: true, used, limit: 0 };

  if (used >= limit) {
    return {
      allowed: false,
      used,
      limit,
      message: `Votre offre est limitée à ${limit} ${labels.plural}. Changez d'offre pour en ajouter davantage.`,
    };
  }

  return { allowed: true, used, limit };
}

/** Message d'avertissement à afficher au marchand, ou null. */
export function subscriptionNotice(
  subscription: SubscriptionDates,
  now: Date = new Date()
): { tone: "info" | "warning" | "danger"; message: string } | null {
  const status = effectiveStatus(subscription, now);

  if (status === "SUSPENDU") {
    return {
      tone: "danger",
      message:
        "Votre boutique est fermée au public faute de paiement. Réglez votre abonnement pour la rouvrir — vos données sont intactes.",
    };
  }

  if (status === "IMPAYE") {
    const graceEnd =
      subscription.graceEndsAt ??
      addDays(subscription.currentPeriodEnd, GRACE_DAYS);
    const left = Math.max(0, daysBetween(now, graceEnd));
    return {
      tone: "danger",
      message:
        left <= 1
          ? "Votre abonnement est échu. Votre boutique sera fermée au public demain."
          : `Votre abonnement est échu. Il vous reste ${left} jours avant la fermeture de votre boutique.`,
    };
  }

  const left = daysBetween(now, subscription.currentPeriodEnd);

  if (status === "ESSAI") {
    if (left <= 0) return null; // couvert par les cas ci-dessus
    return {
      tone: left <= 3 ? "warning" : "info",
      message:
        left === 1
          ? "Dernier jour d'essai. Choisissez votre offre pour continuer."
          : `Il vous reste ${left} jours d'essai.`,
    };
  }

  if (status === "ACTIF" && left <= 3 && left > 0) {
    return {
      tone: "info",
      message:
        left === 1
          ? "Votre abonnement se renouvelle demain."
          : `Votre abonnement se renouvelle dans ${left} jours.`,
    };
  }

  return null;
}

/** Référence lisible d'une facture d'abonnement : ABO-2026-0001 */
export function subscriptionInvoiceReference(
  year: number,
  number: number
): string {
  return `ABO-${year}-${String(number).padStart(4, "0")}`;
}
