import "server-only";

import { platformDb } from "@/lib/db";
import {
  daysBetween,
  effectiveStatus,
  type SubscriptionStatus,
} from "@/lib/plans";
import type { ShopAlert, ShopRow } from "@/lib/console-filters";

/**
 * Vue « plateforme » des boutiques, pour la console.
 *
 * Le point de cette couche est d'éviter le N+1 : la liste affiche l'activité
 * de chaque marchand, et interroger les ventes boutique par boutique ferait
 * une centaine de requêtes pour une page. Tout est agrégé en quelques
 * requêtes, puis recousu en mémoire.
 */

/** Jours sans aucune vente au-delà desquels un marchand mérite un appel. */
const SILENT_DAYS = 10;
/** Un essai qui se termine dans moins de ça est une relance à faire. */
const TRIAL_WARNING_DAYS = 7;

export async function listShops(now: Date = new Date()): Promise<ShopRow[]> {
  const [tenants, lastSales, lastOrders, unpaidInvoices] = await Promise.all([
    platformDb.tenant.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { users: true, products: true, orders: true, sales: true },
        },
        domains: {
          where: { verified: true },
          orderBy: { isPrimary: "desc" },
          select: { host: true },
        },
        settings: {
          select: {
            shopPublished: true,
            companyPhone: true,
            companyEmail: true,
          },
        },
        subscription: {
          select: {
            status: true,
            currentPeriodEnd: true,
            graceEndsAt: true,
            plan: { select: { name: true, priceMonthly: true } },
          },
        },
      },
    }),
    platformDb.sale.groupBy({
      by: ["tenantId"],
      _max: { createdAt: true },
    }),
    platformDb.order.groupBy({
      by: ["tenantId"],
      _max: { createdAt: true },
    }),
    platformDb.subscriptionInvoice.findMany({
      where: { status: { in: ["EN_ATTENTE", "ECHOUEE"] } },
      select: { subscription: { select: { tenantId: true } } },
    }),
  ]);

  const saleAt = new Map(lastSales.map((r) => [r.tenantId, r._max.createdAt]));
  const orderAt = new Map(lastOrders.map((r) => [r.tenantId, r._max.createdAt]));

  const unpaidCount = new Map<string, number>();
  for (const invoice of unpaidInvoices) {
    const id = invoice.subscription.tenantId;
    unpaidCount.set(id, (unpaidCount.get(id) ?? 0) + 1);
  }

  return tenants.map((tenant) => {
    const sub = tenant.subscription;
    const status = sub
      ? effectiveStatus(
          {
            status: sub.status as SubscriptionStatus,
            currentPeriodEnd: sub.currentPeriodEnd,
            graceEndsAt: sub.graceEndsAt,
          },
          now
        )
      : null;

    // La dernière trace d'activité, quelle qu'en soit l'origine : une
    // boutique peut ne vendre qu'en caisse, ou ne vendre qu'en ligne.
    const dates = [saleAt.get(tenant.id), orderAt.get(tenant.id)].filter(
      (d): d is Date => d instanceof Date
    );
    const lastActivity = dates.length
      ? new Date(Math.max(...dates.map((d) => d.getTime())))
      : null;

    const published = tenant.settings?.shopPublished ?? false;
    const unpaid = unpaidCount.get(tenant.id) ?? 0;

    const alerts: ShopAlert[] = [];
    if (!published) alerts.push("jamais-publiee");
    if (
      status === "ESSAI" &&
      sub &&
      daysBetween(now, sub.currentPeriodEnd) <= TRIAL_WARNING_DAYS
    ) {
      alerts.push("essai-bientot-fini");
    }
    /*
     * « Sans vente » ne s'applique qu'aux boutiques déjà installées : une
     * boutique créée hier n'a normalement rien vendu, et la signaler noierait
     * les vraies alertes. Le repère est la date de création si aucune vente
     * n'a jamais eu lieu.
     */
    const since = lastActivity ?? tenant.createdAt;
    if (daysBetween(since, now) >= SILENT_DAYS && status !== "RESILIE") {
      alerts.push("sans-vente");
    }
    if (unpaid > 0) alerts.push("impaye");

    return {
      id: tenant.id,
      slug: tenant.slug,
      name: tenant.name,
      tenantStatus: tenant.status,
      createdAt: tenant.createdAt,
      host: tenant.domains[0]?.host ?? null,
      published,
      contact: {
        phone: tenant.settings?.companyPhone ?? "",
        email: tenant.settings?.companyEmail ?? "",
      },
      subscription: sub
        ? {
            status: status!,
            planName: sub.plan.name,
            priceMonthly: sub.plan.priceMonthly,
            currentPeriodEnd: sub.currentPeriodEnd,
            daysLeft: daysBetween(now, sub.currentPeriodEnd),
          }
        : null,
      counts: {
        users: tenant._count.users,
        products: tenant._count.products,
        orders: tenant._count.orders,
        sales: tenant._count.sales,
      },
      lastActivity,
      unpaid,
      alerts,
    };
  });
}

export async function getShopDetail(id: string) {
  const tenant = await platformDb.tenant.findUnique({
    where: { id },
    include: {
      domains: { orderBy: { isPrimary: "desc" } },
      settings: true,
      users: {
        orderBy: [{ role: "asc" }, { createdAt: "asc" }],
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          active: true,
          createdAt: true,
        },
      },
      subscription: {
        include: {
          plan: true,
          invoices: { orderBy: { createdAt: "desc" }, take: 12 },
        },
      },
      _count: {
        select: {
          users: true,
          products: true,
          orders: true,
          sales: true,
          customers: true,
        },
      },
    },
  });

  if (!tenant) return null;

  const [sales, lastSale, lastOrder] = await Promise.all([
    platformDb.sale.aggregate({
      where: { tenantId: id, status: "COMPLETEE" },
      _sum: { total: true },
      _count: true,
    }),
    platformDb.sale.findFirst({
      where: { tenantId: id },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
    platformDb.order.findFirst({
      where: { tenantId: id },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
  ]);

  const dates = [lastSale?.createdAt, lastOrder?.createdAt].filter(
    (d): d is Date => d instanceof Date
  );

  return {
    tenant,
    revenue: sales._sum.total ?? 0,
    salesCount: sales._count,
    lastActivity: dates.length
      ? new Date(Math.max(...dates.map((d) => d.getTime())))
      : null,
  };
}

export type ShopDetail = NonNullable<Awaited<ReturnType<typeof getShopDetail>>>;
