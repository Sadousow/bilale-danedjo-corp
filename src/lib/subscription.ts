import "server-only";

import { cache } from "react";
import { notFound } from "next/navigation";

import { platformDb } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { db } from "@/lib/tenant-db";
import {
  addDays,
  checkQuota,
  effectiveStatus,
  hasFeature,
  isShopClosed,
  subscriptionNotice,
  TRIAL_DAYS,
  type PlanFeature,
  type PlanLimits,
  type QuotaCheck,
  type SubscriptionStatus,
} from "@/lib/plans";

export type TenantSubscription = {
  id: string;
  status: SubscriptionStatus;
  /** Statut enregistré en base, avant recalcul — utile en console. */
  storedStatus: SubscriptionStatus;
  currentPeriodEnd: Date;
  graceEndsAt: Date | null;
  plan: PlanLimits & {
    id: string;
    code: string;
    name: string;
    priceMonthly: number;
  };
  /** Baisse d'offre demandée, qui prendra effet à `currentPeriodEnd`. */
  pendingPlan: { id: string; name: string; priceMonthly: number } | null;
  notice: ReturnType<typeof subscriptionNotice>;
};

/** Plan de repli si aucun abonnement n'existe — tout est ouvert, rien n'est bloqué. */
const OPEN_PLAN: TenantSubscription["plan"] = {
  id: "",
  code: "aucun",
  name: "Sans abonnement",
  priceMonthly: 0,
  maxProducts: 0,
  maxUsers: 0,
  featureShop: true,
  featureInvoicing: true,
  featureDomain: true,
};

/**
 * Abonnement de la boutique courante.
 *
 * Une boutique sans abonnement (cas d'une base créée avant la phase 4) n'est
 * jamais bloquée : on préfère laisser passer que couper un service en cours.
 */
export const getTenantSubscription = cache(
  async (): Promise<TenantSubscription> => {
    const tenant = await requireTenant();

    const fallback = (): TenantSubscription => ({
      id: "",
      status: "ACTIF",
      storedStatus: "ACTIF",
      currentPeriodEnd: addDays(new Date(), 3650),
      graceEndsAt: null,
      plan: OPEN_PLAN,
      pendingPlan: null,
      notice: null,
    });

    try {
      const row = await platformDb.subscription.findUnique({
        where: { tenantId: tenant.id },
        include: { plan: true, pendingPlan: true },
      });

      if (!row) return fallback();

      const dates = {
        status: row.status as SubscriptionStatus,
        currentPeriodEnd: row.currentPeriodEnd,
        graceEndsAt: row.graceEndsAt,
      };

      return {
        id: row.id,
        status: effectiveStatus(dates),
        storedStatus: row.status as SubscriptionStatus,
        currentPeriodEnd: row.currentPeriodEnd,
        graceEndsAt: row.graceEndsAt,
        plan: {
          id: row.plan.id,
          code: row.plan.code,
          name: row.plan.name,
          priceMonthly: row.plan.priceMonthly,
          maxProducts: row.plan.maxProducts,
          maxUsers: row.plan.maxUsers,
          featureShop: row.plan.featureShop,
          featureInvoicing: row.plan.featureInvoicing,
          featureDomain: row.plan.featureDomain,
        },
        pendingPlan: row.pendingPlan
          ? {
              id: row.pendingPlan.id,
              name: row.pendingPlan.name,
              priceMonthly: row.pendingPlan.priceMonthly,
            }
          : null,
        notice: subscriptionNotice(dates),
      };
    } catch {
      return fallback();
    }
  }
);

/** Vrai si la vitrine publique doit être fermée aux visiteurs. */
export async function isPublicShopClosed(): Promise<boolean> {
  const subscription = await getTenantSubscription();
  return isShopClosed(subscription.status);
}

/** Vrai si l'offre en cours ouvre cette fonction. */
export async function tenantHasFeature(feature: PlanFeature): Promise<boolean> {
  const subscription = await getTenantSubscription();
  return hasFeature(subscription.plan, feature);
}

/**
 * Renvoie un 404 si l'offre ne comprend pas la fonction demandée.
 *
 * Réservé aux pages **publiques** — panier, tunnel de commande — où un
 * visiteur n'a rien à faire d'un discours commercial destiné au marchand.
 * Dans le back-office, on emploie `featureGate` pour expliquer.
 */
export async function requireFeature(feature: PlanFeature): Promise<void> {
  if (!(await tenantHasFeature(feature))) notFound();
}

export type FeatureGate =
  | { allowed: true }
  | {
      allowed: false;
      feature: PlanFeature;
      currentPlanName: string;
      /** L'offre la moins chère qui ouvre cette fonction, s'il en existe une. */
      upgrade: { name: string; priceMonthly: number } | null;
    };

/**
 * Le marchand a-t-il droit à cette fonction, et sinon, que doit-il prendre ?
 *
 * Renvoie l'offre la **moins chère** qui l'ouvre : proposer l'offre la plus
 * chère quand une intermédiaire suffit serait malhonnête, et se retournerait
 * contre nous le jour où le marchand s'en apercevrait.
 */
export async function featureGate(feature: PlanFeature): Promise<FeatureGate> {
  const subscription = await getTenantSubscription();

  if (hasFeature(subscription.plan, feature)) return { allowed: true };

  const column =
    feature === "shop"
      ? "featureShop"
      : feature === "invoicing"
        ? "featureInvoicing"
        : "featureDomain";

  let upgrade: { name: string; priceMonthly: number } | null = null;

  try {
    upgrade = await platformDb.plan.findFirst({
      where: { active: true, [column]: true },
      orderBy: { priceMonthly: "asc" },
      select: { name: true, priceMonthly: true },
    });
  } catch {
    // Sans catalogue lisible, l'écran renvoie simplement vers la page
    // Abonnement sans annoncer de prix.
    upgrade = null;
  }

  return {
    allowed: false,
    feature,
    currentPlanName: subscription.plan.name,
    upgrade,
  };
}

// ------------------------------------------------------------- quotas

/**
 * Quota de produits.
 *
 * On compte les produits **actifs**, comme pour les utilisateurs. Un produit
 * désactivé n'est plus vendable : le facturer contre le quota reviendrait à
 * bloquer un marchand qui range son ancien catalogue.
 *
 * En contrepartie, la réactivation repasse par ce contrôle — sans quoi
 * désactiver puis réactiver suffirait à dépasser la limite.
 */
export async function productQuota(): Promise<QuotaCheck> {
  const [subscription, prisma] = await Promise.all([
    getTenantSubscription(),
    db(),
  ]);
  const used = await prisma.product.count({ where: { active: true } });
  return checkQuota(used, subscription.plan.maxProducts, {
    singular: "produit",
    plural: "produits",
  });
}

export async function userQuota(): Promise<QuotaCheck> {
  const [subscription, prisma] = await Promise.all([
    getTenantSubscription(),
    db(),
  ]);
  const used = await prisma.user.count({ where: { active: true } });
  return checkQuota(used, subscription.plan.maxUsers, {
    singular: "utilisateur",
    plural: "utilisateurs",
  });
}

/** Durée d'essai accordée à une nouvelle boutique. */
export function trialEnd(from: Date = new Date()): Date {
  return addDays(from, TRIAL_DAYS);
}
