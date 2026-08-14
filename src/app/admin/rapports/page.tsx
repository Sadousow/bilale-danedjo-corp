import { db, currentTenantId } from "@/lib/tenant-db";
import { requireRole } from "@/lib/auth";
import { formatPrice, formatDate, paymentMethodLabels } from "@/lib/format";
import { Card, PageTitle, StatCard, EmptyState } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ du?: string; au?: string }> };

function defaultRange() {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 29);
  from.setHours(0, 0, 0, 0);
  return { from, to };
}

function iso(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default async function ReportsPage({ searchParams }: Props) {
  const prisma = await db();
  await requireRole("GERANT");
  const { du, au } = await searchParams;

  const tenantId = await currentTenantId();
  const range = defaultRange();
  const from = du ? new Date(`${du}T00:00:00`) : range.from;
  const to = au ? new Date(`${au}T23:59:59`) : range.to;

  const where = {
    status: "COMPLETEE" as const,
    createdAt: { gte: from, lte: to },
  };

  const [totals, byMethod, byDay, topProducts, byUser, itemsAgg] =
    await Promise.all([
      prisma.sale.aggregate({
        where,
        _sum: { total: true, discount: true, due: true },
        _count: true,
      }),
      prisma.sale.groupBy({
        by: ["method"],
        where,
        _sum: { total: true },
        _count: true,
      }),
      prisma.$queryRaw<{ jour: Date; total: bigint; tickets: bigint }[]>`
        SELECT date_trunc('day', "createdAt") AS jour,
               SUM(total)::bigint AS total,
               COUNT(*)::bigint AS tickets
        FROM "Sale"
        WHERE "tenantId" = ${tenantId}
          AND status = 'COMPLETEE'
          AND "createdAt" >= ${from}
          AND "createdAt" <= ${to}
        GROUP BY 1
        ORDER BY 1 DESC
        LIMIT 31
      `,
      prisma.saleItem.groupBy({
        by: ["productId", "name"],
        where: { sale: where },
        _sum: { quantity: true, lineTotal: true },
        orderBy: { _sum: { lineTotal: "desc" } },
        take: 10,
      }),
      prisma.sale.groupBy({
        by: ["userId"],
        where,
        _sum: { total: true },
        _count: true,
      }),
      prisma.$queryRaw<{ marge: bigint | null }[]>`
        SELECT SUM((si."unitPrice" - si.cost) * si.quantity)::bigint AS marge
        FROM "SaleItem" si
        JOIN "Sale" s ON s.id = si."saleId"
        WHERE s."tenantId" = ${tenantId}
          AND s.status = 'COMPLETEE'
          AND s."createdAt" >= ${from}
          AND s."createdAt" <= ${to}
      `,
    ]);

  const users = await prisma.user.findMany({
    where: { id: { in: byUser.map((u) => u.userId) } },
    select: { id: true, name: true },
  });
  const userName = new Map<string, string>(
    users.map((u) => [u.id, u.name] as [string, string])
  );

  const revenue = totals._sum.total ?? 0;
  const margin = Number(itemsAgg[0]?.marge ?? 0);
  const maxDay = Math.max(1, ...byDay.map((d) => Number(d.total)));

  return (
    <>
      <PageTitle
        title="Rapports"
        description={`Du ${formatDate(from)} au ${formatDate(to)}`}
      />

      <Card className="p-4 mb-6">
        <form className="flex flex-col sm:flex-row gap-3 sm:items-end">
          <div>
            <label htmlFor="du" className="block text-xs text-slate-500 mb-1">
              Du
            </label>
            <input
              id="du"
              name="du"
              type="date"
              defaultValue={du ?? iso(from)}
              className="px-3 py-2 border border-slate-300 rounded-md text-sm"
            />
          </div>
          <div>
            <label htmlFor="au" className="block text-xs text-slate-500 mb-1">
              Au
            </label>
            <input
              id="au"
              name="au"
              type="date"
              defaultValue={au ?? iso(to)}
              className="px-3 py-2 border border-slate-300 rounded-md text-sm"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-slate-800 text-white rounded-md text-sm font-medium hover:bg-slate-700"
          >
            Appliquer
          </button>
        </form>
      </Card>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Chiffre d'affaires" value={formatPrice(revenue)} />
        <StatCard label="Marge brute" value={formatPrice(margin)} tone="success" />
        <StatCard label="Tickets" value={String(totals._count)} tone="gold" />
        <StatCard
          label="Panier moyen"
          value={formatPrice(totals._count ? revenue / totals._count : 0)}
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        <Card className="overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-800">Ventes par jour</h2>
          </div>
          {byDay.length === 0 ? (
            <EmptyState>Aucune vente sur la période.</EmptyState>
          ) : (
            <ul className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
              {byDay.map((d) => {
                const total = Number(d.total);
                return (
                  <li key={d.jour.toISOString()} className="px-5 py-3">
                    <div className="flex items-center justify-between text-sm mb-1.5">
                      <span className="text-slate-600">{formatDate(d.jour)}</span>
                      <span className="font-semibold text-slate-800">
                        {formatPrice(total)}
                      </span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-brand-blue rounded-full"
                        style={{ width: `${(total / maxDay) * 100}%` }}
                      />
                    </div>
                    <p className="mt-1 text-xs text-slate-400">
                      {Number(d.tickets)} ticket(s)
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <div className="space-y-6">
          <Card className="overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-800">Par mode de paiement</h2>
            </div>
            {byMethod.length === 0 ? (
              <EmptyState>Aucune donnée.</EmptyState>
            ) : (
              <ul className="divide-y divide-slate-100">
                {byMethod.map((m) => (
                  <li
                    key={m.method}
                    className="px-5 py-3 flex items-center justify-between text-sm"
                  >
                    <span className="text-slate-600">
                      {paymentMethodLabels[m.method]}
                      <span className="ml-2 text-xs text-slate-400">
                        {m._count} ticket(s)
                      </span>
                    </span>
                    <span className="font-semibold text-slate-800">
                      {formatPrice(m._sum.total ?? 0)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-800">Par caissier</h2>
            </div>
            {byUser.length === 0 ? (
              <EmptyState>Aucune donnée.</EmptyState>
            ) : (
              <ul className="divide-y divide-slate-100">
                {byUser.map((u) => (
                  <li
                    key={u.userId}
                    className="px-5 py-3 flex items-center justify-between text-sm"
                  >
                    <span className="text-slate-600">
                      {userName.get(u.userId) ?? "—"}
                      <span className="ml-2 text-xs text-slate-400">
                        {u._count} ticket(s)
                      </span>
                    </span>
                    <span className="font-semibold text-slate-800">
                      {formatPrice(u._sum.total ?? 0)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-800">
            Meilleures ventes de la période
          </h2>
        </div>
        {topProducts.length === 0 ? (
          <EmptyState>Aucune vente sur la période.</EmptyState>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
              <tr>
                <th className="text-left font-medium px-5 py-2.5">Produit</th>
                <th className="text-right font-medium px-5 py-2.5">Quantité</th>
                <th className="text-right font-medium px-5 py-2.5">
                  Chiffre d&apos;affaires
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {topProducts.map((p) => (
                <tr key={p.productId} className="hover:bg-slate-50">
                  <td className="px-5 py-3 text-slate-800">{p.name}</td>
                  <td className="px-5 py-3 text-right text-slate-500">
                    {p._sum.quantity ?? 0}
                  </td>
                  <td className="px-5 py-3 text-right font-semibold text-slate-800">
                    {formatPrice(p._sum.lineTotal ?? 0)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </>
  );
}
