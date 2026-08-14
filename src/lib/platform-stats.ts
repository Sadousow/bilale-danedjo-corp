import "server-only";

import { platformDb } from "@/lib/db";
import { effectiveStatus, type SubscriptionStatus } from "@/lib/plans";

/**
 * Chiffres de la plateforme, pour la console.
 *
 * Tout est calculé à la lecture plutôt que stocké : à l'échelle de quelques
 * centaines de boutiques, une requête coûte moins qu'un compteur à maintenir
 * juste — et un compteur faux est pire que pas de compteur.
 */

export type PlatformStats = {
  /** Recette mensuelle récurrente : somme des offres réellement facturées. */
  mrr: number;
  /** Ce que rapporteraient les essais s'ils se convertissaient tous. */
  trialPotential: number;
  byStatus: Record<SubscriptionStatus, number>;
  totalShops: number;
  /** Boutiques créées mais jamais ouvertes au public. */
  neverPublished: number;
  /** Essais qui se terminent dans les sept jours. */
  trialsEndingSoon: number;
  unpaidInvoices: { count: number; amount: number };
  signupsThisMonth: number;
};

const EMPTY: PlatformStats = {
  mrr: 0,
  trialPotential: 0,
  byStatus: { ESSAI: 0, ACTIF: 0, IMPAYE: 0, SUSPENDU: 0, RESILIE: 0 },
  totalShops: 0,
  neverPublished: 0,
  trialsEndingSoon: 0,
  unpaidInvoices: { count: 0, amount: 0 },
  signupsThisMonth: 0,
};

export async function getPlatformStats(): Promise<PlatformStats> {
  try {
    const now = new Date();
    const weekAhead = new Date(now.getTime() + 7 * 86400_000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [subscriptions, unpaid, unpublished, signups] = await Promise.all([
      platformDb.subscription.findMany({
        select: {
          status: true,
          currentPeriodEnd: true,
          graceEndsAt: true,
          plan: { select: { priceMonthly: true } },
        },
      }),
      platformDb.subscriptionInvoice.aggregate({
        where: { status: { in: ["EN_ATTENTE", "ECHOUEE"] } },
        _count: true,
        _sum: { amount: true },
      }),
      platformDb.settings.count({ where: { shopPublished: false } }),
      platformDb.tenant.count({ where: { createdAt: { gte: monthStart } } }),
    ]);

    const stats: PlatformStats = {
      ...EMPTY,
      byStatus: { ESSAI: 0, ACTIF: 0, IMPAYE: 0, SUSPENDU: 0, RESILIE: 0 },
      totalShops: subscriptions.length,
      neverPublished: unpublished,
      signupsThisMonth: signups,
      unpaidInvoices: {
        count: unpaid._count ?? 0,
        amount: unpaid._sum?.amount ?? 0,
      },
    };

    for (const s of subscriptions) {
      // Le statut est recalculé, jamais lu tel quel : la passe de facturation
      // peut ne pas être passée depuis hier.
      const status = effectiveStatus(
        {
          status: s.status as SubscriptionStatus,
          currentPeriodEnd: s.currentPeriodEnd,
          graceEndsAt: s.graceEndsAt,
        },
        now
      );

      stats.byStatus[status] += 1;

      const price = s.plan?.priceMonthly ?? 0;

      /*
       * La recette récurrente ne compte que les abonnements réellement
       * payants. Un essai n'a rien rapporté, un impayé n'a rien rapporté non
       * plus — les inclure donnerait un chiffre flatteur et faux, et c'est
       * exactement le genre de chiffre sur lequel on prend de mauvaises
       * décisions.
       */
      if (status === "ACTIF") stats.mrr += price;
      if (status === "ESSAI") {
        stats.trialPotential += price;
        if (s.currentPeriodEnd <= weekAhead) stats.trialsEndingSoon += 1;
      }
    }

    return stats;
  } catch (error) {
    console.error("[console] statistiques :", error);
    return EMPTY;
  }
}
