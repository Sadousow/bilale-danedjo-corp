import Link from "next/link";
import { AlertTriangle, ArrowRight } from "lucide-react";

import { db, currentTenantId } from "@/lib/tenant-db";
import { requireRole } from "@/lib/auth";
import { formatPrice, formatDateTime, ticketNumber } from "@/lib/format";
import { Card, PageTitle, StatCard, EmptyState, Badge } from "@/components/admin/ui";
import PublishBanner from "@/components/admin/PublishBanner";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfMonth() {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

export default async function AdminDashboard() {
  const prisma = await db();
  const session = await requireRole("GERANT");

  const tenantId = await currentTenantId();
  const today = startOfToday();
  const month = startOfMonth();

  const [
    todayAgg,
    monthAgg,
    todayCount,
    lowStock,
    creditTotal,
    recentSales,
    topProducts,
    pendingOrders,
  ] = await Promise.all([
    prisma.sale.aggregate({
      where: { status: "COMPLETEE", createdAt: { gte: today } },
      _sum: { total: true },
    }),
    prisma.sale.aggregate({
      where: { status: "COMPLETEE", createdAt: { gte: month } },
      _sum: { total: true },
    }),
    prisma.sale.count({
      where: { status: "COMPLETEE", createdAt: { gte: today } },
    }),
    prisma.$queryRaw<{ id: string; name: string; stock: number; minStock: number }[]>`
      SELECT id, name, stock, "minStock"
      FROM "Product"
      WHERE "tenantId" = ${tenantId} AND active = true AND stock <= "minStock"
      ORDER BY stock ASC
      LIMIT 8
    `,
    prisma.customer.aggregate({ _sum: { creditBalance: true } }),
    prisma.sale.findMany({
      where: { status: "COMPLETEE" },
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { user: { select: { name: true } }, customer: { select: { name: true } } },
    }),
    prisma.saleItem.groupBy({
      by: ["productId", "name"],
      where: { sale: { status: "COMPLETEE", createdAt: { gte: month } } },
      _sum: { quantity: true, lineTotal: true },
      orderBy: { _sum: { lineTotal: "desc" } },
      take: 5,
    }),
    prisma.order.count({ where: { status: "RECUE" } }),
  ]);

  // Tant que la vitrine n'est pas ouverte, les premiers pas passent avant
  // les chiffres — qui sont de toute façon à zéro.
  const settings = await getSettings();
  const productCount = await prisma.product.count();

  return (
    <>
      {!settings.shopPublished && session.role === "ADMIN" && (
        <PublishBanner
          productCount={productCount}
          hasLogo={Boolean(settings.logoUrl)}
        />
      )}

      <PageTitle
        title={`Bonjour, ${session.name.split(" ")[0]}`}
        description="Vue d'ensemble de l'activité"
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Chiffre d'affaires — aujourd'hui"
          value={formatPrice(todayAgg._sum.total ?? 0)}
          hint={`${todayCount} vente${todayCount > 1 ? "s" : ""}`}
        />
        <StatCard
          label="Chiffre d'affaires — ce mois"
          value={formatPrice(monthAgg._sum.total ?? 0)}
          tone="gold"
        />
        <StatCard
          label="Crédits clients en cours"
          value={formatPrice(creditTotal._sum.creditBalance ?? 0)}
          tone={creditTotal._sum.creditBalance ? "danger" : "success"}
          hint="Montant total dû par les clients"
        />
        <StatCard
          label="Alertes de stock"
          value={String(lowStock.length)}
          tone={lowStock.length ? "danger" : "success"}
          hint="Produits au seuil ou en rupture"
        />
      </div>

      {pendingOrders > 0 && (
        <Card className="mb-8 border-amber-200 bg-amber-50 p-5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-amber-900">
            <span className="font-semibold">
              {pendingOrders} commande(s) en ligne
            </span>{" "}
            attendent d&apos;être confirmées.
          </p>
          <Link
            href="/admin/commandes?statut=RECUE"
            className="inline-flex items-center gap-1 text-sm font-medium text-amber-900 hover:underline"
          >
            Les traiter <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </Card>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-semibold text-slate-800">Dernières ventes</h2>
            <Link
              href="/admin/ventes"
              className="text-sm text-brand-blue hover:underline inline-flex items-center gap-1"
            >
              Tout voir <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {recentSales.length === 0 ? (
            <EmptyState>Aucune vente enregistrée pour l&apos;instant.</EmptyState>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                  <tr>
                    <th className="text-left font-medium px-5 py-2.5">Ticket</th>
                    <th className="text-left font-medium px-5 py-2.5">Date</th>
                    <th className="text-left font-medium px-5 py-2.5">Caissier</th>
                    <th className="text-right font-medium px-5 py-2.5">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentSales.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50">
                      <td className="px-5 py-3">
                        <Link
                          href={`/admin/ventes/${s.id}`}
                          className="font-medium text-brand-blue hover:underline"
                        >
                          {ticketNumber(s.number)}
                        </Link>
                        {s.customer && (
                          <span className="ml-2 text-xs text-slate-400">
                            {s.customer.name}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-slate-500">
                        {formatDateTime(s.createdAt)}
                      </td>
                      <td className="px-5 py-3 text-slate-500">{s.user.name}</td>
                      <td className="px-5 py-3 text-right font-semibold text-slate-800">
                        {formatPrice(s.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <div className="space-y-6">
          <Card className="overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <h2 className="font-semibold text-slate-800">Stock à surveiller</h2>
            </div>
            {lowStock.length === 0 ? (
              <EmptyState>Tous les stocks sont au-dessus du seuil.</EmptyState>
            ) : (
              <ul className="divide-y divide-slate-100">
                {lowStock.map((p) => (
                  <li
                    key={p.id}
                    className="px-5 py-3 flex items-center justify-between gap-3"
                  >
                    <span className="text-sm text-slate-700 truncate">{p.name}</span>
                    <Badge tone={p.stock === 0 ? "red" : "gold"}>
                      {p.stock === 0 ? "Rupture" : `${p.stock} restant`}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-800">Top ventes du mois</h2>
            </div>
            {topProducts.length === 0 ? (
              <EmptyState>Pas encore de données.</EmptyState>
            ) : (
              <ul className="divide-y divide-slate-100">
                {topProducts.map((p) => (
                  <li key={p.productId} className="px-5 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm text-slate-700 truncate">{p.name}</span>
                      <span className="text-sm font-semibold text-slate-800 shrink-0">
                        {formatPrice(p._sum.lineTotal ?? 0)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">
                      {p._sum.quantity ?? 0} unité(s) vendues
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
